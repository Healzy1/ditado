import { SetMetadata } from '@nestjs/common';

export type RateLimitKind =
  'login' | 'register' | 'forgot-password' | 'reset-password' | 'transcription';
export const RATE_LIMIT_KIND = 'rate-limit-kind';

export const RateLimit = (kind: RateLimitKind) =>
  SetMetadata(RATE_LIMIT_KIND, kind);
