import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditLanguage } from './check-language.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { violations } = auditLanguage(root);
if (violations.length) throw new Error(`Fix language violations before delivery:\n${violations.join('\n')}`);
// An explicit allowlist keeps local secrets, installed libraries, backups and reports out.
const entries = [
  'src', 'public', 'scripts', 'tests', 'licenses', 'docs', 'index.html',
  'package.json', 'package-lock.json', '.gitignore',
  '.env.example', '.env.development', '.env.production', 'assignment.pdf',
  ...fs.readdirSync(root).filter(name => name.endsWith('.md') || name.endsWith('.config.js')),
];
const outputRoot = path.join(root, 'delivery');
fs.mkdirSync(outputRoot, { recursive: true });
// Never overwrite a previous delivery or delete any user files.
const destination = fs.mkdtempSync(path.join(outputRoot, 'cms-dashboard-'));
for (const name of entries) fs.cpSync(path.join(root, name), path.join(destination, name), { recursive: true });
const result = auditLanguage(destination);
if (result.violations.length) throw new Error(result.violations.join('\n'));
console.log(`Source delivery ready: ${destination}\nIncludes package-lock.json for npm ci; excludes node_modules, dist, caches and archives.`);
