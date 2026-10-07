export function validatePasswordPolicy(password: string): void {
  if ([...password].length < 12) {
    throw new Error('Password must contain at least 12 characters');
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Password must contain at most 72 bytes in UTF-8');
  }
}
