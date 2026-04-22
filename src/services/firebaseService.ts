import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { authService } from '../auth/authService';
import { 
  Staff, 
  Shop, 
  Product, 
  Order, 
  Table, 
  InventoryItem, 
  Shift, 
  Reservation,
  Printer,
  IncidentReport,
  AppNotification,
  RolePermissions,
  Enterprise
} from '../types';

import { dataPipeline } from './dataPipeline';

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied') {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || 'none',
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || true,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    
    // Graceful handling for anonymous users fetching global or restricted collections on start
    const nonCriticalCollections = [
      'businessConfigs', 
      'enterprises', 
      'rolePermissions', 
      'shops', 
      'staff', 
      'staffSchedules',
      'products',
      'tables',
      'orders',
      'inventory',
      'notifications',
      'incidentReports',
      'reservations',
      'printers',
      'shifts'
    ];
    if (nonCriticalCollections.includes(path || '') && (operationType === 'list' || operationType === 'get') && errorInfo.authInfo.isAnonymous) {
      console.warn(`Anonymous user denied access to ${path}. This is expected if the session is not authenticated. Operation: ${operationType}`);
      return operationType === 'list' ? [] : null; // Return empty result instead of throwing
    }

    console.error('Firestore Permission Denied:', errorInfo);
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

const GLOBAL_COLLECTIONS = new Set(['masterKeys', 'enterprises']);
const TENANT_SCOPED_COLLECTIONS = new Set([
  'shops',
  'staff',
  'products',
  'orders',
  'tables',
  'inventory',
  'backups',
  'settings',
  'shifts',
  'reservations',
  'printers',
  'incidentReports',
  'notifications',
  'recountRequests',
  'businessConfigs',
  'staffSchedules',
  'rolePermissions',
  'transactions',
  'performance_events',
  'suppliers',
  'supplier_contracts',
  'services',
  'resources',
]);

function getLocalTenantId(): string | null {
  const sessionTenant = authService.getCurrentSession()?.tenantId;
  if (sessionTenant) return sessionTenant;
  const userTenant = authService.getCurrentUser()?.tenantId;
  if (userTenant) return userTenant;
  return localStorage.getItem('rm_enterprise_id') || null;
}

function resolveTenantId(data?: any): string | null {
  return data?.companyId || data?.enterpriseId || getLocalTenantId();
}

function withTenantMetadata(colName: string, data: any): any {
  if (!TENANT_SCOPED_COLLECTIONS.has(colName)) return data;
  const tenantId = resolveTenantId(data);
  if (!tenantId) return data;
  return {
    ...data,
    companyId: data?.companyId || tenantId,
    enterpriseId: data?.enterpriseId || tenantId,
  };
}

function assertTenantContext(colName: string, data?: any): void {
  if (!TENANT_SCOPED_COLLECTIONS.has(colName)) return;
  const tenantId = resolveTenantId(data);
  if (!tenantId) {
    throw new Error(`Tenant ausente para coleção sensível: ${colName}`);
  }
}

function getRolePermissionDocId(role: string, tenantId: string | null): string {
  if (!tenantId) return role;
  return `rp_${tenantId}_${role}`;
}

function normalizeRolePermissionDocId(id: string, data?: any): string {
  if (id.startsWith('rp_')) return id;
  const role = data?.role || id;
  const tenantId = resolveTenantId(data);
  return getRolePermissionDocId(role, tenantId);
}

