import { Injectable } from '@nestjs/common';

interface Counter {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly counters = new Map<string, Counter>();

  consume(key: string, max: number, windowSeconds: number): number | null {
    const now = Date.now();
    const existing = this.counters.get(key);
    const counter =
      existing && existing.expiresAt > now
        ? existing
        : { count: 0, expiresAt: now + windowSeconds * 1000 };

    if (counter.count >= max) {
      return Math.max(1, Math.ceil((counter.expiresAt - now) / 1000));
    }

    counter.count += 1;
    this.counters.set(key, counter);
    return null;
  }
}
