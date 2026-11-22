import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { auditLanguage, inspectJavaScript } from '../scripts/check-language.mjs';

const directories = [];
function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cineflow-language-'));
  directories.push(root);
  for (const [name, source] of Object.entries(files)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
  }
  return root;
}
afterEach(() => {
  for (const root of directories.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('Owned-code language guard', () => {
  it('allows JS/JSX, JSDoc, resource files and third-party declarations', () => {
    const root = fixture({
      'src/view.jsx':
        '/** @param {{name: string}} item */\nexport function View(item) { const meta = {type: "film", interface: true, enum: 1}; return <p>{item.name}{meta.type}</p>; }',
      'scripts/tool.cjs': 'module.exports = {value: 1};',
      'index.html': '<div></div>',
      'src/style.css': 'p {color: red}',
      'public/icon.svg': '<svg/>',
      'README.md': 'Python and TypeScript are not used.',
      '.env.example': 'VITE_USE_MOCK=true',
      'package.json': '{"scripts":{"build":"vite build"}}',
      'node_modules/library/index.d.ts': 'export interface A {}',
      'node_modules/library/package.json': '{"dependencies":{"typescript":"*"}}',
      'dist/legacy.ts': 'ignored generated output',
    });
    expect(auditLanguage(root).violations).toEqual([]);
  });
  it('reports every forbidden owned extension, including temporary historical copies', () => {
    const files = [
      'src/a.ts',
      'src/b.tsx',
      'tests/a.mts',
      'scripts/a.cts',
      'scripts/a.py',
      'src/a.php',
      'scripts/a.sh',
      'tmp/reference.tsx',
      'archive/old.zip',
    ];
    const root = fixture(Object.fromEntries(files.map((name) => [name, ''])));
    expect(auditLanguage(root).violations).toHaveLength(files.length);
    for (const name of files)
      expect(auditLanguage(root).violations.some((issue) => issue.startsWith(name + ':'))).toBe(
        true,
      );
  });
  it.each([
    'interface Employee {id: number}',
    'type Id = string;',
    'enum Role { Admin }',
    'const value: string = "x";',
    'const value = {} as const;',
    'const value = item!;',
    'import type {Item} from "./item.js";',
    '/* @flow */\nexport const value = 1;',
    'function name(item: string): string {return item}',
  ])('rejects non-JavaScript syntax or Flow in a JS file: %s', (source) => {
    expect(inspectJavaScript(source, 'src/bad.js').length).toBeGreaterThan(0);
  });
  it.each([
    'import ts from "typescript";',
    'export * from "./model.ts";',
    'const lib = require("ts-node/register");',
    'const view = import("./view.tsx");',
    'import "./model.mts?raw";',
    'import("type" + "script");',
    'import {spawn as run} from "node:child_process"; run("python3", ["tool.py"]);',
    'import cp from "node:child_process"; cp.execFile("py", ["tool.py"]);',
    'const config = {webServer: {command: "python -m http.server"}};',
    '#!/usr/bin/env python3\nprint("hello");',
  ])('rejects type imports and execution: %s', (source) => {
    expect(inspectJavaScript(source, 'scripts/bad.mjs').length).toBeGreaterThan(0);
  });
  it('rejects direct type dependencies and non-JS npm commands', () => {
    const root = fixture({
      'package.json': JSON.stringify({
        devDependencies: { typescript: '^5', '@types/react': '^19' },
        scripts: { old: 'python scripts/tool.py', compile: 'tsc', run: 'node scripts/tool.ts' },
      }),
    });
    expect(auditLanguage(root).violations).toHaveLength(5);
  });
  it('CLI fails on violations without modifying files, and succeeds when clean', () => {
    const root = fixture({ 'src/invalid.ts': 'const secret = 1;' });
    const script = fileURLToPath(new URL('../scripts/check-language.mjs', import.meta.url));
    const failed = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('src/invalid.ts');
    expect(fs.readFileSync(path.join(root, 'src/invalid.ts'), 'utf8')).toBe('const secret = 1;');
    fs.renameSync(path.join(root, 'src/invalid.ts'), path.join(root, 'src/valid.js'));
    const passed = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
    expect(passed.status).toBe(0);
    expect(passed.stdout).toContain('Language check passed');
  });
});
