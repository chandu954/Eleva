import { describe, expect, it } from 'vitest';
import { getSafeNextPath } from '@/app/eleva/_lib/auth-redirect';

describe('getSafeNextPath', () => {
  it('defaults to the Eleva dashboard when no path is given', () => {
    expect(getSafeNextPath(null)).toBe('/eleva/dashboard');
    expect(getSafeNextPath('')).toBe('/eleva/dashboard');
  });

  it('accepts internal Eleva paths', () => {
    expect(getSafeNextPath('/eleva/dashboard')).toBe('/eleva/dashboard');
    expect(getSafeNextPath('/eleva/studio')).toBe('/eleva/studio');
    expect(getSafeNextPath('/eleva/ats')).toBe('/eleva/ats');
    expect(getSafeNextPath('/eleva')).toBe('/eleva');
  });

  it('rejects non-Eleva paths', () => {
    expect(getSafeNextPath('/home')).toBe('/eleva/dashboard');
    expect(getSafeNextPath('/auth/login')).toBe('/eleva/dashboard');
    expect(getSafeNextPath('/')).toBe('/eleva/dashboard');
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(getSafeNextPath('https://evil.example')).toBe('/eleva/dashboard');
    expect(getSafeNextPath('//evil.example')).toBe('/eleva/dashboard');
    expect(getSafeNextPath('/https://evil.example')).toBe('/eleva/dashboard');
    expect(getSafeNextPath('javascript:alert(1)')).toBe('/eleva/dashboard');
  });
});
