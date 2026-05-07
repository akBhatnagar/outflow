import { ConfigService } from '@nestjs/config';

import { HibpService } from './hibp.service';

const fakeConfig = (overrides: Record<string, string> = {}): ConfigService =>
  ({
    get: (k: string) => overrides[k],
  }) as unknown as ConfigService;

describe('HibpService', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns the breach count for a known-pwned password', async () => {
    // sha1('password') = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // prefix=5BAA6, suffix=1E4C9B93F3F0682250B6CF8331B7EE68FD8
    const body =
      '0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9999999\r\n';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => body,
    }) as unknown as typeof fetch;

    const svc = new HibpService(fakeConfig());
    expect(await svc.breachCount('password')).toBe(9999999);
  });

  it('returns 0 when the password is not in the response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '0018A45C4D1DEF81644B54AB7F969B88D65:1',
    }) as unknown as typeof fetch;

    const svc = new HibpService(fakeConfig());
    expect(await svc.breachCount('a-fresh-strong-password-2026')).toBe(0);
  });

  it('fails open (returns 0) when HIBP is unreachable', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const svc = new HibpService(fakeConfig());
    expect(await svc.breachCount('any')).toBe(0);
  });

  it('honours HIBP_ENABLED=false and skips the lookup entirely', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const svc = new HibpService(fakeConfig({ HIBP_ENABLED: 'false' }));
    expect(await svc.breachCount('password')).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws PASSWORD_BREACHED when over threshold', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '1E4C9B93F3F0682250B6CF8331B7EE68FD8:99\r\n',
    }) as unknown as typeof fetch;

    const svc = new HibpService(fakeConfig());
    await expect(svc.assertNotBreached('password', 5)).rejects.toMatchObject({
      code: 'PASSWORD_BREACHED',
    });
  });
});
