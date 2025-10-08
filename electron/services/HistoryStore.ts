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

  constructor(options: HistoryStoreOptions = DEFAULT_OPTIONS) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.store = new Store<PersistedSchema>({
      name: 'history',
      defaults: { records: [] }
    });
  }

  configure(options: Partial<HistoryStoreOptions>) {
    this.options = { ...this.options, ...options };
  }

  list(): HistoryRecord[] {
    return [...(this.store.get('records') ?? [])];
  }

  get(id: string): HistoryRecord | undefined {
    return this.list().find((record) => record.id === id);
  }

  add(record: HistoryRecord): void {
    const records = this.list();
    const next = [record, ...records];
    this.store.set('records', next);
    this.applyRetention();
  }

  update(id: string, patch: Partial<HistoryRecord>): HistoryRecord | undefined {
    const records = this.list();
    const next = records.map((record) => {
      if (record.id !== id) return record;
      return { ...record, ...patch };
    });
    this.store.set('records', next);
    return next.find((record) => record.id === id);
  }

  appendLog(id: string, line: string): void {
    const record = this.get(id);
    if (!record) return;
    const maxLines = this.options.maxLogLines ?? DEFAULT_OPTIONS.maxLogLines!;
    const logTail = [...(record.logTail ?? []), line].slice(-maxLines);
    this.update(id, { logTail });
  }

  clear(): void {
    this.store.set('records', []);
  }

  export(): string {
    const records = this.list();
    return JSON.stringify(records, null, 2);
  }

  pruneRetention(retentionDays?: number): void {
    const days = retentionDays ?? this.options.retentionDays ?? DEFAULT_OPTIONS.retentionDays!;
    if (!days) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = this.list().filter((record) => (record.finishedAt ?? record.createdAt) >= cutoff);
    this.store.set('records', filtered);
  }

  private applyRetention() {
    this.pruneRetention();
  }
}
