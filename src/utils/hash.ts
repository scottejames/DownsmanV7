import { createHash } from 'crypto';

export function hashPassword(password: string): string {
  return createHash('md5').update(password).digest('hex');
}
