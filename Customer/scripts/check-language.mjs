import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';

const ignoredDirectories = new Set([
  'node_modules',
  'dist',
  'artifacts',
  'coverage',
  'test-results',
  'playwright-report',
  '.git',
  '.next',
  '.cache',
  '.vite',
  'vendor',
  'third_party',
]);
const javascriptExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs']);
const forbiddenExtension = /\.(?:ts|tsx|mts|cts|py|pyw|pyc|pyo)(?:[?#]|$)/i;
const forbiddenPackages = new Set([
  'typescript',
  'ts-node',
  'tsx',
  'ts-loader',
  'ts-jest',
  'next',
  '@babel/preset-typescript',
  '@babel/plugin-transform-typescript',
  '@typescript-eslint/parser',
  '@swc-node/register',
]);
const forbiddenTools =
  /^(?:python(?:\d+(?:\.\d+)*)?|py|pypy\d*|tsc|ts-node(?:-esm)?|tsx|next)(?:\.(?:exe|cmd|bat))?$/i;
const processMethods = new Set([
  'exec',
  'execSync',
  'execFile',
  'execFileSync',
  'spawn',
  'spawnSync',
  'fork',
]);
const linter = new Linter();

function moduleViolation(specifier) {
  if (typeof specifier !== 'string') return null;
  if (forbiddenExtension.test(specifier)) return 'TypeScript/Python module reference';
  const normalized = specifier.replaceAll('\\', '/');
  for (const dependency of forbiddenPackages) {
    if (
      normalized === dependency ||
      normalized.startsWith(`${dependency}/`) ||
      normalized.includes(`/node_modules/${dependency}/`)
    ) {
      return `Unsupported runtime/compiler dependency: ${dependency}`;
    }
  }
  return null;
}

// Tokenize commands without executing them. Quoted text stays one argument.
function commandSegments(command) {
  const segments = [[]];
  let token = '',
    quote = '';
  const flush = () => {
    if (token) segments.at(-1).push(token);
    token = '';
  };
  for (const character of command) {
    if (quote) {
      if (character === quote) quote = '';
      else token += character;
    } else if (character === '"' || character === "'") quote = character;
    else if (';&|\n\r'.includes(character)) {
      flush();
      segments.push([]);
    } else if (/\s/.test(character)) flush();
    else token += character;
  }
  flush();
  return segments.filter((segment) => segment.length);
}

export function commandViolation(command) {
  if (typeof command !== 'string') return null;
  for (let tokens of commandSegments(command)) {
    tokens = tokens.filter((token) => !/^[A-Za-z_][\w]*=/.test(token));
    if (!tokens.length) continue;
    let executable = tokens[0].replaceAll('\\', '/').split('/').at(-1);
    if (['echo', 'printf', 'Write-Output'].includes(executable)) continue;
    if (
      ['env', 'cross-env', 'npx'].includes(executable) ||
      (['npm', 'pnpm', 'yarn'].includes(executable) && ['exec', 'dlx'].includes(tokens[1]))
    ) {
      tokens = tokens
        .slice(['npm', 'pnpm', 'yarn'].includes(executable) ? 2 : 1)
        .filter((token) => !token.startsWith('-'));
      executable = (tokens[0] || '').replaceAll('\\', '/').split('/').at(-1);
    }
    if (forbiddenTools.test(executable)) return `Unsupported command: ${executable}`;
    if (tokens.some((token) => forbiddenExtension.test(token)))
      return 'Command invokes a TypeScript/Python file';
    const registration = registrationViolation(tokens);
    if (registration) return registration;
    if (/^(?:bash|sh|cmd|powershell|pwsh)(?:\.exe)?$/i.test(executable)) {
      const index = tokens.findIndex((token) => /^(?:-c|\/c|-command)$/i.test(token));
      if (index >= 0) {
        const nested = commandViolation(tokens.slice(index + 1).join(' '));
        if (nested) return nested;
      }
    }
  }
  return null;
}

function registrationViolation(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const flag = tokens[i]?.match(/^(?:--import|--loader|--require|-r)(?:=(.+))?$/);
    if (flag) {
      const violation = moduleViolation(flag[1] || tokens[i + 1]);
      if (violation) return violation;
    }
  }
  return null;
}

function staticString(node, sourceCode, seen = new Set()) {
  if (!node || seen.has(node)) return undefined;
  seen.add(node);
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') {
    let value = node.quasis[0].value.cooked;
    for (let i = 0; i < node.expressions.length; i++) {
      const part = staticString(node.expressions[i], sourceCode, new Set(seen));
      if (part === undefined) return undefined;
      value += part + node.quasis[i + 1].value.cooked;
    }
    return value;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticString(node.left, sourceCode, new Set(seen));
    const right = staticString(node.right, sourceCode, new Set(seen));
    return left === undefined || right === undefined ? undefined : left + right;
  }
  if (node.type === 'Identifier') {
    for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
      const variable = scope.set.get(node.name);
      if (!variable) continue;
      const definition = variable.defs[0];
      if (definition?.type === 'Variable' && definition.parent.kind === 'const') {
        return staticString(definition.node.init, sourceCode, seen);
      }
      break;
    }
  }
  return undefined;
}

