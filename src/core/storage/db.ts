export const DB_NAME = 'pos_universal_db';
export const DB_VERSION = 2;

export const STORAGE_STORES = ['sales', 'products', 'customers', 'orders', 'inventory'] as const;
export type StorageStoreName = (typeof STORAGE_STORES)[number];

