// Read-only import from the reference Dashboard. Only allowlisted public fields are written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
const { values } = parseArgs({
  options: {
    source: { type: 'string' },
    output: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});
if (values.help) {
  console.log(
    'Usage: node scripts/import-public-fixtures.mjs --source <dashboard-src> [--output <seed.json>]',
  );
  console.log(
    'Alternatively set CMS_DASHBOARD_SRC. Optional, manual import only; existing mock data needs no Dashboard.',
  );
  process.exit(0);
}
const sourceDirectory = values.source || process.env.CMS_DASHBOARD_SRC;
if (!sourceDirectory) {
  console.error('Missing --source <dashboard-src> or CMS_DASHBOARD_SRC. No files were changed.');
  process.exit(1);
}
const base = path.resolve(sourceDirectory);
const output = values.output
  ? path.resolve(values.output)
  : fileURLToPath(new URL('../src/mocks/public-seed.json', import.meta.url));
const cache = new Map();
function moduleUrl(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /from\s+['"](\.[^'"]+)['"]/g,
    (_, s) =>
      `from '${moduleUrl(path.resolve(path.dirname(file), s.endsWith('.js') ? s : s + '.js'))}'`,
  );
  const url = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  cache.set(file, url);
  return url;
}
const { makeData } = await import(moduleUrl(base + '/mocks/data.js'));
const anchor = '2026-10-26',
  source = makeData(anchor);
const fields = {
  branches: 'branchId bName bAddress phoneNumbers totalRooms',
  rooms: 'branchId roomId rType rCapacity basePrice totalSeats',
  seats: 'branchId roomId sRow sColumn sType sPrice sStatus',
  movies:
    'movieId mName descript runTime isDub isSub slug releaseDate closingDate ageRating posterUrl trailerUrl genres formats actors',
  showtimes:
    'timeId movieId movieName branchId branchName roomId rType rPrice formatName day startTime endTime endDate status',
  'food-drinks':
    'productId pName pType price quantity imgUrl itemType startDate endDate description',
  merchandise: 'productId merchName price availNum startDate endDate imgUrl itemType description',
  coupons: 'couponId startDate endDate saleOff releaseNum availNum minOrderTotal maxDiscount',
  faq: 'id question answer sortOrder status',
  news: 'id title slug seoTitle metaDescription tags content category status imageUrl createdAt',
  'movie-comments':
    'commentId movieId movieTitle userId authorName rating content contentStatus createdAt',
  'cinema-reviews':
    'reviewId branchId branchName roomId userId authorName content contentStatus createdAt',
};
const data = { anchor };
for (const [key, list] of Object.entries(fields))
  data[key] = source[key].map((row) =>
    Object.fromEntries(
      list
        .split(' ')
        .filter((k) => k in row)
        .map((k) => [k, row[k]]),
    ),
  );
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(data, null, 2) + '\n');
console.log('Exported public fixture collections:', Object.keys(data).join(', '));
