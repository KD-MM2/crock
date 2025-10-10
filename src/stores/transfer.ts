import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import type { TransferProgress, TransferSession } from '@/types/transfer';

type TransferSessions = Record<string, TransferSession>;

export type TransferStoreState = {
  sessions: TransferSessions;
  activeTransferId?: string;
  upsertSession: (session: TransferSession) => void;
  updateProgress: (progress: TransferProgress) => void;
  finalizeSession: (id: string, patch: Partial<TransferSession>) => void;
  appendLog: (id: string, entry: TransferSession['logTail'][number]) => void;
  removeSession: (id: string) => void;
  reset: () => void;
};

const createTransferStore: StateCreator<TransferStoreState> = (set) => ({
  sessions: {},
  activeTransferId: undefined,
  upsertSession: (session: TransferSession) =>
    set((state) => ({
      activeTransferId: session.id,
      sessions: {
        ...state.sessions,
        [session.id]: session
      }
    })),
  updateProgress: (progress: TransferProgress) =>
    set((state) => {
      const existing = state.sessions[progress.id];
      if (!existing) {
        return {
          activeTransferId: progress.id,
          sessions: {
            ...state.sessions,
            [progress.id]: {
              id: progress.id,
              type: progress.type,
              mode: undefined,
              phase: progress.phase,
              percent: progress.percent ?? 0,
              speed: progress.speed,
              eta: progress.eta,
              code: progress.code,
              targetAddress: progress.targetAddress,
              sizeTransferred: progress.sizeTransferred,
              sizeTotal: progress.sizeTotal,
              bytesTransferred: progress.bytesTransferred,
              bytesTotal: progress.bytesTotal,
              startedAt: Date.now(),
              logTail: []
            }
          }
        };
      }

      const next: TransferSession = {
        ...existing,
        phase: progress.phase,
        percent: progress.percent ?? existing.percent,
        speed: progress.speed ?? existing.speed,
        eta: progress.eta ?? existing.eta,
        code: progress.code ?? existing.code,
        targetAddress: progress.targetAddress ?? existing.targetAddress,
        sizeTransferred: progress.sizeTransferred ?? existing.sizeTransferred,
        sizeTotal: progress.sizeTotal ?? existing.sizeTotal,
        bytesTransferred: progress.bytesTransferred ?? existing.bytesTransferred,
        bytesTotal: progress.bytesTotal ?? existing.bytesTotal,
        logTail: existing.logTail
      };

      return {
        activeTransferId: progress.id,
        sessions: {
          ...state.sessions,
          [progress.id]: next
        }
      };
    }),
  finalizeSession: (id: string, patch: Partial<TransferSession>) =>
    set((state) => {
      const existing = state.sessions[id];
      if (!existing) return state;
      const next: TransferSession = {
        ...existing,
        ...patch,
        finishedAt: patch.finishedAt ?? Date.now()
      };
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [id]: next
        }
      };
    }),
  appendLog: (id: string, entry: TransferSession['logTail'][number]) =>
    set((state) => {
      const existing = state.sessions[id];
      if (!existing) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [id]: {
            ...existing,
            logTail: [...existing.logTail.slice(-199), entry]
          }
        }
      };
    }),
  removeSession: (id: string) =>
    set((state) => {
      const { [id]: removed, ...rest } = state.sessions;
      void removed;
      const nextActive = state.activeTransferId === id ? undefined : state.activeTransferId;
      return {
        activeTransferId: nextActive,
        sessions: rest
      };
    }),
  reset: () => set({ sessions: {}, activeTransferId: undefined })
});

export const useTransferStore = create<TransferStoreState>(createTransferStore);
