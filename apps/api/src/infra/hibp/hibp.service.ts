import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

/**
 * Have I Been Pwned k-anonymity password lookup.
 *
 * We sha1 the password locally, send only the first 5 hex chars to HIBP, and
 * scan the response for the remaining 35 chars. The plaintext password never
 * leaves this process. See https://haveibeenpwned.com/API/v3#PwnedPasswords.
 *
 * In dev / when HIBP is unreachable we fail-open (return 0) so signup still
 * works. In prod the recommended threshold is `breachCount > 5` — so a long
 * password that's appeared a few times in a wordlist still flies, but
 * "password123" (millions of breaches) is blocked.
 */
@Injectable()
export class HibpService {
  private readonly logger = new Logger(HibpService.name);

  constructor(private readonly config: ConfigService) {}

  /** Returns the number of breach appearances. 0 = safe (or HIBP unreachable). */
  async breachCount(password: string): Promise<number> {
    if (this.config.get<string>('HIBP_ENABLED') === 'false') {
      return 0;
    }

    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3_000);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true', 'User-Agent': 'outflow-api/1.0' },
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));

      if (!res.ok) {
        this.logger.warn(`HIBP returned ${res.status}; failing open`);
        return 0;
      }

      const body = await res.text();
      for (const line of body.split('\n')) {
        const [hashSuffix, countStr] = line.trim().split(':');
        if (!hashSuffix || !countStr) continue;
        if (hashSuffix.toUpperCase() === suffix) {
          return Number(countStr) || 0;
        }
      }
      return 0;
    } catch (err) {
      this.logger.warn({ err }, 'HIBP lookup failed; failing open');
      return 0;
    }
  }

  /** Hard threshold used during signup + password reset. */
  async assertNotBreached(password: string, threshold = 5): Promise<void> {
    const count = await this.breachCount(password);
    if (count > threshold) {
      // Use a generic Error here; controllers map to BadRequest
      const e = new Error(
        'This password has appeared in a known data breach. Choose a different one.',
      );
      (e as Error & { code?: string }).code = 'PASSWORD_BREACHED';
      throw e;
    }
  }
}
