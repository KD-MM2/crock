import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import { getWindowApi } from '@/lib/window-api';
import type { HistoryFilter, HistoryRecord } from '@/types/history';

export type HistoryStoreState = {
  records: HistoryRecord[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  filters: HistoryFilter;
  selectedId?: string;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: Partial<HistoryFilter>) => void;
  select: (id?: string) => void;
  clearAll: () => Promise<void>;
  exportAll: () => Promise<HistoryRecord[]>;
};

const defaultFilters: HistoryFilter = {
  type: 'all',
  status: 'all',
  search: ''
};

const matchesFilters = (record: HistoryRecord, filters: HistoryFilter) => {
  if (filters.type !== 'all' && record.type !== filters.type) return false;
  if (filters.status !== 'all' && record.status !== filters.status) return false;
  if (filters.search) {
    const keyword = filters.search.toLowerCase();
    const haystack = [record.code, record.relay, record.files?.map((file) => file.name).join(' ')].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(keyword)) return false;
  }
  return true;
};

const createHistoryStore: StateCreator<HistoryStoreState> = (set, _get) => {
  void _get;
  return {
    records: [],
    status: 'idle',
    error: undefined,
    filters: defaultFilters,
    selectedId: undefined,
    load: async () => {
      set({ status: 'loading', error: undefined });
      try {
        const api = getWindowApi();
        const records = await api.history.list();
        set({ records, status: 'ready' });
      } catch (error) {
        console.error('[historyStore] load failed', error);
        set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
    refresh: async () => {
      try {
        const api = getWindowApi();
        const records = await api.history.list();
        set({ records, status: 'ready' });
      } catch (error) {
        console.error('[historyStore] refresh failed', error);
        set({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
    setFilters: (filters) =>
      set((state) => ({
        filters: { ...state.filters, ...filters }
      })),
    select: (id) => set({ selectedId: id }),
    clearAll: async () => {
      try {
        const api = getWindowApi();
        await api.history.clear();
        set({ records: [], selectedId: undefined });
      } catch (error) {
        console.error('[historyStore] clear failed', error);
        set({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
    exportAll: async () => {
      try {
        const api = getWindowApi();
        const exported = await api.history.export();
        return exported;
      } catch (error) {
        console.error('[historyStore] export failed', error);
        throw error;
      }
    }
  };
};

export const useHistoryStore = create<HistoryStoreState>(createHistoryStore);

export const selectFilteredHistory = (state: HistoryStoreState) => state.records.filter((record) => matchesFilters(record, state.filters));
