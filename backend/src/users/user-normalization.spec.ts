import { isEmail, normalizeEmail, normalizeName } from './user-normalization';

describe('user normalization', () => {
  it('removes only external whitespace from names', () => {
    expect(normalizeName('  Maria  da Silva  ')).toBe('Maria  da Silva');
  });

  it('normalizes email before validation and comparison', () => {
    expect(normalizeEmail('  Maria@Example.TEST  ')).toBe('maria@example.test');
    expect(isEmail(normalizeEmail('  Maria@Example.TEST  '))).toBe(true);
  });

  it('rejects invalid normalized email values', () => {
    expect(isEmail(normalizeEmail('not-an-email'))).toBe(false);
  });
});
