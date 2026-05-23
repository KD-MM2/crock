import Store from 'electron-store';
import type { HistoryRecord } from '../types/history';

export type HistoryStoreOptions = {
  maxLogLines?: number;
  retentionDays?: number;
};

type PersistedSchema = {
  records: HistoryRecord[];
};

const DEFAULT_OPTIONS: HistoryStoreOptions = {
  maxLogLines: 200,
  retentionDays: 30
};

export class HistoryStore {
  private readonly store: Store<PersistedSchema>;
  private options: HistoryStoreOptions;
  private recordsCache: HistoryRecord[];

  constructor(options: HistoryStoreOptions = DEFAULT_OPTIONS) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.store = new Store<PersistedSchema>({
      name: 'history',
      defaults: { records: [] }
    });
    this.recordsCache = this.store.get('records') ?? [];
  }

  configure(options: Partial<HistoryStoreOptions>) {
    this.options = { ...this.options, ...options };
  }

  list(): HistoryRecord[] {
    return this.recordsCache;
  }

  get(id: string): HistoryRecord | undefined {
    return this.recordsCache.find((record) => record.id === id);
  }

  add(record: HistoryRecord): void {
    this.recordsCache = [record, ...this.recordsCache];
    this.store.set('records', this.recordsCache);
    this.applyRetention();
  }

  update(id: string, patch: Partial<HistoryRecord>): HistoryRecord | undefined {
    let updated: HistoryRecord | undefined;
    this.recordsCache = this.recordsCache.map((record) => {
      if (record.id !== id) return record;
      updated = { ...record, ...patch };
      return updated;
    });
    this.store.set('records', this.recordsCache);
    return updated;
  }

  appendLog(id: string, line: string): void {
    const record = this.recordsCache.find((r) => r.id === id);
    if (!record) return;
    const maxLines = this.options.maxLogLines ?? DEFAULT_OPTIONS.maxLogLines!;
    const logTail = [...(record.logTail ?? []), line].slice(-maxLines);
    record.logTail = logTail;
    this.store.set('records', this.recordsCache);
  }

  clear(): void {
    this.recordsCache = [];
    this.store.set('records', []);
  }

  export(): string {
    return JSON.stringify(this.recordsCache, null, 2);
  }

  pruneRetention(retentionDays?: number): void {
    const days = retentionDays ?? this.options.retentionDays ?? DEFAULT_OPTIONS.retentionDays!;
    if (!days) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    this.recordsCache = this.recordsCache.filter((record) => (record.finishedAt ?? record.createdAt) >= cutoff);
    this.store.set('records', this.recordsCache);
  }

  private applyRetention() {
    this.pruneRetention();
  }
}
