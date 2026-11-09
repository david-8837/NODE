import { describe, expect, it } from 'vitest';
import { isTrustedLocalNativeOrigin } from '../src/nativeActionSecurity';

describe('native-action origin policy', () => {
  it.each([
    ['http://localhost:5173', 'localhost:5173'],
    ['http://127.0.0.1:5173', '127.0.0.1:5173'],
    ['http://[::1]:5173', '[::1]:5173'],
    ['http://localhost:5173/settings', 'localhost:5173'],
  ])('allows same-origin loopback requests (%s)', (origin, host) => {
    expect(isTrustedLocalNativeOrigin(origin, host, false)).toBe(true);
  });

  it.each([
    ['https://localhost:5173', 'localhost:5173'],
    ['http://localhost:5174', 'localhost:5173'],
    ['http://localhost.evil.test:5173', 'localhost.evil.test:5173'],
    ['http://127.0.0.1:5173', 'localhost:5173'],
    ['http://user@localhost:5173', 'localhost:5173'],
    ['https://evil.test', 'evil.test'],
  ])('rejects untrusted or mismatched origins (%s)', (origin, host) => {
    expect(isTrustedLocalNativeOrigin(origin, host, false)).toBe(false);
  });

  it('rejects absent, malformed, or empty headers', () => {
    expect(isTrustedLocalNativeOrigin(undefined, 'localhost:5173', false)).toBe(false);
    expect(isTrustedLocalNativeOrigin('not a URL', 'localhost:5173', false)).toBe(false);
    expect(isTrustedLocalNativeOrigin('http://localhost:5173', undefined, false)).toBe(false);
    expect(isTrustedLocalNativeOrigin([], 'localhost:5173', false)).toBe(false);
  });

  it('denies hosted-preview requests even when they forge loopback headers', () => {
    expect(
      isTrustedLocalNativeOrigin('http://localhost:5173', 'localhost:5173', true)
    ).toBe(false);
  });
});
