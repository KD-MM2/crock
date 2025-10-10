import { create } from 'zustand';
import type { UiState } from '@/types/ui';

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

export const useUiStore = create<UiStore>((set) => ({
  ...initialState,
  openHistory: () => set((state) => ({ dialogs: { ...state.dialogs, historyOpen: true } })),
  closeHistory: () => set((state) => ({ dialogs: { ...state.dialogs, historyOpen: false } })),
  openSettings: () => set((state) => ({ dialogs: { ...state.dialogs, settingsOpen: true } })),
  closeSettings: () => set((state) => ({ dialogs: { ...state.dialogs, settingsOpen: false } })),
  setTheme: (theme: UiState['theme']) => set({ theme }),
  setActiveTransferId: (id?: string) => set({ activeTransferId: id })
}));
