import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'espree';

// Scan owned files, never the implementation/declarations shipped by npm packages.
const ignoredDirectories = new Set([
  'node_modules', '.git', '.agents', '.codex', '.aws', 'dist', 'build', 'coverage',
  '.vite', '.cache', '.next', 'test-results', 'playwright-report',
  'playwright-http-report', 'delivery',
]);
const codeExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs']);
const resourceExtensions = new Set([
  '.html', '.css', '.json', '.svg', '.md', '.txt', '.pdf', '.png', '.jpg', '.jpeg',
  '.webp', '.gif', '.ico', '.avif', '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.map', '.lock',
]);
const toolPackage = /^(?:typescript|ts-node|tsx|@typescript-eslint(?:\/[^/]+)?)(?:\/|$)/;
const forbiddenImport = value => toolPackage.test(value) || /\.(?:[cm]?ts|tsx|py)(?:[?#].*)?$/i.test(value);
const forbiddenCommand = /(?:^|[\s;&|()"'\\/])(?:python(?:w|\d+(?:\.\d+)*)?|pypy\d*|py|tsc|ts-node|tsx)(?:\.exe|\.cmd)?(?=$|[\s;&|()"'])|(?:^|[\s"'])[\w./\\:-]+\.(?:py|[cm]?ts|tsx)(?=$|[\s"'])/i;
const processFunctions = new Set(['exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork']);

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'range', 'tokens', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

function staticText(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  if (node?.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticText(node.left), right = staticText(node.right);
    if (left !== undefined && right !== undefined) return left + right;
  }
}

export function inspectJavaScript(source, file) {
  const issues = [];
  const report = (node, message) => issues.push(`${file}:${node?.loc?.start.line || 1}: ${message}`);
  if (source.startsWith('#!') && forbiddenCommand.test(source.split(/\r?\n/, 1)[0])) report(null, 'Python/TypeScript interpreter is not allowed.');
  let ast;
  try {
    ast = parse(source, {
      ecmaVersion: 'latest', sourceType: file.endsWith('.cjs') ? 'commonjs' : 'module',
      ecmaFeatures: { jsx: true }, loc: true, comment: true,
    });
  } catch (error) {
    return [`${file}:${error.lineNumber || 1}: Invalid JavaScript/JSX: ${error.message}`];
  }
  if (ast.comments.some(comment => /@flow\b/.test(comment.value))) report(null, 'Flow pragma is not allowed.');
  const executableAliases = new Set(processFunctions);
  walk(ast, node => {
    if (node.type === 'ImportDeclaration' && /^(?:node:)?child_process$/.test(node.source.value)) {
      for (const specifier of node.specifiers) {
        if (processFunctions.has(specifier.imported?.name)) executableAliases.add(specifier.local.name);
      }
    }
  });
  walk(ast, node => {
    let specifier;
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type)) specifier = staticText(node.source);
    if (node.type === 'CallExpression' && node.callee.name === 'require') specifier = staticText(node.arguments[0]);
    if (specifier && forbiddenImport(specifier)) report(node, `Disallowed import: ${specifier}`);
    if (node.type === 'Property' && (node.key.name || node.key.value) === 'command' && forbiddenCommand.test(staticText(node.value) || '')) report(node, 'Configuration executes a Python/TypeScript tool.');
    if (node.type === 'CallExpression') {
      const name = node.callee.name || node.callee.property?.name;
      if (executableAliases.has(name)) {
        for (const argument of node.arguments) {
          const values = argument.type === 'ArrayExpression' ? argument.elements : [argument];
          if (values.some(value => forbiddenCommand.test(staticText(value) || ''))) report(node, 'Python/TypeScript execution is not allowed.');
        }
      }
    }
  });
  return issues;
}

export function auditLanguage(root) {
  root = path.resolve(root);
  const violations = [], counts = {};
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      if (entry.isSymbolicLink()) { violations.push(`${relative}: Symlink is not scanned; use an owned file or an npm dependency.`); continue; }
      if (entry.isDirectory()) { scan(absolute); continue; }
      const extension = path.extname(entry.name).toLowerCase();
      if (codeExtensions.has(extension)) {
        counts[extension] = (counts[extension] || 0) + 1;
        violations.push(...inspectJavaScript(fs.readFileSync(absolute, 'utf8'), relative));
      } else if (!resourceExtensions.has(extension) && !/^\.env(?:\..+)?$/.test(entry.name) && !['.gitignore', '.npmrc', '.editorconfig', '.gitattributes', 'LICENSE'].includes(entry.name)) {
        violations.push(`${relative}: Disallowed source/file extension: ${extension || '(none)'}`);
      }
      if (entry.name === 'tsconfig.json' || entry.name.startsWith('tsconfig.')) violations.push(`${relative}: TypeScript configuration is not used in this project.`);
      if (entry.name === 'package.json') {
        const pkg = JSON.parse(fs.readFileSync(absolute, 'utf8'));
        for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
          for (const name of Object.keys(pkg[section] || {})) {
            if (toolPackage.test(name) || name.startsWith('@types/')) violations.push(`${relative}: Unnecessary direct type dependency: ${name}`);
          }
        }
        for (const [name, command] of Object.entries(pkg.scripts || {})) {
          if (forbiddenCommand.test(command)) violations.push(`${relative}: scripts.${name} executes a Python/TypeScript tool.`);
        }
      }
    }
  }
  scan(root);
  return { violations, counts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { violations, counts } = auditLanguage(path.resolve(process.argv[2] || '.'));
    if (violations.length) {
      console.error(`Language check failed (${violations.length}):\n${violations.join('\n')}`);
      process.exitCode = 1;
    } else console.log(`Language check passed: ${JSON.stringify(counts)}. Owned code parses as JavaScript/JSX.`);
  } catch (error) {
    console.error(`Language check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
