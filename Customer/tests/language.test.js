import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  inspectCode,
  scanProject,
  commandViolation,
} from "../scripts/check-language.mjs";

async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "cms-language-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await fs.writeFile(path.join(root, name), content);
  }
  return root;
}

test("language guard accepts modern JS/JSX and ordinary type/interface/enum properties", () => {
  assert.deepEqual(
    inspectCode(`
    const data = { type: "movie", interface: "web", enum: [1, 2] };
    export const Card = ({ movie }) => <article data-type={data.type}>{movie?.name ?? "Film"}</article>;
    // Documentation can mention TypeScript and Python.
    const message = "python script.py";
  `),
    [],
  );
});

test("language guard rejects TypeScript syntax even when renamed to JSX", () => {
  for (const code of [
    "const count: number = 1;",
    "interface Movie { id: number }",
    "enum Status { Active }",
    'import type { Movie } from "./movie.js";',
    "const movie = value as Movie;",
    "const movie = value satisfies Movie;",
    "function identity<T>(value: T): T { return value; }",
  ])
    assert.ok(inspectCode(code).length, code);
});

test("language guard rejects compiler imports, re-exports and dynamic module references", () => {
  for (const code of [
    'import ts from "typescript";',
    'export * from "./legacy.ts";',
    'import("./legacy.tsx");',
    'const ts = require("typescript/lib/typescript.js");',
    'const moduleName = "type" + "script"; import(moduleName);',
    'import "ts-node/register";',
    'import "next/navigation";',
  ])
    assert.ok(inspectCode(code).length, code);
});

test("language guard detects child_process aliases and configured Python commands", () => {
  for (const code of [
    'import { execFile as run } from "node:child_process"; run("python3", ["old.py"]);',
    'import cp from "node:child_process"; const executable = "py"; cp.spawn(executable, ["-3"]);',
    'const { execSync: run } = require("child_process"); run("npx tsc");',
    'import { exec } from "node:child_process"; import { promisify } from "node:util"; const run = promisify(exec); run("python -V");',
    'export default { webServer: { command: "python -m http.server" } };',
  ])
    assert.ok(inspectCode(code).length, code);
  assert.deepEqual(
    inspectCode('const expression = /python/; expression.exec("python");'),
    [],
  );
});

test("language guard checks commands without rejecting quoted documentation", () => {
  for (const command of [
    "python --version",
    '"C:\\Program Files\\Python\\python.exe" script.py',
    "node tools/old.ts",
    "npm exec -- tsc --noEmit",
    "npx tsx task.js",
    "MODE=test python3 old.py",
    'sh -c "python --version"',
    "npm run lint && py -3 old.py",
    "node --import tsx task.js",
    "node --loader=ts-node/esm task.js",
  ])
    assert.ok(commandViolation(command), command);
  for (const command of [
    "vite build",
    "node --test tests/*.test.js",
    "echo 'python old.py'",
    "npm run test:e2e",
  ])
    assert.equal(commandViolation(command), null, command);
});

test("language scan covers nested source, configs and CI, excludes generated and third-party files", async (t) => {
  const root = await fixture(t, {
    "src/good.jsx": "export default () => <div />;",
    "src/bad.tsx": "export default () => null;",
    "scripts/bad.py": "print('unused')",
    "tool.mts": "export {};",
    "tool.cts": "export {};",
    ".github/workflows/ci.yml": "steps:\n  - run: python --version\n",
    "node_modules/lib/types.d.ts": "declare const version: string;",
    "dist/old.ts": "",
    "artifacts/old.py": "",
    "coverage/old.ts": "",
    "test-results/old.py": "",
    "playwright-report/old.ts": "",
    "vendor/types.d.ts": "",
    "public/icon.svg": '<svg xmlns="http://www.w3.org/2000/svg"/>',
    "public/logo.png": Buffer.from([137, 80, 0, 78]),
    "src/style.css": "body { color: white; }",
    "src/data.json": '{"type":"movie"}',
  });
  const result = await scanProject(root);
  assert.equal(result.counts[".jsx"], 1);
  assert.deepEqual(result.violations.map((issue) => issue.file).sort(), [
    ".github/workflows/ci.yml",
    "scripts/bad.py",
    "src/bad.tsx",
    "tool.cts",
    "tool.mts",
  ]);
});

test("language scan checks inline HTML, npm scripts and direct dependencies only", async (t) => {
  const root = await fixture(t, {
    "index.html": '<script type="module">const count: number = 1;</script>',
    "package.json": JSON.stringify({
      scripts: { build: "tsc && vite build" },
      devDependencies: { typescript: "*" },
    }),
    "package-lock.json": JSON.stringify({
      packages: {
        "": { devDependencies: { eslint: "*" } },
        "node_modules/typescript": { version: "5" },
      },
    }),
  });
  const result = await scanProject(root);
  assert.equal(result.inlineScripts, 1);
  assert.equal(result.violations.length, 3);
  assert.ok(
    result.violations.every((issue) => issue.file !== "package-lock.json"),
  );
});

test("language CLI returns nonzero with a concrete offending path", async (t) => {
  const root = await fixture(t, { "src/bad.jsx": "const count: number = 1;" });
  const script = fileURLToPath(
    new URL("../scripts/check-language.mjs", import.meta.url),
  );
  const failed = spawnSync(process.execPath, [script, "--root", root], {
    encoding: "utf8",
  });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /src\/bad\.jsx:1:/);
  await fs.writeFile(
    path.join(root, "src/bad.jsx"),
    "export default () => <div />;",
  );
  const passed = spawnSync(process.execPath, [script, "--root", root], {
    encoding: "utf8",
  });
  assert.equal(passed.status, 0, passed.stderr);
  assert.match(passed.stdout, /1 .jsx/);
});
