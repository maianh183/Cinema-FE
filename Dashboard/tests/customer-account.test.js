import { beforeEach, describe, expect, it, vi } from 'vitest';
import { can } from '../src/utils/permissions';
import { validateMutation } from '../src/utils/requestValidation';
import {
  validateCustomerProfile,
  customerProfileDto,
  customerAccountError,
} from '../src/utils/customerAccount';
import { customerAccountApi } from '../src/mocks/customerAccounts';
import { mockAdapter, resetMock } from '../src/mocks/adapter';
import { normalizeResponse } from '../src/services/api';
import { customerFromResponse } from '../../Customer/src/services/adapters.js';

const profile = { cName: 'Khách hàng đã sửa', phoneNumber: '0901234567', sex: 'M' };
const actions = ['edit-profile', 'reset-password'];
const request = (url, method = 'get', data = {}) =>
  mockAdapter({ url, method, data: JSON.stringify(data), headers: {} });
const login = (role) =>
  request('/auth/login', 'post', { email: role + '@cinema.test', password: 'Demo@12345' });
beforeEach(resetMock);

describe('Explicit customer account permissions', () => {
  for (const action of actions) {
    it(action + ' requires ADMIN and the exact server permission', () => {
      for (const role of ['STAFF', 'MANAGER', 'CUSTOMER'])
        expect(
          can(
            { role, permissions: ['*', 'customers:*', 'customers:' + action] },
            'customers',
            action,
          ),
        ).toBe(false);
      for (const permissions of [
        [],
        ['*'],
        ['customers:*'],
        ['customers:update'],
        ['customers:read'],
      ])
        expect(can({ role: 'ADMIN', permissions }, 'customers', action)).toBe(false);
      expect(
        can({ role: 'ADMIN', permissions: ['customers:' + action] }, 'customers', action),
      ).toBe(true);
    });
  }
  for (const role of ['staff', 'manager']) {
    it(role + ' cannot bypass UI/service checks via mock requests or forged identity', async () => {
      await login(role);
      for (const [suffix, method] of [
        ['profile', 'patch'],
        ['password-reset', 'post'],
      ])
        await expect(
          request('/customers/KH001/' + suffix, method, {
            ...profile,
            role: 'ADMIN',
            permissions: ['*'],
          }),
        ).rejects.toMatchObject({ response: { status: 403 } });
    });
  }
  it('mock handler denies missing permission even for ADMIN and denies anonymous requests', () => {
    const base = {
      db: { customers: [] },
      resource: 'customers',
      id: 'KH001',
      parts: ['customers', 'KH001', 'profile'],
      method: 'PATCH',
      body: profile,
      fail: (status) => {
        throw Object.assign(new Error('denied'), { status });
      },
    };
    expect(() => customerAccountApi({ ...base, session: null })).toThrow();
    for (const permissions of [[], ['*'], ['customers:update']]) {
      try {
        customerAccountApi({ ...base, session: { role: 'ADMIN', permissions } });
        throw new Error('unexpected access');
      } catch (error) {
        expect(error.status).toBe(403);
      }
    }
  });
});

