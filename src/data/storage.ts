export interface DataSyncAdapter {
  load<T>(key: string, fallback: T): T;
  save<T>(key: string, value: T): void;
}

export const localDataSync: DataSyncAdapter = {
  load<T>(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  save<T>(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage failures should not interrupt POS transactions.
    }
  },
};
