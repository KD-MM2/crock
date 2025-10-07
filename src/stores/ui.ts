import { create } from 'zustand';
import type { UiState } from '@/types/ui';

type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;

export type UiStore = UiState & {
  openHistory: () => void;
  closeHistory: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setTheme: (theme: UiState['theme']) => void;
  setActiveTransferId: (id?: string) => void;
};

const initialState: UiState = {
  dialogs: {
    historyOpen: false,
    settingsOpen: false
  },
  theme: 'system'
};

export const useUiStore = create<UiStore>((set: SetState<UiStore>) => ({
  ...initialState,
  openHistory: () => set((state: UiStore) => ({ dialogs: { ...state.dialogs, historyOpen: true } })),
  closeHistory: () => set((state: UiStore) => ({ dialogs: { ...state.dialogs, historyOpen: false } })),
  openSettings: () => set((state: UiStore) => ({ dialogs: { ...state.dialogs, settingsOpen: true } })),
  closeSettings: () => set((state: UiStore) => ({ dialogs: { ...state.dialogs, settingsOpen: false } })),
  setTheme: (theme: UiState['theme']) => set({ theme }),
  setActiveTransferId: (id?: string) => set({ activeTransferId: id })
}));
