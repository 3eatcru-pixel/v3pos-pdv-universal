import { IDBPDatabase, openDB } from 'idb';
import { DB_NAME, DB_VERSION, STORAGE_STORES, StorageStoreName } from '../db';

type StoreEntity = { id: string };

class IndexedDBAdapter {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private getDb() {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          for (const storeName of STORAGE_STORES) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: 'id' });
            }
          }
        },
      });
    }
    return this.dbPromise;
  }

  async add<T extends StoreEntity>(store: StorageStoreName, value: T): Promise<T> {
    const db = await this.getDb();
    await db.add(store, value);
    return value;
  }

  async update<T extends StoreEntity>(store: StorageStoreName, value: T): Promise<T> {
    const db = await this.getDb();
    await db.put(store, value);
    return value;
  }

  async get<T extends StoreEntity>(store: StorageStoreName, id: string): Promise<T | undefined> {
    const db = await this.getDb();
    const result = await db.get(store, id);
    return result as T | undefined;
  }

  async getAll<T extends StoreEntity>(store: StorageStoreName): Promise<T[]> {
    const db = await this.getDb();
    const result = await db.getAll(store);
    return result as T[];
  }

  async delete(store: StorageStoreName, id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(store, id);
  }
}

export const indexedDBAdapter = new IndexedDBAdapter();

