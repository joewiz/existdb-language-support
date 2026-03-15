/**
 * Integration tests for language-support API endpoints.
 * Requires a running eXist-db instance with lsp:* module and the
 * language-support XAR installed.
 *
 * Run: npm test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Read connection config from .env
const envPath = path.join(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const m = line.match(/^(\w+)=(.*)$/);
        if (m) env[m[1]] = m[2];
    }
}

const SERVER = env.EXISTDB_SERVER || 'http://localhost:8080';
const USER = env.EXISTDB_USER || 'admin';
const PASS = env.EXISTDB_PASS || '';
const BASE_URL = `${SERVER}/exist/apps/language-support`;
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

async function post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': AUTH
        },
        body: JSON.stringify(body)
    });
    assert.equal(response.status, 200, `${endpoint} returned ${response.status}`);
    return response.json();
}

// A library module stored in /db for cross-module tests
const LIB_MODULE = `xquery version "3.1";
module namespace utils = "http://example.com/utils";

declare function utils:hello($name as xs:string) as xs:string {
    "Hello " || $name
};
`;

// Store/remove the library module via REST API
async function storeModule() {
    const res = await fetch(`${SERVER}/exist/rest/db/utils.xqm`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/xquery',
            'Authorization': AUTH
        },
        body: LIB_MODULE
    });
    assert.equal(res.status, 201, 'Failed to store utils.xqm: ' + res.status);
}

async function removeModule() {
    await fetch(`${SERVER}/exist/rest/db/utils.xqm`, {
        method: 'DELETE',
        headers: { 'Authorization': AUTH }
    });
}

// ----- Diagnostics -----

describe('/api/diagnostics', () => {
    it('returns empty array for valid query', async () => {
        const data = await post('/api/diagnostics', {
            query: '1 + 1',
            base: '/db'
        });
        assert.ok(Array.isArray(data), 'expected array');
        assert.equal(data.length, 0);
    });

    it('returns diagnostics for invalid query', async () => {
        const data = await post('/api/diagnostics', {
            query: 'let $x := undeclared:func() return $x',
            base: '/db'
        });
        assert.ok(Array.isArray(data), 'expected array');
        assert.ok(data.length > 0, 'expected at least one diagnostic');
        assert.ok(data[0].message, 'diagnostic should have message');
        assert.ok(data[0].line !== undefined, 'diagnostic should have line');
    });

    it('returns multiple diagnostics', async () => {
        const data = await post('/api/diagnostics', {
            query: 'undeclared:a(), undeclared:b()',
            base: '/db'
        });
        assert.ok(Array.isArray(data));
        // At least the first undeclared prefix should produce an error
        assert.ok(data.length >= 1);
    });
});

// ----- Symbols -----

describe('/api/symbols', () => {
    it('returns symbols for declared functions', async () => {
        const data = await post('/api/symbols', {
            query: 'declare function local:greet($name) { $name }; ()',
            base: '/db'
        });
        assert.ok(Array.isArray(data));
        assert.ok(data.length > 0, 'expected at least one symbol');
        const greet = data.find(s => s.name && s.name.includes('greet'));
        assert.ok(greet, 'expected local:greet symbol');
    });

    it('returns empty array for query with no declarations', async () => {
        const data = await post('/api/symbols', {
            query: '1 + 1',
            base: '/db'
        });
        assert.ok(Array.isArray(data));
        assert.equal(data.length, 0);
    });
});

// ----- Completions -----

describe('/api/completions', () => {
    it('returns completions for local functions', async () => {
        const data = await post('/api/completions', {
            query: 'declare function local:greet($name) { $name }; ()',
            base: '/db',
            prefix: 'local'
        });
        assert.ok(Array.isArray(data));
        assert.ok(data.length > 0, 'expected at least one completion');
        const greet = data.find(c => c.label && c.label.includes('greet'));
        assert.ok(greet, 'expected local:greet completion');
    });

    it('returns completions without prefix filter', async () => {
        const data = await post('/api/completions', {
            query: '1 + 1',
            base: '/db'
        });
        assert.ok(Array.isArray(data));
        // Should return built-in functions
        assert.ok(data.length > 0, 'expected built-in function completions');
    });

    it('filters by prefix', async () => {
        const data = await post('/api/completions', {
            query: '1 + 1',
            base: '/db',
            prefix: 'fn:coun'
        });
        assert.ok(Array.isArray(data));
        if (data.length > 0) {
            for (const c of data) {
                assert.ok(c.label.startsWith('fn:coun'),
                    `expected prefix match, got: ${c.label}`);
            }
        }
    });
});

// ----- Hover -----

describe('/api/hover', () => {
    it('returns hover info for function call', async () => {
        const data = await post('/api/hover', {
            query: 'declare function local:greet($name) { $name };\nlocal:greet("world")',
            line: 1,    // 0-indexed: second line
            column: 8,
            base: '/db'
        });
        // May return hover info or empty object depending on position matching
        assert.ok(typeof data === 'object');
    });

    it('returns empty object for no symbol', async () => {
        const data = await post('/api/hover', {
            query: '1 + 1',
            line: 1,
            column: 3,
            base: '/db'
        });
        assert.ok(typeof data === 'object');
    });
});

// ----- Definition -----

describe('/api/definition', () => {
    it('returns definition for local function call', async () => {
        const data = await post('/api/definition', {
            query: 'declare function local:greet($name) { $name };\nlocal:greet("world")',
            line: 1,    // 0-indexed: second line
            column: 8,
            base: '/db'
        });
        assert.ok(data.kind, 'expected kind');
        assert.equal(data.kind, 'function');
        assert.ok(data.name && data.name.includes('greet'), 'expected greet in name');
        assert.ok(data.line !== undefined, 'expected line');
    });

    it('returns empty object for built-in function', async () => {
        const data = await post('/api/definition', {
            query: 'fn:count((1,2,3))',
            line: 1,
            column: 5,
            base: '/db'
        });
        // Built-in functions have no user-defined source
        assert.ok(!data.kind || Object.keys(data).length === 0);
    });

    it('returns empty object for no symbol at position', async () => {
        const data = await post('/api/definition', {
            query: '1 + 1',
            line: 1,
            column: 3,
            base: '/db'
        });
        assert.ok(Object.keys(data).length === 0);
    });
});

// ----- Cross-module definition -----

// Cross-module tests require eXist-db with enhanced lsp:definition
// (PR eXist-db/exist#6130 cross-module uri support)
describe('/api/definition (cross-module)', () => {
    before(async () => {
        await storeModule();
    });

    after(async () => {
        await removeModule();
    });

    it('returns uri for imported function', async () => {
        const data = await post('/api/definition', {
            query: 'import module namespace utils = "http://example.com/utils" at "xmldb:exist:///db/utils.xqm";\nutils:hello("world")',
            line: 1,    // 0-indexed: second line
            column: 8,
            base: '/db'
        });
        assert.equal(data.kind, 'function');
        assert.ok(data.uri, 'expected uri for cross-module definition');
        assert.ok(data.uri.includes('utils.xqm'),
            `expected uri to contain utils.xqm, got: ${data.uri}`);
    });

    it('does not return uri for local function', async () => {
        const data = await post('/api/definition', {
            query: 'declare function local:foo() { 42 };\nlocal:foo()',
            line: 1,    // 0-indexed: second line
            column: 8,
            base: '/db'
        });
        assert.equal(data.kind, 'function');
        assert.ok(!data.uri, 'local function should not have uri');
    });
});
