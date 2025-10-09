import type { CurveName } from '@/types/settings';

export const DEFAULT_RELAY_HOST = 'croc.schollz.com:9009';
export const DEFAULT_CURVE: CurveName = 'p256';

export function normalizeRelayHost(value: string): string {
  return value.trim().toLowerCase();
}
