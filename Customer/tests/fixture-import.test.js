import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('../scripts/import-public-fixtures.mjs', import.meta.url));
test('fixture importer help/missing source does not touch the bundled seed', async () => {
  const seed = new URL('../src/mocks/public-seed.json', import.meta.url);
  const before = await fs.readFile(seed);
  const env = { ...process.env, CMS_DASHBOARD_SRC: '' };
  assert.equal(spawnSync(process.execPath, [script, '--help'], { env }).status, 0);
  const missing = spawnSync(process.execPath, [script], {
    env,
    encoding: 'utf8',
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Missing --source/);
  assert.deepEqual(await fs.readFile(seed), before);
});

test('fixture importer accepts portable CLI/environment paths and retains the public allowlist', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cms-fixture-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'dashboard source'),
    output = path.join(root, 'output', 'seed.json');
  await fs.mkdir(path.join(source, 'mocks'), { recursive: true });
  const collections = [
    'branches',
    'rooms',
    'seats',
    'movies',
    'showtimes',
    'food-drinks',
    'merchandise',
    'coupons',
    'faq',
    'news',
    'movie-comments',
    'cinema-reviews',
  ];
  const rows = Object.fromEntries(collections.map((name) => [name, []]));
  rows.movies = [{ movieId: 1, mName: 'Portable', privateField: 'exclude' }];
  await fs.writeFile(
    path.join(source, 'mocks', 'data.js'),
    `export const makeData = () => (${JSON.stringify(rows)});`,
  );
  for (const args of [
    ['--source', source, '--output', output],
    ['--output', output],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      env: { ...process.env, CMS_DASHBOARD_SRC: source },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(await fs.readFile(output, 'utf8'));
    assert.deepEqual(data.movies, [{ movieId: 1, mName: 'Portable' }]);
    assert.equal(data.anchor, '2026-10-26');
  }
});
