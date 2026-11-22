import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/services/api', () => ({ default: { patch: vi.fn(), post: vi.fn() } }));
import api from '../src/services/api';
import { customerService, passwordResetWait } from '../src/services/customerService';
import { useAuthStore } from '../src/stores/authStore';

const profile = { cName: 'Updated', phoneNumber: '0901234567', sex: 'F' };
const row = { cUserId: 'KH001', email: 'customer@example.test', ...profile };
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-14T00:00:00Z'));
  useAuthStore.getState().logout();
  useAuthStore.getState().setUser({
    id: 'NV001',
    role: 'ADMIN',
    permissions: ['customers:edit-profile', 'customers:reset-password'],
  });
});
afterEach(() => vi.useRealTimers());

describe('Customer service authorization and payload boundary', () => {
  for (const user of [
    { role: 'STAFF', permissions: ['customers:edit-profile', 'customers:reset-password'] },
    { role: 'MANAGER', permissions: ['*', 'customers:edit-profile', 'customers:reset-password'] },
    { role: 'ADMIN', permissions: ['*', 'customers:update'] },
    { role: 'ADMIN', permissions: [] },
  ])
    it('blocks requests for ' + user.role + ' ' + user.permissions.join(','), async () => {
      useAuthStore.getState().setUser({ id: 'NV002', ...user });
      await expect(customerService.updateProfile('KH001', profile)).rejects.toMatchObject({
        status: 403,
      });
      await expect(customerService.requestPasswordReset('KH001')).rejects.toMatchObject({
        status: 403,
      });
      expect(api.patch).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    });
  it('sends the exact allowlist to the encoded ID and returns only safe saved fields', async () => {
    api.patch.mockResolvedValue({ data: { ...row, cUserId: 'KH/001', passwordHash: 'SECRET' } });
    const saved = await customerService.updateProfile('KH/001', profile);
    expect(api.patch).toHaveBeenCalledWith('/customers/KH%2F001/profile', profile, {
      requireSuccessEnvelope: true,
    });
    expect(saved).not.toHaveProperty('passwordHash');
    await expect(
      customerService.updateProfile('KH001', { ...profile, email: 'attacker@test' }),
    ).rejects.toThrow();
    expect(api.patch).toHaveBeenCalledTimes(1);
  });
  it('does not accept an empty response or another account', async () => {
    for (const data of [{}, { ...row, cUserId: 'KH002' }]) {
      api.patch.mockResolvedValue({ data });
      await expect(customerService.updateProfile('KH001', profile)).rejects.toThrow();
    }
  });
  for (const status of [400, 401, 403, 404, 409, 422, 429, 500])
    it('preserves HTTP status ' + status + ' without backend secret messages', async () => {
      api.patch.mockRejectedValue({ response: { status, data: { message: 'SECRET' } } });
      await expect(customerService.updateProfile('KH001', profile)).rejects.toMatchObject({
        status,
      });
      await expect(customerService.updateProfile('KH001', profile)).rejects.not.toThrow('SECRET');
    });
});

describe('Password reset acknowledgement and throttling', () => {
  it('sends no password/email/token, requires requested:true, and throttles across modal reopen', async () => {
    api.post.mockResolvedValue({ data: { requested: true, token: 'SECRET' } });
    await expect(customerService.requestPasswordReset('KH001')).resolves.toEqual({
      requested: true,
    });
    expect(api.post).toHaveBeenCalledWith(
      '/customers/KH001/password-reset',
      {},
      { requireSuccessEnvelope: true },
    );
    expect(passwordResetWait('KH001')).toBe(60);
    await expect(customerService.requestPasswordReset('KH001')).rejects.toMatchObject({
      status: 429,
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60001);
    await expect(customerService.requestPasswordReset('KH001')).resolves.toEqual({
      requested: true,
    });
  });
  it('blocks concurrent sends even after cooldown expires and respects Retry-After', async () => {
    let reject;
    api.post.mockImplementation(
      () =>
        new Promise((resolve, fail) => {
          reject = fail;
        }),
    );
    const first = customerService.requestPasswordReset('KH001');
    const assertion = expect(first).rejects.toMatchObject({ status: 429 });
    vi.advanceTimersByTime(61000);
    await expect(customerService.requestPasswordReset('KH001')).rejects.toMatchObject({
      status: 429,
    });
    reject({ response: { status: 429, headers: { 'retry-after': '120' } } });
    await assertion;
    expect(passwordResetWait('KH001')).toBe(120);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it.each([{}, { requested: false }, { requested: 'true' }])(
    'never reports success for invalid acknowledgement %j',
    async (data) => {
      api.post.mockResolvedValue({ data });
      await expect(customerService.requestPasswordReset('KH001')).rejects.toMatchObject({
        status: 502,
      });
    },
  );
});
