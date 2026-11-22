import { describe, it, expect, beforeEach } from 'vitest';
import { can, normalizeUser } from '../src/utils/permissions';
import { validateImage, validateFields, safeImageUrl } from '../src/utils/validation';
import { validateMutation } from '../src/utils/requestValidation';
import { mockAdapter, resetMock } from '../src/mocks/adapter';
const request = (url, method = 'get', data, params) =>
  mockAdapter({ url, method, data: JSON.stringify(data || {}), params, headers: {} });
beforeEach(resetMock);
describe('Authorization boundaries', () => {
  for (const role of ['staff', 'manager', 'admin'])
    it(role + ' cannot change customer profile, including direct mock requests', async () => {
      await request('/auth/login', 'post', {
        email: role + '@cinema.test',
        password: 'Demo@12345',
      });
      const before = (await request('/customers/KH001')).data.data;
      for (const method of ['patch', 'put', 'post']) {
        expect(() => validateMutation('/customers/KH001', method, { cName: 'Changed' })).toThrow(
          'Chỉ khách hàng',
        );
        await expect(
          request('/customers/KH001', method, { cName: 'Changed', email: 'changed@example.test' }),
        ).rejects.toMatchObject({ response: { status: 403 } });
      }
      expect((await request('/customers/KH001')).data.data).toEqual(before);
      if (role !== 'staff') {
        await request('/customers/KH001/deactivate', 'patch');
        expect((await request('/customers/KH001')).data.data).toMatchObject({
          ...before,
          isActive: false,
        });
        await request('/customers/KH001/activate', 'patch');
        expect((await request('/customers/KH001')).data.data).toEqual(before);
      }
    });
  it('fails closed without server permissions, including ADMIN', () => {
    expect(can({ role: 'ADMIN', permissions: [] }, 'movies', 'delete')).toBe(false);
    expect(can({ role: 'STAFF', permissions: ['orders:read'] }, 'orders', 'delete')).toBe(false);
    expect(() => normalizeUser({ role: 'CUSTOMER' })).toThrow();
  });
  it('normalizes exact internal role names only', () => {
    expect(normalizeUser({ role: 'ROLE_MANAGER' }).role).toBe('MANAGER');
    expect(() => normalizeUser({ role: 'SUPER_ADMIN' })).toThrow();
  });
  it('mock denies unauthenticated access and staff writes', async () => {
    await expect(request('/movies')).rejects.toMatchObject({ response: { status: 401 } });
    await request('/auth/login', 'post', { email: 'staff@cinema.test', password: 'Demo@12345' });
    await expect(request('/movies', 'post', { mName: 'x' })).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
  it('mock enforces branch scope even when query is tampered', async () => {
    await request('/auth/login', 'post', { email: 'manager@cinema.test', password: 'Demo@12345' });
    const r = await request('/orders', 'get', null, { branchId: 2 });
    expect(r.data.data).toHaveLength(0);
    await expect(request('/rooms/2/1', 'put', { branchId: 2 })).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
  it('keeps composite room IDs separate', async () => {
    await request('/auth/login', 'post', { email: 'admin@cinema.test', password: 'Demo@12345' });
    await request('/rooms/1/1', 'put', { basePrice: 99000 });
    const other = await request('/rooms/2/1');
    expect(other.data.data.basePrice).toBe(80000);
  });
  it('mock CRUD and pagination reflect mutations', async () => {
    await request('/auth/login', 'post', { email: 'admin@cinema.test', password: 'Demo@12345' });
    const created = await request('/faq', 'post', {
      question: 'New',
      answer: 'Answer',
      sortOrder: 2,
      status: 'DRAFT',
    });
    await request('/faq/' + created.data.data.id, 'put', { question: 'Changed' });
    const list = await request('/faq', 'get', null, { page: 1, pageSize: 10, q: 'Changed' });
    expect(list.data.meta.total).toBe(1);
    await request('/faq/' + created.data.data.id, 'delete');
    expect((await request('/faq', 'get', null, { page: 1, q: 'Changed' })).data.meta.total).toBe(0);
  });
});
describe('Validation', () => {
  it('rejects active SVG and oversized uploads', () => {
    expect(() => validateImage({ type: 'image/svg+xml', size: 10 })).toThrow();
    expect(() => validateImage({ type: 'image/png', size: 6 * 1024 * 1024 })).toThrow();
    expect(() => validateImage({ type: 'image/jpeg', size: 1024 })).not.toThrow();
  });
  it('rejects script URLs', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBe('');
    expect(safeImageUrl('//evil.test/image')).toBe('');
  });
  it('validates slug, required text and numeric ranges', () => {
    expect(
      Object.keys(
        validateFields(
          [
            { name: 'slug', label: 'Slug' },
            { name: 'title', label: 'Title', required: true },
            { name: 'price', label: 'Price', type: 'number', min: 0 },
          ],
          { slug: 'BAD SLUG', title: ' ', price: -1 },
        ),
      ),
    ).toHaveLength(3);
  });
  it('rejects invalid cinema date ranges and negative prices', () => {
    expect(() =>
      validateMutation('/showtimes', 'post', {
        movieId: 1,
        branchId: 1,
        roomId: 1,
        day: '2026-10-24',
        startTime: '15:00',
        endTime: '12:00',
      }),
    ).toThrow();
    expect(() =>
      validateMutation('/food-drinks', 'post', { pName: 'Water', price: -1, quantity: 1 }),
    ).toThrow();
  });
});