describe('Customer profile boundary and shared account data', () => {
  it('updates allowed fields only; list/detail and Customer profile mapping read saved data without changing history', async () => {
    await login('admin');
    const before = (await request('/customers/KH001')).data.data;
    const orders = (await request('/orders')).data.data;
    const saved = (
      await request('/customers/KH001/profile', 'patch', {
        ...profile,
        cName: '  ' + profile.cName + '  ',
      })
    ).data.data;
    expect(saved).toMatchObject({
      ...profile,
      cUserId: before.cUserId,
      email: before.email,
      totalPoints: before.totalPoints,
      membershipTier: before.membershipTier,
    });
    expect(
      (await request('/customers')).data.data.find((row) => row.cUserId === before.cUserId),
    ).toMatchObject(saved);
    expect((await request('/customers/KH001')).data.data).toMatchObject(saved);
    expect((await request('/orders')).data.data).toEqual(orders);
    // Contract-level synchronization only; the PHP shared database is not in this workspace.
    const customer = customerFromResponse({ ...saved, role: 'CUSTOMER' });
    expect(customer).toMatchObject({
      userId: before.cUserId,
      fullName: profile.cName,
      phone: profile.phoneNumber,
      gender: profile.sex,
      email: before.email,
    });
    expect(customer).not.toHaveProperty('totalPoints');
  });
  for (const field of [
    'email',
    'cUserId',
    'id',
    'role',
    'userType',
    'permissions',
    'password',
    'passwordHash',
    'token',
    'birthday',
    'totalPoints',
    'membershipTier',
    'orders',
    'tickets',
    'payments',
    'isActive',
  ]) {
    it('rejects forbidden field ' + field + ' instead of mass assignment', async () => {
      await login('admin');
      const before = (await request('/customers/KH001')).data.data;
      const payload = { ...profile, [field]: 'tampered' };
      expect(() => validateMutation('/customers/KH001/profile', 'patch', payload)).toThrow();
      await expect(request('/customers/KH001/profile', 'patch', payload)).rejects.toMatchObject({
        response: { status: 422 },
      });
      expect((await request('/customers/KH001')).data.data).toEqual(before);
    });
  }
  it('validates required fields, length, phone and gender; rejects wrong methods and IDs', async () => {
    for (const patch of [
      { cName: ' ' },
      { cName: 'a'.repeat(101) },
      { phoneNumber: 'abc123' },
      { phoneNumber: '1'.repeat(16) },
      { sex: 'ADMIN' },
    ])
      expect(() => validateCustomerProfile({ ...profile, ...patch })).toThrow();
    await login('admin');
    await expect(request('/customers/unknown/profile', 'patch', profile)).rejects.toMatchObject({
      response: { status: 404 },
    });
    await expect(request('/customers/KH001/profile', 'put', profile)).rejects.toMatchObject({
      response: { status: 405 },
    });
    expect(() => validateMutation('/customers/KH001/profile', 'put', profile)).toThrow();
  });
  it('rejects missing/mismatched confirmation and removes sensitive response fields', () => {
    const row = { ...profile, cUserId: 'KH001', email: 'customer@example.test' };
    expect(() => customerProfileDto({}, 'KH001')).toThrow();
    expect(() => customerProfileDto(row, 'KH002')).toThrow();
    expect(
      customerProfileDto(
        { ...row, passwordHash: 'secret', password: 'secret', token: 'secret', permissions: ['*'] },
        'KH001',
      ),
    ).toEqual(row);
    for (const data of [
      { requested: true },
      { success: false, data: { requested: true } },
      { success: true },
    ])
      expect(() => normalizeResponse({ config: { requireSuccessEnvelope: true }, data })).toThrow();
  });
  it('retains activation/deactivation and transaction-safe deletion', async () => {
    await login('admin');
    await request('/customers/KH001/profile', 'patch', profile);
    await request('/customers/KH001/deactivate', 'patch');
    expect((await request('/customers/KH001')).data.data).toMatchObject({
      ...profile,
      isActive: false,
    });
    await request('/customers/KH001/activate', 'patch');
    expect((await request('/customers/KH001')).data.data.isActive).toBe(true);
    await expect(request('/customers/KH001', 'delete')).rejects.toMatchObject({
      response: { status: 409 },
    });
    const orders = (await request('/orders')).data.data;
    const created = (
      await request('/customers', 'post', {
        ...profile,
        email: 'unused@example.test',
        isActive: true,
      })
    ).data.data;
    await request('/customers/' + created.cUserId, 'delete');
    await expect(request('/customers/' + created.cUserId)).rejects.toMatchObject({
      response: { status: 404 },
    });
    expect((await request('/orders')).data.data).toEqual(orders);
  });
});

describe('Password reset requests', () => {
  it('simulates acknowledgement without credentials, mail or changing the account; rejects rapid repeats', async () => {
    await login('admin');
    const before = (await request('/customers/KH001')).data.data;
    expect((await request('/customers/KH001/password-reset', 'post')).data.data).toEqual({
      requested: true,
      simulated: true,
    });
    await expect(request('/customers/KH001/password-reset', 'post')).rejects.toMatchObject({
      response: { status: 429 },
    });
    expect((await request('/customers/KH001')).data.data).toEqual(before);
    await expect(
      request('/customers/KH002/password-reset', 'post', { email: 'attacker@example.test' }),
    ).rejects.toMatchObject({ response: { status: 422 } });
    expect(() =>
      validateMutation('/customers/KH001/password-reset', 'post', { password: 'fixed' }),
    ).toThrow();
  });
  it('rejects locked or unverified targets and uses a server-side cooldown', () => {
    const row = {
      ...profile,
      cUserId: 'KH001',
      email: 'c@example.test',
      isActive: true,
      emailVerified: false,
    };
    const ctx = {
      db: { customers: [row] },
      session: { id: 'NV001', role: 'ADMIN', permissions: ['customers:reset-password'] },
      resource: 'customers',
      id: row.cUserId,
      parts: ['customers', row.cUserId, 'password-reset'],
      method: 'POST',
      body: {},
      ok: (data) => data,
      fail: (status) => {
        throw Object.assign(new Error('failed'), { status });
      },
    };
    expect(() => customerAccountApi(ctx)).toThrow();
    row.emailVerified = true;
    expect(() => customerAccountApi(ctx)).toThrow();
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);
    row.isActive = false;
    try {
      expect(() => customerAccountApi(ctx)).toThrow();
    } finally {
      now.mockRestore();
    }
  });
  it('uses safe distinct error messages without leaking backend secrets', () => {
    const messages = new Set();
    for (const status of [400, 401, 403, 404, 409, 422, 429, 500]) {
      const error = customerAccountError({
        response: { status, data: { message: 'SECRET token=password-hash' } },
      });
      expect(error.status).toBe(status);
      expect(error.message).not.toContain('SECRET');
      messages.add(error.message);
    }
    expect(messages.size).toBe(8);
    expect(customerAccountError({ code: 'ERR_NETWORK' }).message).toContain('kết nối');
  });
});
