export const DB_NAME = 'pos_universal_db';
export const DB_VERSION = 1;

export const STORAGE_STORES = ['sales', 'products', 'customers'] as const;
export type StorageStoreName = (typeof STORAGE_STORES)[number];