const languageRule = {
  meta: { schema: [] },
  create(context) {
    const source = context.sourceCode;
    const processFunctions = new Set(),
      processNamespaces = new Set(),
      calls = [];
    const report = (node, message) => {
      if (message) context.report({ node, message });
    };
    const inspectModule = (node) => report(node, moduleViolation(staticString(node, source)));
    const isProcessModule = (value) => ['node:child_process', 'child_process'].includes(value);
    const processCall = (callee) =>
      callee?.type === 'Identifier'
        ? processFunctions.has(callee.name)
        : callee?.type === 'MemberExpression' &&
          processNamespaces.has(callee.object.name) &&
          processMethods.has(
            callee.computed ? staticString(callee.property, source) : callee.property.name,
          );
    return {
      ImportDeclaration(node) {
        inspectModule(node.source);
        if (!isProcessModule(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') processNamespaces.add(specifier.local.name);
          else if (processMethods.has(specifier.imported.name))
            processFunctions.add(specifier.local.name);
        }
      },
      ImportExpression(node) {
        inspectModule(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) inspectModule(node.source);
      },
      ExportAllDeclaration(node) {
        inspectModule(node.source);
      },
      VariableDeclarator(node) {
        const init = node.init;
        if (init?.type !== 'CallExpression') return;
        if (
          init.callee.name === 'require' &&
          isProcessModule(staticString(init.arguments[0], source))
        ) {
          if (node.id.type === 'Identifier') processNamespaces.add(node.id.name);
          else
            for (const property of node.id.properties) {
              if (processMethods.has(property.key?.name)) processFunctions.add(property.value.name);
            }
        } else if (init.callee.name === 'promisify' && processCall(init.arguments[0])) {
          processFunctions.add(node.id.name);
        }
      },
      CallExpression(node) {
        if (node.callee.name === 'require' && node.arguments[0]) inspectModule(node.arguments[0]);
        calls.push(node);
      },
      Property(node) {
        if ((node.key.name || node.key.value) === 'command') {
          report(node.value, commandViolation(staticString(node.value, source)));
        }
      },
      'Program:exit'() {
        for (const node of calls) {
          if (!processCall(node.callee)) continue;
          const executable = staticString(node.arguments[0], source);
          report(node, commandViolation(executable));
          const argumentsNode = node.arguments[1];
          if (argumentsNode?.type === 'ArrayExpression') {
            report(
              node,
              registrationViolation(
                argumentsNode.elements.map((argument) => staticString(argument, source)),
              ),
            );
            for (const argument of argumentsNode.elements) {
              const value = staticString(argument, source);
              if (value && forbiddenExtension.test(value))
                report(argument, 'TypeScript/Python process argument');
            }
          }
        }
      },
    };
  },
};

export function inspectCode(code, filename = 'input.jsx') {
  return linter
    .verify(
      code,
      {
        files: ['**/*.{js,jsx,mjs,cjs}'],
        languageOptions: {
          ecmaVersion: 'latest',
          sourceType: filename.endsWith('.cjs') ? 'commonjs' : 'module',
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { language: { rules: { only: languageRule } } },
        rules: { 'language/only': 'error' },
      },
      { filename },
    )
    .map(({ line, column, message }) => ({
      line: line || 1,
      column: column || 1,
      message,
    }));
}

export async function scanProject(root) {
  root = path.resolve(root);
  const result = {
    files: 0,
    counts: { '.js': 0, '.jsx': 0, '.mjs': 0, '.cjs': 0 },
    inlineScripts: 0,
    violations: [],
  };
  const add = (file, message, line = 1, column = 1) =>
    result.violations.push({ file, line, column, message });
  async function visit(directory) {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name),
        file = path.relative(root, absolute).replaceAll('\\', '/');
      if (entry.isSymbolicLink()) {
        add(file, 'Symlink is not scanned; keep first-party sources inside the repository');
        continue;
      }
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      result.files++;
      const extension = path.extname(entry.name).toLowerCase();
      if (forbiddenExtension.test(entry.name)) {
        add(file, 'Forbidden TypeScript/Python file extension');
        continue;
      }
      if (/^(?:tsconfig(?:\..+)?\.json|next\.config\.)/i.test(entry.name))
        add(file, 'Obsolete TypeScript/Next.js configuration');
      const data = await fs.readFile(absolute);
      if (data.includes(0) && !javascriptExtensions.has(extension)) continue;
      const code = data.toString('utf8');
      if (/^#!.*\b(?:python[\d.]*|py|pypy\d*|ts-node|tsx)\b/i.test(code))
        add(file, 'Unsupported executable shebang');
      if (javascriptExtensions.has(extension)) {
        result.counts[extension]++;
        for (const issue of inspectCode(code, file))
          add(file, issue.message, issue.line, issue.column);
      } else if (extension === '.html') {
        for (const match of code.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
          const line = code.slice(0, match.index).split('\n').length;
          if (/\b(?:type|lang)\s*=\s*["'](?:text\/)?(?:typescript|ts)["']/i.test(match[1]))
            add(file, 'TypeScript script element', line);
          const src = match[1].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
          if (moduleViolation(src)) add(file, moduleViolation(src), line);
          if (
            !src &&
            (!/\btype\s*=/i.test(match[1]) ||
              /\btype\s*=\s*["'](?:module|(?:text|application)\/javascript)["']/i.test(match[1]))
          ) {
            result.inlineScripts++;
            for (const issue of inspectCode(match[2], 'inline.js'))
              add(file, issue.message, line + issue.line - 1, issue.column);
          }
        }
      } else if (entry.name === 'package.json' || entry.name === 'package-lock.json') {
        const json = JSON.parse(code),
          manifest = entry.name === 'package-lock.json' ? json.packages?.[''] || {} : json;
        for (const group of [
          'dependencies',
          'devDependencies',
          'optionalDependencies',
          'peerDependencies',
        ]) {
          for (const dependency of Object.keys(manifest[group] || {})) {
            if (forbiddenPackages.has(dependency))
              add(file, `Direct dependency is not needed: ${dependency}`);
          }
        }
        for (const [name, command] of Object.entries(manifest.scripts || {})) {
          const violation = commandViolation(command);
          if (violation) add(file, `npm script ${name}: ${violation}`);
        }
      } else if (
        ['.sh', '.bash', '.ps1', '.bat', '.cmd', '.yml', '.yaml'].includes(extension) ||
        /^(?:Dockerfile|Makefile)$/.test(entry.name)
      ) {
        for (const [index, line] of code.split(/\r?\n/).entries()) {
          if (/^\s*(?:#|REM\b|::)/i.test(line)) continue;
          const command = line
            .replace(/^\s*(?:-\s*)?(?:run|command|script):\s*/, '')
            .replace(/^\s*RUN\s+/, '');
          const violation = commandViolation(command);
          if (violation) add(file, violation, index + 1);
        }
      }
    }
  }
  await visit(root);
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--root'))
    throw new Error('Usage: node scripts/check-language.mjs [--root <repository>]');
  const root = args[1] || fileURLToPath(new URL('../', import.meta.url));
  const result = await scanProject(root);
  console.log(
    `Checked ${result.files} first-party files: ${Object.entries(result.counts)
      .map(([extension, count]) => `${count} ${extension}`)
      .join(', ')}; ${result.inlineScripts} inline scripts.`,
  );
  for (const issue of result.violations)
    console.error(`${issue.file}:${issue.line}:${issue.column} ${issue.message}`);
  console.log(
    result.violations.length
      ? `FAIL: ${result.violations.length} violation(s).`
      : 'PASS: JavaScript/JSX syntax and language policy.',
  );
  process.exitCode = result.violations.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
