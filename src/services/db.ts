import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'restmanager_local';
const DB_VERSION = 1;

export const dbLocal = {
  getDb: async (): Promise<IDBPDatabase> => {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Core state storage
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state');
        }
        // Audit log of transactions for P2P reconciliation
        if (!db.objectStoreNames.contains('ledger')) {
          db.createObjectStore('ledger', { keyPath: 'id' });
        }
      },
    });
  },

  set: async (key: string, val: any) => {
    const db = await dbLocal.getDb();
    return db.put('state', val, key);
  },

  get: async (key: string) => {
    const db = await dbLocal.getDb();
    return db.get('state', key);
  },

  addToLedger: async (entry: any) => {
    const db = await dbLocal.getDb();
    return db.put('ledger', {
      ...entry,
      id: entry.id || Date.now().toString(),
      synced: false
    });
  }
};
