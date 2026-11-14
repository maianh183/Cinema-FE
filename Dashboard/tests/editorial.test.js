import { beforeEach, it, expect } from 'vitest';
import { mockAdapter, resetMock } from '../src/mocks/adapter';
import { can } from '../src/utils/permissions';
import { siteSections, validateSection } from '../src/utils/siteContent';
import { editorialSeed } from '../src/mocks/siteContent';
const request = (url, method = 'get', data = {}, params = {}) =>
  mockAdapter({ url, method, data: JSON.stringify(data), params, headers: {} });
const login = (role) =>
  request('/auth/login', 'post', { email: role + '@cinema.test', password: 'Demo@12345' });
beforeEach(resetMock);
it('guest sends canonical contact receipt, cannot read or change private contacts', async () => {
  const body = {
    fullName: 'Guest',
    email: 'guest@example.test',
    phone: '',
    subject: 'Question',
    content: '<script>not executed</script>',
  };
  const receipt = (await request('/contacts', 'post', body)).data.data;
  expect(receipt).toEqual({ id: 25, received: true });
  await expect(request('/contacts')).rejects.toMatchObject({ response: { status: 401 } });
  await expect(request('/contacts/25/status', 'patch', { status: 'READ' })).rejects.toMatchObject({
    response: { status: 401 },
  });
  await login('admin');
  expect((await request('/contacts/25')).data.data).toMatchObject({ ...body, status: 'UNREAD' });
  await expect(request('/contacts', 'post', { ...body, status: 'REPLIED' })).rejects.toMatchObject({
    response: { status: 422 },
  });
});
for (const role of ['STAFF', 'MANAGER', 'CUSTOMER'])
  it(role + ' never gains editorial access through wildcard/branch IDs', async () => {
    for (const module of ['contacts', 'website-content'])
      for (const action of ['read', 'update', 'delete'])
        expect(can({ role, branchId: 1, permissions: ['*'] }, module, action)).toBe(false);
    if (role === 'CUSTOMER') return;
    await login(role.toLowerCase());
    for (const [url, method, body] of [
      ['/contacts', 'get', {}],
      ['/contacts/1', 'get', {}],
      ['/contacts/1/status', 'patch', { status: 'READ' }],
      ['/contacts/1', 'delete', {}],
      ['/site-content', 'get', {}],
      ['/site-content/home', 'put', {}],
    ])
      await expect(request(url, method, body, { branchId: 1 })).rejects.toMatchObject({
        response: { status: 403 },
      });
  });
