#!/usr/bin/env node

/**
 * Build script for existdb-language-support XAR package.
 * Zips all project files into a .xar archive.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const xml = fs.readFileSync('expath-pkg.xml', 'utf-8');
const versionMatch = xml.match(/<package[^>]+version="([^"]+)"/);
const version = versionMatch ? versionMatch[1] : '1.0.0';
const outputDir = 'build';
const outputFile = path.join(outputDir, `language-support-${version}.xar`);

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
}

const files = [
    'expath-pkg.xml',
    'repo.xml',
    'controller.xq',
    'modules/api.json',
    'modules/api/router.xq',
    'modules/api/lsp.xqm'
];

// Verify all files exist
for (const file of files) {
    if (!fs.existsSync(file)) {
        console.error(`Missing file: ${file}`);
        process.exit(1);
    }
}

// Use zip to create the XAR (which is just a zip file)
execSync(`zip -9 "${outputFile}" ${files.join(' ')}`, { stdio: 'inherit' });

console.log(`\nBuilt: ${outputFile}`);
