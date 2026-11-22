import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contactRequest, contactReceipt, contactError } from '../src/lib/contact.js';
import {
  adaptSiteContent,
  defaultSiteContent,
  safeContentUrl,
  siteContentSchema,
} from '../src/lib/siteContent.js';
import { responseData } from '../src/services/adapters.js';
import { createRepository } from '../src/mocks/repository.js';
import seed from '../src/mocks/site-content-seed.json' with { type: 'json' };

const contact = {
  fullName: ' Khách Demo ',
  email: 'guest@example.test',
  phone: '+84901234567',
  subject: ' Hỗ trợ ',
  content: ' Nội dung ',
};
test('contact trims and allowlists five fields without accepting internal status', () => {
  assert.deepEqual(contactRequest({ ...contact, status: 'REPLIED', id: 9 }), {
    ...contact,
    fullName: 'Khách Demo',
    subject: 'Hỗ trợ',
    content: 'Nội dung',
  });
});
test('contact rejects whitespace, invalid types, limits, email and phone outside existing 8–15 digit rule', () => {
  for (const key of Object.keys(contact))
    for (const bad of [null, 42, '  ', 'x'.repeat(5001)])
      assert.throws(() => contactRequest({ ...contact, [key]: bad }));
  for (const phone of ['1234567', '1234567890123456', '090 123 4567', 'abc12345678'])
    assert.throws(() => contactRequest({ ...contact, phone }));
  for (const email of ['a@b', 'a@@b.test', 'a b@c.test'])
    assert.throws(() => contactRequest({ ...contact, email }));
  for (const phone of ['12345678', '+123456789012345'])
    assert.equal(contactRequest({ ...contact, phone }).phone, phone);
});
test('contact receipt needs positive numeric id and literal true after successful envelope', () => {
  assert.deepEqual(
    contactReceipt(
      responseData({
        success: true,
        data: { id: 3, received: true, email: 'private' },
      }),
    ),
    { id: 3, received: true },
  );
  for (const data of [
    null,
    {},
    { id: 1 },
    { id: 1, received: 'true' },
    { id: '1', received: true },
    { id: 0, received: true },
    { id: -1, received: true },
  ])
    assert.throws(() => contactReceipt(data));
  assert.throws(() => responseData({ success: false, data: { id: 1, received: true } }));
});
test('contact error messages explain validation, throttling and unconfirmed transport', () => {
  assert.match(
    contactError({
      status: 422,
      message: 'Dữ liệu sai',
      errors: { email: ['Email không hợp lệ'] },
    }),
    /Email không hợp lệ/,
  );
  assert.match(contactError({ status: 400 }), /Dữ liệu chưa hợp lệ/);
  assert.match(contactError({ status: 429 }), /quá nhiều/);
  for (const code of ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'])
    assert.match(contactError({ code }), /Chưa nhận được xác nhận/);
});
test('guest contact persists canonical internal row but returns receipt only and stable numeric IDs', async () => {
  const repo = createRepository({
    now: () => Date.parse('2026-11-06T08:00:00Z'),
  });
  repo.db.contacts.push({ id: 12 });
  const receipt = await repo.request('POST', '/contacts', {
    ...contact,
    status: 'REPLIED',
  });
  assert.deepEqual(receipt, { id: 13, received: true });
  assert.deepEqual(repo.db.contacts[1], {
    ...contactRequest(contact),
    id: 13,
    status: 'UNREAD',
    createdAt: '2026-11-06T08:00:00.000Z',
  });
  await assert.rejects(() => repo.request('POST', '/contacts', { ...contact, phone: 'bad' }));
  assert.equal(repo.db.contacts.length, 2);
});
test('public site content has exactly six allowlisted sections, no contact PII or audit', async () => {
  const repo = createRepository();
  await repo.request('POST', '/contacts', contact);
  const data = await repo.request('GET', '/public/site-content');
  assert.deepEqual(data, seed);
  assert.deepEqual(Object.keys(data), Object.keys(siteContentSchema));
  for (const [key, fields] of Object.entries(siteContentSchema))
    assert.deepEqual(Object.keys(data[key]), Object.keys(fields));
  assert.ok(!JSON.stringify(data).includes(contact.email));
  const raw = {
    ...seed,
    contacts: repo.db.contacts,
    updatedBy: 'ADMIN',
    global: { ...seed.global, password: 'secret' },
  };
  assert.deepEqual(adaptSiteContent(raw).data, seed);
  assert.deepEqual(adaptSiteContent(seed).fallbackSections, []);
});
test('missing/malformed sections and unsafe values have explicit fallback with safe existing copy', () => {
  for (const bad of [null, [], 'html', {}])
    assert.equal(adaptSiteContent(bad).fallbackSections.length, 6);
  const result = adaptSiteContent({
    ...seed,
    about: { title: 'Tên mới', introduction: '<script>alert(1)</script>' },
    global: {
      ...seed.global,
      companyName: ' ',
      hotline: 'abc',
      logoUrl: 'javascript:alert(1)',
    },
  });
  assert.deepEqual(result.fallbackSections, ['global', 'about']);
  assert.equal(result.data.about.title, 'Tên mới');
  assert.equal(result.data.about.introduction, defaultSiteContent.about.introduction);
  assert.equal(result.data.global.logoUrl, '');
  assert.equal(result.data.global.companyName, 'CMS Cinema');
  assert.equal(
    adaptSiteContent({ ...seed, about: { ...seed.about, introduction: '' } }).data.about
      .introduction,
    '',
  );
});
test('editorial URLs allow HTTPS social/map and local images only, never iframe/data/javascript', () => {
  for (const bad of [
    'javascript:alert(1)',
    'http://example.test',
    'data:image/svg+xml,<svg/>',
    '//evil.test/x',
    '/\\evil.test',
    'https://a:b@evil.test/x',
    'https://example.test/a b',
  ]) {
    assert.equal(safeContentUrl(bad), false, bad);
    assert.equal(safeContentUrl(bad, true), false, bad);
  }
  assert.equal(safeContentUrl('/uploads/logo.webp', true), true);
  assert.equal(safeContentUrl('/uploads/logo.webp'), false);
  assert.equal(safeContentUrl('https://cdn.example.test/logo.webp', true), true);
  assert.equal(safeContentUrl('https://maps.example.test/place'), true);
});
test('Customer mock rejects admin contact/content endpoints and cannot edit public content', async () => {
  const repo = createRepository();
  for (const [method, path] of [
    ['GET', '/contacts'],
    ['GET', '/contacts/1'],
    ['PATCH', '/contacts/1/status'],
    ['DELETE', '/contacts/1'],
    ['GET', '/site-content'],
    ['PUT', '/site-content/global'],
    ['PUT', '/public/site-content'],
  ])
    await assert.rejects(() => repo.request(method, path, {}));
  assert.deepEqual(await repo.request('GET', '/public/site-content'), seed);
});
test('editorial content cannot override catalog prices and its service only calls public GET', async () => {
  const repo = createRepository();
  const before = JSON.stringify({
    rooms: repo.db.rooms,
    products: await repo.request('GET', '/public/products'),
    showtimes: await repo.request('GET', '/public/showtimes'),
  });
  await repo.request('GET', '/public/site-content');
  const result = adaptSiteContent({
    ...seed,
    pricing: { ...seed.pricing, basePrice: 1, total: 1 },
  });
  assert.equal(result.data.pricing.basePrice, undefined);
  assert.equal(
    JSON.stringify({
      rooms: repo.db.rooms,
      products: await repo.request('GET', '/public/products'),
      showtimes: await repo.request('GET', '/public/showtimes'),
    }),
    before,
  );
  const service = readFileSync(
    new URL('../src/services/siteContentService.js', import.meta.url),
    'utf8',
  );
  assert.match(service, /request\("GET", "\/public\/site-content"\)/);
  assert.doesNotMatch(service, /"\/site-content|"\/contacts/);
});