it('ADMIN still needs granular permissions; removed settings/media routes remain unauthorized modules', () => {
  expect(can({ role: 'ADMIN', permissions: [] }, 'contacts')).toBe(false);
  expect(can({ role: 'ADMIN', permissions: ['contacts:read'] }, 'contacts', 'update')).toBe(false);
  expect(can({ role: 'ADMIN', permissions: ['*'] }, 'contacts', 'create')).toBe(false);
  expect(can({ role: 'ADMIN', permissions: ['*'] }, 'website-content', 'delete')).toBe(false);
  expect(can({ role: 'ADMIN', permissions: ['*'] }, 'settings')).toBe(false);
});
it('contact filter/count/paging is stable and searches intended fields only', async () => {
  await login('admin');
  const first = await request('/contacts', 'get', {}, { page: 1, pageSize: 5 }),
    second = await request('/contacts', 'get', {}, { page: 2, pageSize: 5 });
  expect(first.data.meta).toEqual({ total: 24, page: 1, pageSize: 5 });
  expect(first.data.data[0].id).toBe(24);
  expect(first.data.data.some((a) => second.data.data.some((b) => a.id === b.id))).toBe(false);
  expect(
    (await request('/contacts', 'get', {}, { status: 'UNREAD', page: 1, pageSize: 10 })).data.meta
      .total,
  ).toBe(8);
  for (const q of [
    'contact24@example.test',
    '0900000024',
    'Khách Demo 24',
    'Thông tin suất chiếu 24',
  ])
    expect((await request('/contacts', 'get', {}, { q })).data.meta.total).toBe(1);
  expect((await request('/contacts', 'get', {}, { q: 'Dữ liệu mô phỏng' })).data.meta.total).toBe(
    0,
  );
  for (const params of [{ page: 0 }, { pageSize: 101 }, { status: 'SENT' }, { branchId: 2 }])
    await expect(request('/contacts', 'get', {}, params)).rejects.toMatchObject({
      response: { status: 422 },
    });
});
it('detail is read-only; all manual status transitions and delete update actual totals', async () => {
  await login('admin');
  expect((await request('/contacts/1')).data.data.status).toBe('UNREAD');
  for (const status of ['READ', 'REPLIED', 'UNREAD']) {
    const result = (await request('/contacts/1/status', 'patch', { status })).data.data;
    expect(result.status).toBe(status);
    expect(result).not.toHaveProperty('emailSent');
    expect((await request('/contacts', 'get', {}, { status: 'UNREAD' })).data.meta.total).toBe(
      status === 'UNREAD' ? 8 : 7,
    );
  }
  await expect(
    request('/contacts/1/status', 'patch', { status: 'REPLIED', emailSent: true }),
  ).rejects.toMatchObject({ response: { status: 422 } });
  await expect(request('/contacts/1', 'put', { status: 'READ' })).rejects.toMatchObject({
    response: { status: 405 },
  });
  await request('/contacts/1', 'delete');
  expect((await request('/contacts')).data.meta.total).toBe(23);
  await expect(request('/contacts/1')).rejects.toMatchObject({ response: { status: 404 } });
});
it('section schema rejects omissions, extras, HTML, unsafe URLs and wrong types', () => {
  const seed = editorialSeed('2026-11-06')['site-content'];
  for (const section of Object.keys(siteSections))
    expect(validateSection(section, seed[section])).toEqual(seed[section]);
  for (const patch of [
    { title: '' },
    { title: 8 },
    { introduction: '<iframe src=x>' },
    { title: 'x'.repeat(201) },
    { price: 1 },
  ])
    expect(() => validateSection('pricing', { ...seed.pricing, ...patch })).toThrow();
  expect(() => validateSection('unknown', {})).toThrow();
  expect(() => validateSection('home', { headline: 'Only title' })).toThrow();
  for (const mapUrl of [
    'javascript:alert(1)',
    'data:text/html,test',
    'http://example.test',
    'https://user:secret@example.test',
  ])
    expect(() => validateSection('contact', { ...seed.contact, mapUrl })).toThrow();
  expect(() =>
    validateSection('global', { ...seed.global, logoUrl: 'data:image/svg+xml;base64,AAAA' }),
  ).toThrow();
});
it('public projection has exactly six sections; section PUT preserves other sections and keeps audit internal', async () => {
  const before = (await request('/public/site-content')).data.data;
  expect(Object.keys(before).sort()).toEqual(Object.keys(siteSections).sort());
  await login('admin');
  const changed = { ...before.home, headline: 'New home' };
  expect((await request('/site-content/home', 'put', changed)).data.data).toEqual(changed);
  const internal = (await request('/site-content')).data.data;
  expect(internal.updatedBy).toBe('NV001');
  const after = (await request('/public/site-content')).data.data;
  expect(after).toEqual({ ...before, home: changed });
  expect(after).not.toHaveProperty('updatedBy');
  await expect(
    request('/site-content/home', 'put', {
      ...changed,
      heroImageUrl: 'https://external.test/image.png',
    }),
  ).rejects.toMatchObject({ response: { status: 422 } });
  expect((await request('/site-content')).data.data.home).toEqual(changed);
  await expect(request('/site-content/prices', 'put', {})).rejects.toMatchObject({
    response: { status: 405 },
  });
});
