import type { WindowApi } from '@/types/ipc';
import { createMockWindowApi } from './window-api.mock';

let cachedApi: WindowApi | null = null;

export function getWindowApi(): WindowApi {
  if (typeof window === 'undefined') throw new Error('window is undefined');

  if (!cachedApi) {
    cachedApi = window.api ?? createMockWindowApi();
  }

  return cachedApi;
}



