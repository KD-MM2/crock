import type { WindowApi } from '@/types/ipc';

let cachedApi: WindowApi | null = null;

export function getWindowApi(): WindowApi {
  if (typeof window === 'undefined') throw new Error('window is undefined');
  if (!window.api) {
    throw new Error('window.api is not available. Ensure the preload script is loaded.');
  }
  if (!cachedApi) {
    cachedApi = window.api;
  }
  return cachedApi;
}

export const api: WindowApi = typeof window !== 'undefined' && window.api ? window.api : ({} as WindowApi);