export const firebaseService = {
  // Generic collection listener scoped by enterprise and optionally shop
  subscribeCollection: (colName: string, enterpriseId: string | null, shopId: string | null, callback: (data: any[]) => void) => {
    if (TENANT_SCOPED_COLLECTIONS.has(colName) && !enterpriseId) {
      callback([]);
      return () => {};
    }

    let q = query(collection(db, colName));
    
    const conditions = [];
    
    if (enterpriseId && !GLOBAL_COLLECTIONS.has(colName)) {
      conditions.push(where('enterpriseId', '==', enterpriseId));
    }
    if (shopId && colName !== 'shops' && colName !== 'staff') {
      conditions.push(where('shopId', '==', shopId));
    }
    
    if (conditions.length > 0) {
      q = query(collection(db, colName), ...conditions);
    }

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, 'list', colName);
    });
  },

  subscribeStaff: (enterpriseId: string, callback: (data: Staff[]) => void) => {
    const q = query(collection(db, 'staff'), where('enterpriseId', '==', enterpriseId));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Staff[];
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, 'list', 'staff');
    });
  },

  updateTableStatus: async (tableId: string, status: string, orderId: string | null = null) => {
    try {
      await updateDoc(doc(db, 'tables', tableId), { 
        status, 
        currentOrderId: orderId,
        updatedAt: Date.now() 
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `tables/${tableId}`);
    }
  },

  saveSecureBackup: async (enterpriseId: string, data: any, key: string) => {
    const chunks = dataPipeline.pack(data, key);
    const backupId = `backup-${Date.now()}`;
    try {
      await setDoc(doc(db, 'backups', backupId), {
        companyId: enterpriseId,
        enterpriseId,
        timestamp: Date.now(),
        chunks,
        chunkCount: chunks.length,
        method: 'AES-256 + LZ-String'
      });
      return backupId;
    } catch (e) {
      return handleFirestoreError(e, 'create', `backups/${backupId}`);
    }
  },

  getSecureBackup: async (backupId: string, key: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'backups', backupId));
      if (docSnap.exists()) {
        const { chunks } = docSnap.data();
        return dataPipeline.unpack(chunks, key);
      }
      throw new Error('Backup not found');
    } catch (e) {
      return handleFirestoreError(e, 'get', `backups/${backupId}`);
    }
  },

  // Save/Update Helpers
  saveItem: async (colName: string, id: string, data: any) => {
    try {
      assertTenantContext(colName, data);
      const payload = withTenantMetadata(colName, data);
      const docId = colName === 'rolePermissions'
        ? normalizeRolePermissionDocId(id, payload)
        : id;
      await setDoc(doc(db, colName, docId), payload, { merge: true });
    } catch (e) {
      handleFirestoreError(e, 'create', `${colName}/${id}`);
    }
  },

  addItem: async (colName: string, data: any) => {
    try {
      assertTenantContext(colName, data);
      const payload = withTenantMetadata(colName, data);
      const docRef = await addDoc(collection(db, colName), payload);
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', colName);
    }
  },

  updateItem: async (colName: string, id: string, data: any) => {
    try {
      assertTenantContext(colName, data);
      const payload = withTenantMetadata(colName, data);
      const docId = colName === 'rolePermissions'
        ? normalizeRolePermissionDocId(id, payload)
        : id;
      await updateDoc(doc(db, colName, docId), payload);
    } catch (e) {
      handleFirestoreError(e, 'update', `${colName}/${id}`);
    }
  },

  deleteItem: async (colName: string, id: string) => {
    try {
      assertTenantContext(colName);
      if (colName === 'rolePermissions' && !id.startsWith('rp_')) {
        const tenantId = getLocalTenantId();
        if (tenantId) {
          const snapshot = await getDocs(
            query(
              collection(db, 'rolePermissions'),
              where('enterpriseId', '==', tenantId),
              where('role', '==', id),
            ),
          );
          const batch = writeBatch(db);
          snapshot.docs.forEach((d) => batch.delete(doc(db, 'rolePermissions', d.id)));
          await batch.commit();
          return;
        }
      }
      await deleteDoc(doc(db, colName, id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `${colName}/${id}`);
    }
  },

  getAllDocs: async (colName: string, enterpriseId?: string) => {
    try {
      if (TENANT_SCOPED_COLLECTIONS.has(colName) && !enterpriseId) return [];
      let q = query(collection(db, colName));
      if (enterpriseId) {
        q = query(collection(db, colName), where('enterpriseId', '==', enterpriseId));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (e) {
      return handleFirestoreError(e, 'list', colName);
    }
  },

  adjustProductStockAtomic: async (
    productId: string,
    delta: number,
    context?: { enterpriseId?: string; minStock?: number }
  ) => {
    if (!productId || !Number.isFinite(delta) || delta === 0) return null;
    try {
      return await runTransaction(db, async (tx) => {
        const ref = doc(db, 'products', productId);
        const snap = await tx.get(ref);
        if (!snap.exists()) {
          throw new Error(`product_not_found:${productId}`);
        }
        const data = snap.data() as any;
        if (context?.enterpriseId && data?.enterpriseId && data.enterpriseId !== context.enterpriseId) {
          throw new Error(`tenant_mismatch:${productId}`);
        }
        const minStock = context?.minStock ?? 0;
        const currentStock = typeof data?.stock === 'number' ? data.stock : 0;
        const nextStock = currentStock + delta;
        if (nextStock < minStock) {
          throw new Error(`insufficient_stock:${productId}`);
        }
        tx.update(ref, { stock: nextStock, updatedAt: Date.now() });
        return nextStock;
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, 'update', `products/${productId}`);
      }
      throw e;
    }
  },

  decrementProductStocksAtomic: async (
    items: { productId: string; quantity: number }[],
    context?: { enterpriseId?: string; minStock?: number }
  ) => {
    const normalized = items
      .filter(i => i.productId && Number.isFinite(i.quantity) && i.quantity > 0);
    if (normalized.length === 0) return;

    try {
      await runTransaction(db, async (tx) => {
        const minStock = context?.minStock ?? 0;
        const refs = normalized.map(i => doc(db, 'products', i.productId));
        const snaps = await Promise.all(refs.map(r => tx.get(r)));

        snaps.forEach((snap, idx) => {
          if (!snap.exists()) {
            throw new Error(`product_not_found:${normalized[idx].productId}`);
          }
          const data = snap.data() as any;
          if (context?.enterpriseId && data?.enterpriseId && data.enterpriseId !== context.enterpriseId) {
            throw new Error(`tenant_mismatch:${normalized[idx].productId}`);
          }
          const currentStock = typeof data?.stock === 'number' ? data.stock : 0;
          const nextStock = currentStock - normalized[idx].quantity;
          if (nextStock < minStock) {
            throw new Error(`insufficient_stock:${normalized[idx].productId}`);
          }
        });

        refs.forEach((ref, idx) => {
          const data = snaps[idx].data() as any;
          const currentStock = typeof data?.stock === 'number' ? data.stock : 0;
          const nextStock = currentStock - normalized[idx].quantity;
          tx.update(ref, { stock: nextStock, updatedAt: Date.now() });
        });
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, 'update', 'products/*');
      }
      throw e;
    }
  },

  openTableWithOrderAtomic: async (tableId: string, order: Order) => {
    assertTenantContext('orders', order);
    assertTenantContext('tables', { enterpriseId: order.enterpriseId, shopId: order.shopId });
    try {
      await runTransaction(db, async (tx) => {
        const tableRef = doc(db, 'tables', tableId);
        const orderRef = doc(db, 'orders', order.id);
        const tableSnap = await tx.get(tableRef);

        if (!tableSnap.exists()) throw new Error(`table_not_found:${tableId}`);
        const tableData = tableSnap.data() as any;
        if (tableData?.enterpriseId && tableData.enterpriseId !== order.enterpriseId) {
          throw new Error(`tenant_mismatch:${tableId}`);
        }
        const status = tableData?.status;
        const currentOrderId = tableData?.currentOrderId;
        if (status !== 'free' && status !== 'reserved' && currentOrderId !== order.id) {
          throw new Error(`table_unavailable:${tableId}`);
        }

        tx.set(orderRef, withTenantMetadata('orders', order), { merge: true });
        tx.update(tableRef, {
          status: 'occupied',
          currentOrderId: order.id,
          updatedAt: Date.now(),
        });
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, 'update', `tables/${tableId}`);
      }
      throw e;
    }
  },

  upsertOrderForTableAtomic: async (order: Order) => {
    assertTenantContext('orders', order);
    try {
      await runTransaction(db, async (tx) => {
        const orderRef = doc(db, 'orders', order.id);
        const orderPayload = withTenantMetadata('orders', order);
        const isTakeaway = order.tableId === 'takeaway';
        if (isTakeaway) {
          tx.set(orderRef, orderPayload, { merge: true });
          return;
        }

        const tableRef = doc(db, 'tables', order.tableId);
        const tableSnap = await tx.get(tableRef);
        if (!tableSnap.exists()) throw new Error(`table_not_found:${order.tableId}`);
        const tableData = tableSnap.data() as any;
        if (tableData?.enterpriseId && tableData.enterpriseId !== order.enterpriseId) {
          throw new Error(`tenant_mismatch:${order.tableId}`);
        }
        const lockedBy = tableData?.currentOrderId;
        if (lockedBy && lockedBy !== order.id) {
          throw new Error(`table_lock_mismatch:${order.tableId}`);
        }

        tx.set(orderRef, orderPayload, { merge: true });
        tx.update(tableRef, {
          status: 'occupied',
          currentOrderId: order.id,
          updatedAt: Date.now(),
        });
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, 'update', `orders/${order.id}`);
      }
      throw e;
    }
  },

  completeOrderAndReleaseTableAtomic: async (
    orderId: string,
    orderUpdates: Partial<Order>,
    expectedTableId?: string,
  ) => {
    try {
      await runTransaction(db, async (tx) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists()) throw new Error(`order_not_found:${orderId}`);
        const currentOrder = orderSnap.data() as Order;
        const mergedOrder = withTenantMetadata('orders', { ...currentOrder, ...orderUpdates });
        tx.update(orderRef, mergedOrder);

        const tableId = expectedTableId || currentOrder.tableId;
        if (!tableId || tableId === 'takeaway') return;

        const tableRef = doc(db, 'tables', tableId);
        const tableSnap = await tx.get(tableRef);
        if (!tableSnap.exists()) return;
        const tableData = tableSnap.data() as any;
        const lockedBy = tableData?.currentOrderId;
        if (lockedBy && lockedBy !== orderId) {
          throw new Error(`table_lock_mismatch:${tableId}`);
        }

        tx.update(tableRef, {
          status: 'free',
          currentOrderId: null,
          updatedAt: Date.now(),
        });
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, 'update', `orders/${orderId}`);
      }
      throw e;
    }
  },

  setTableReadyFlagAtomic: async (tableId: string, orderId: string, hasReadyItems: boolean) => {
    try {
      await runTransaction(db, async (tx) => {
        const tableRef = doc(db, 'tables', tableId);
        const tableSnap = await tx.get(tableRef);
        if (!tableSnap.exists()) return;
        const tableData = tableSnap.data() as any;
        const lockedBy = tableData?.currentOrderId;
        if (lockedBy && lockedBy !== orderId) {
          throw new Error(`table_lock_mismatch:${tableId}`);
        }
        tx.update(tableRef, { hasReadyItems, updatedAt: Date.now() });
      });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        handleFirestoreError(e, 'update', `tables/${tableId}`);
      }
      throw e;
    }
  },

  consumeMasterKey: async (rawKey: string, context: { usedBy: string; enterpriseId: string; deviceId?: string }) => {
    const normalizedKey = rawKey.trim().toUpperCase();
    if (!normalizedKey) {
      return { ok: false, reason: 'empty_key' as const };
    }

    try {
      const keyQuery = query(collection(db, 'masterKeys'), where('key', '==', normalizedKey), limit(1));
      const keySnapshot = await getDocs(keyQuery);

      if (keySnapshot.empty) {
        return { ok: false, reason: 'invalid_key' as const };
      }

      const keyDoc = keySnapshot.docs[0];
      const keyRef = doc(db, 'masterKeys', keyDoc.id);
      const now = Date.now();

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(keyRef);
        if (!snap.exists()) {
          throw new Error('invalid_key');
        }

        const data = snap.data() as any;
        if (data.revokedAt) throw new Error('revoked_key');
        if (data.used) throw new Error('already_used');
        if (data.expiresAt && data.expiresAt < now) throw new Error('expired_key');

        tx.update(keyRef, {
          used: true,
          usedBy: context.usedBy,
          usedAt: now,
          enterpriseId: context.enterpriseId,
          companyId: context.enterpriseId,
          usedByDevice: context.deviceId || null,
          updatedAt: now,
        });
      });

      return { ok: true, keyId: keyDoc.id as string };
    } catch (error: any) {
      const reason = typeof error?.message === 'string' ? error.message : 'consume_failed';
      return { ok: false, reason: reason as 'invalid_key' | 'already_used' | 'expired_key' | 'revoked_key' | 'consume_failed' };
    }
  },

  seedData: async (data: {
    enterprises?: Enterprise[],
    shops: Shop[],
    staff: Staff[],
    products: Product[],
    tables: Table[],
    orders?: Order[],
    inventory: InventoryItem[],
    permissions: RolePermissions[],
    printers: Printer[],
    businessConfigs?: any[],
    staffSchedules?: any[]
  }) => {
    const batch = writeBatch(db);
    const tenantId =
      data.shops[0]?.companyId ||
      data.shops[0]?.enterpriseId ||
      data.staff[0]?.companyId ||
      data.staff[0]?.enterpriseId ||
      getLocalTenantId();
    
    data.enterprises?.forEach(e => batch.set(doc(db, 'enterprises', e.id), withTenantMetadata('enterprises', e)));
    data.shops.forEach(s => batch.set(doc(db, 'shops', s.id), withTenantMetadata('shops', s)));
    data.staff.forEach(s => batch.set(doc(db, 'staff', s.id), withTenantMetadata('staff', s)));
    data.products.forEach(p => batch.set(doc(db, 'products', p.id), withTenantMetadata('products', p)));
    data.tables.forEach(t => batch.set(doc(db, 'tables', t.id), withTenantMetadata('tables', t)));
    if (data.orders) {
      data.orders.forEach(o => batch.set(doc(db, 'orders', o.id), withTenantMetadata('orders', o)));
    }
    data.inventory.forEach(i => batch.set(doc(db, 'inventory', i.id), withTenantMetadata('inventory', i)));
    data.permissions.forEach(p => {
      const roleDocId = getRolePermissionDocId(p.role, tenantId);
      batch.set(
        doc(db, 'rolePermissions', roleDocId),
        withTenantMetadata('rolePermissions', {
          ...p,
          enterpriseId: p.enterpriseId || tenantId || undefined,
          companyId: (p as any).companyId || tenantId || undefined,
        }),
      );
    });
    data.printers.forEach(p => batch.set(doc(db, 'printers', p.id), withTenantMetadata('printers', p)));
    if (data.businessConfigs) {
      data.businessConfigs.forEach(c => batch.set(doc(db, 'businessConfigs', c.id), withTenantMetadata('businessConfigs', c)));
    }
    if (data.staffSchedules) {
      data.staffSchedules.forEach(s => batch.set(doc(db, 'staffSchedules', s.id), withTenantMetadata('staffSchedules', s)));
    }

    await batch.commit();
  }
};
