import type { CrocCapabilities } from '../types/capabilities';

/**
 * Hard-coded capabilities for croc v10.2.5
 * Based on the help output from croc v10.2.5
 *
 * These capabilities are compatible with croc v10.x and later versions.
 * If you need to support older versions, you may need to implement
 * dynamic capability detection again.
 */
export const CROC_CAPABILITIES: CrocCapabilities = {
  socks5: true,
  curve: true,
  throttleUpload: true,
  internalDns: true,
  local: true,
  relay6: true,
  out: true,
  text: true,
  exclude: true,
  overwrite: true,
  yes: true,
  crocSecretEnv: undefined // Not mentioned in croc v10.2.5 help output
};

/**
 * Get the hard-coded capabilities for the current croc version.
 * This is a synchronous operation that returns immediately.
 */
export function getCapabilities(): CrocCapabilities {
  return { ...CROC_CAPABILITIES };
}
