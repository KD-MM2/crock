import type { CurveName } from '@/types/settings';

export const DEFAULT_RELAY_HOST = 'croc.schollz.com:9009';
export const DEFAULT_CURVE: CurveName = 'p256';

export function normalizeRelayHost(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * True when the renderer runs on Windows. croc only accepts a custom code
 * phrase via `--code` on Windows; on Unix it must be passed through the
 * CROC_SECRET environment variable (KD-MM2/crock#3).
 */
export function isWindowsRuntime(): boolean {
  if (typeof navigator === 'undefined') return false;
  const withUaData = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = `${withUaData.userAgentData?.platform ?? navigator.platform ?? ''}`.toLowerCase();
  return platform.includes('win');
}
