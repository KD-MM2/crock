import type { SetStateAction } from 'react';
import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { getWindowApi } from '@/lib/window-api';
import type { ConnectionStatus, SettingsState } from '@/types/settings';

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
  refreshConnectionStatus: () => Promise<ConnectionStatus | null>;
  updateRelayStatus: (payload: { host?: string; latencyMs?: number; online?: boolean; checkedAt?: number; ipv6?: boolean; port?: number }) => void;
  resetDraft: () => void;
};

function applyAction<T>(value: T, action: SetStateAction<T>): T {
  return typeof action === 'function' ? (action as (prev: T) => T)(value) : action;
}

const createSettingsStore: StateCreator<SettingsStoreState> = (set, get) => ({
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
    set((state) => ({
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
      return status;
    } catch (error) {
      console.error('[settingsStore] refresh connection failed', error);
      set({ loadingConnection: false, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },
  updateRelayStatus: (payload) =>
    set((state) => {
      const base: ConnectionStatus = state.connectionStatus ?? {
        relay: {
          host: payload.host,
          online: payload.online ?? false,
          latencyMs: payload.latencyMs,
          checkedAt: payload.checkedAt ?? Date.now(),
          ipv6: payload.ipv6,
          port: payload.port
        },
        proxy: {},
        croc: { installed: false }
      };

      const updatedRelay = {
        ...base.relay,
        host: payload.host ?? base.relay.host,
        latencyMs: payload.latencyMs ?? base.relay.latencyMs,
        online: payload.online ?? base.relay.online,
        checkedAt: payload.checkedAt ?? Date.now(),
        ipv6: payload.ipv6 ?? base.relay.ipv6,
        port: payload.port ?? base.relay.port
      };

      return {
        connectionStatus: {
          ...base,
          relay: updatedRelay
        }
      };
    }),
  resetDraft: () =>
    set((state) => ({
      draft: state.settings
    }))
});

export const useSettingsStore = create<SettingsStoreState>(createSettingsStore);
