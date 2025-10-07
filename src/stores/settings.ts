import { create } from 'zustand';
import type { SettingsState, ConnectionStatus } from '@/types/settings';
import type { SetStateAction } from 'react';
import { getWindowApi } from '@/lib/window-api';

type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;

type GetState<T> = () => T;

type StoreInitializer<T> = (set: SetState<T>, get: GetState<T>) => T;

export type SettingsStoreState = {
  settings: SettingsState | null;
  draft: SettingsState | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  connectionStatus: ConnectionStatus | null;
  loadingConnection: boolean;
  load: () => Promise<void>;
  setDraft: (action: SetStateAction<SettingsState | null>) => void;
  save: () => Promise<void>;
  patch: (partial: Partial<SettingsState>) => Promise<void>;
  refreshConnectionStatus: () => Promise<void>;
  resetDraft: () => void;
};

function applyAction<T>(value: T, action: SetStateAction<T>): T {
  return typeof action === 'function' ? (action as (prev: T) => T)(value) : action;
}

const createSettingsStore: StoreInitializer<SettingsStoreState> = (set, get) => ({
  settings: null,
  draft: null,
  status: 'idle',
  error: undefined,
  connectionStatus: null,
  loadingConnection: false,
  load: async () => {
    set({ status: 'loading', error: undefined });
    try {
      const api = getWindowApi();
      const result = await api.settings.get();
      set({ settings: result, draft: result, status: 'ready' });
    } catch (error) {
      console.error('[settingsStore] load failed', error);
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
  setDraft: (action) =>
    set((state: SettingsStoreState) => ({
      draft: state.draft ? applyAction(state.draft, action) : state.draft
    })),
  save: async () => {
    const draft = get().draft;
    if (!draft) return;
    set({ status: 'loading', error: undefined });
    try {
      const api = getWindowApi();
      const validation = await api.settings.validate(draft);
      if (!validation.valid) {
        set({ status: 'error', error: 'Thiết lập không hợp lệ' });
        return;
      }
      const saved = await api.settings.set(draft);
      set({ settings: saved, draft: saved, status: 'ready' });
    } catch (error) {
      console.error('[settingsStore] save failed', error);
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
  patch: async (partial) => {
    try {
      const api = getWindowApi();
      const next = await api.settings.set(partial);
      set({ settings: next, draft: next, status: 'ready' });
    } catch (error) {
      console.error('[settingsStore] patch failed', error);
      set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
  refreshConnectionStatus: async () => {
    set({ loadingConnection: true });
    try {
      const api = getWindowApi();
      const status = await api.settings.connectionStatus();
      set({ connectionStatus: status, loadingConnection: false });
    } catch (error) {
      console.error('[settingsStore] refresh connection failed', error);
      set({ loadingConnection: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
  resetDraft: () =>
    set((state: SettingsStoreState) => ({
      draft: state.settings
    }))
});

export const useSettingsStore = create<SettingsStoreState>(createSettingsStore);
