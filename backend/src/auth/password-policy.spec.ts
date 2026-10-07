import { validatePasswordPolicy } from './password-policy';

describe('validatePasswordPolicy', () => {
  it('accepts permitted passwords without category requirements', () => {
    expect(() => validatePasswordPolicy('            ')).not.toThrow();
  });

  it('rejects passwords shorter than 12 characters', () => {
    expect(() => validatePasswordPolicy('short')).toThrow('at least 12');
  });

  it('rejects passwords larger than 72 UTF-8 bytes', () => {
    expect(() => validatePasswordPolicy('á'.repeat(37))).toThrow('72 bytes');
  });
});
