# existdb-language-support

An eXist-db XAR package that wraps the `lsp:*` Java functions as a REST API, providing language support services for XQuery development tools such as [existdb-langserver](https://github.com/wolfgangmm/existdb-langserver) (VS Code) and [eXide](https://github.com/eXist-db/eXide).

## Endpoints

All endpoints accept POST with a JSON body and return JSON.

| Endpoint | Request body | Description |
|----------|-------------|-------------|
| `/api/diagnostics` | `{query, base}` | Multi-error diagnostics |
| `/api/symbols` | `{query, base}` | Document symbols (functions, variables) |
| `/api/completions` | `{query, base, prefix?}` | Function/variable completions |
| `/api/hover` | `{query, line, column, base}` | Hover info at position |
| `/api/definition` | `{query, line, column, base}` | Go-to-definition at position |

Line and column values in request and response are **1-indexed** (eXist-db convention).

## Requirements

- eXist-db 7.0+ with `lsp:*` module ([eXist-db/exist#6130](https://github.com/eXist-db/exist/pull/6130))
- [Roaster](https://github.com/eeditiones/roaster) installed on the eXist-db instance

## Build

```bash
npm run build
```

Produces `build/language-support-1.0.0.xar`.

## Install

Using [xst](https://github.com/eXist-db/xst):

```bash
xst package install local build/language-support-1.0.0.xar --force
```

Requires a `.env` file or xst configuration with eXist-db connection details:

```env
EXISTDB_USER=admin
EXISTDB_PASS=
EXISTDB_SERVER=http://localhost:8080
```

## Test with curl

```bash
# Diagnostics (valid query returns empty array)
curl -s -X POST -H "Content-Type: application/json" -u admin: \
  -d '{"query":"1 + 1", "base":"/db"}' \
  http://localhost:8080/exist/apps/language-support/api/diagnostics

# Symbols
curl -s -X POST -H "Content-Type: application/json" -u admin: \
  -d '{"query":"declare function local:greet($name) { $name }; ()", "base":"/db"}' \
  http://localhost:8080/exist/apps/language-support/api/symbols

# Completions (with prefix filter)
curl -s -X POST -H "Content-Type: application/json" -u admin: \
  -d '{"query":"declare function local:greet($name) { $name }; ()", "base":"/db", "prefix":"local"}' \
  http://localhost:8080/exist/apps/language-support/api/completions
```

## License

[GPL-3.0-or-later](LICENSE)
