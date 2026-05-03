import { integrationLayer } from '../../../integration/integrationLayer';
import { SyncEvent, CoreSale } from '../../../core/types';
import { logger } from '../../../core/services/logger';
import { saleRepository } from '../../../core/storage/repositories/saleRepository';
import { accountService } from '../../../core/services/accountService';
import { FinanceEngine } from '../../../core/services/FinanceEngine';
import { InventoryEngine } from '../../../core/services/InventoryEngine';
import { firebaseService } from '../../../services/firebaseService';

export interface Sale extends Omit<CoreSale, 'enterpriseId' | 'staffId' | 'createdAt'> {
  enterpriseId: string;
  staffId: string;
  synced: boolean;
  createdAt: string;
  kind: 'sale' | 'return';
  originalSaleId?: string;
  reason?: string;
}

export interface SaleItem { // Definido aqui para evitar dependência circular com types.ts
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface RetailSaleInput {
  id?: string;
  items: SaleItem[];
  paymentMethod: string;
  enterpriseId?: string;
  total: number;
  isQuote?: boolean; // Adicionado para o caso de orçamentos
}

export interface RetailSyncItem {
  productId: string;
  name: string;
  quantity: number;
  id?: string; // Adicionado para flexibilidade
  unitPrice: number;
  price?: number; // Adicionado para flexibilidade
  totalPrice: number;
}

export interface RetailSyncPayload {
  id: string;
  items: RetailSyncItem[];
  paymentMethod: string;
  total: number;
  subtotal: number;
  tax: number;
  createdAt: string;
  kind: 'sale' | 'return';
  enterpriseId?: string;
  originalSaleId?: string;
  reason?: string;
  items: SaleItem[];
}

export interface RetailVariation {
  sku: string;
  size?: string;
  color?: string;
  voltage?: '110v' | '220v' | 'bivolt';
  stock: number;
}

export interface RetailCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  tags: string[];
  lastPurchase?: number;
  totalSpent: number;
  // Custom Fields
  preferences?: string[]; // e.g., ['Summer Collection', 'Sustainable Materials']
  returnHistory?: { date: number, reason: string, productId: string }[];
  emergencyContact?: { name: string, phone: string, relation: string };
}

export interface RetailPromotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_get_free';
  value: number;
  startDate: number;
  endDate: number;
  productId?: string;
  category?: string;
}

export interface SerialNumber {
  serial: string;
  productId: string;
  status: 'available' | 'sold' | 'returned';
}

export interface Warranty {
  id: string;
  saleId: string;
  productId: string;
  serialNumber?: string;
  startDate: number;
  endDate: number;
  status: 'active' | 'expired' | 'voided';
}

export interface Installment {
  number: number;
  amount: number;
  dueDate: number;
  status: 'pending' | 'paid' | 'overdue';
}

export interface RetailSyncStatus {
  connected: boolean;
  pendingCount: number;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  isRetrying: boolean;
  resentInSession: number;
  recentEvents: RetailSyncHistoryEvent[];
}

export interface RetailSyncHistoryEvent {
  id: string;
  timestamp: number;
  type: 'SEND' | 'RECEIVE' | 'DUPLICATE' | 'RETRY' | 'MANUAL_SYNC';
  status: 'success' | 'ignored' | 'pending';
  saleId?: string;
  message: string;
}

class RetailService {
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private isRetryingUnsynced = false;
  private lastSyncAttemptAt: number | null = null;
  private lastSyncSuccessAt: number | null = null;
  private resentInSession = 0;
  private recentSyncEvents: RetailSyncHistoryEvent[] = [];

  constructor() {
    this.registerSyncListeners();
    this.startUnsyncedRetryLoop();
  }

  registerSyncListeners() {
    integrationLayer.onSyncEvent((event: SyncEvent) => {
      switch (event.type) {
        case 'RETAIL_SALE':
          void this.handleRetailSale(event.payload);
          break;
        case 'WARRANTY_GEN':
          this.handleWarrantyGen(event.payload);
          break;
      }
    });
  }

  async processSale(saleData: RetailSaleInput) {
    const sale = this.toSaleEntity(saleData, false);
    const existingSale = await saleRepository.findById(sale.id);
    if (existingSale) {
      logger.log('retail', 'SALE_DUPLICATE_IGNORED', { saleId: sale.id, source: 'local_process' });
      this.pushSyncEvent({
        type: 'DUPLICATE',
        status: 'ignored',
        saleId: sale.id,
        message: 'Venda local duplicada ignorada',
      });
      return { success: true, duplicate: true, saleId: sale.id };
    }

    // Nexus Standard: Executa a persistência da venda e a baixa de estoque em uma única Transação Atômica
    await firebaseService.runTransaction(async (tx) => {
      const [inventory, products] = await Promise.all([
        firebaseService.getAllDocs('inventory', sale.enterpriseId || 'global'),
        firebaseService.getAllDocs('products', sale.enterpriseId || 'global')
      ]) as [any, any];

      await InventoryEngine.adjustStockRecursive(
        sale.items.map(i => ({ 
          id: i.productId, 
          quantity: i.quantity, 
          transactionId: sale.id 
        })),
        1,
        sale.enterpriseId || 'global',
        accountService.getSelectedShopId() || 'main-shop',
        inventory,
        products,
        tx,
        true // blockOnZero: true para varejo
      );

      tx.set(firebaseService.getDocRef('orders', sale.id), sale);
    });

    logger.log('retail', 'SALE_SAVED_ATOMIC', { saleId: sale.id, total: sale.total });

    await this.tryRegisterRetailFinanceTransaction(sale, 'sale');

    if (integrationLayer.isSyncConnected()) {
      this.lastSyncAttemptAt = Date.now();
      integrationLayer.publishSyncEvent('RETAIL_SALE', sale);
      logger.log('retail', 'SALE_SYNC_SENT', { saleId: sale.id, items: sale.items.length });
      await saleRepository.update({ ...sale, synced: true });
      this.lastSyncSuccessAt = Date.now();
      this.pushSyncEvent({
        type: 'SEND',
        status: 'success',
        saleId: sale.id,
        message: 'Venda enviada para malha',
      });
    } else {
      this.pushSyncEvent({
        type: 'SEND',
        status: 'pending',
        saleId: sale.id,
        message: 'Venda pendente aguardando conexão',
      });
    }

    const rawItems = Array.isArray(saleData?.items) ? saleData.items : [];
    rawItems.forEach((item: any) => {
      if (item.hasWarranty) {
        this.generateWarranty(sale.id, item);
      }
    });

    this.emitSaleUpdateEvent('local', sale.id);
    await this.emitSyncStatusEvent();
    void this.retryUnsyncedSales();

    return await integrationLayer.registerSale('retail', sale as any, sale.items);
  }

  async processReturn(input: { originalSaleId: string; reason: string; items?: { productId: string; quantity: number }[] }) {
    const originalSale = await saleRepository.findById(input.originalSaleId);
    if (!originalSale) {
      throw new Error('sale_not_found');
    }

    const allowedItems = Array.isArray(input.items) && input.items.length > 0
      ? originalSale.items.filter((item) => {
          const requested = input.items!.find((r) => r.productId === item.productId);
          return requested && requested.quantity > 0;
        }).map((item) => {
          const requested = input.items!.find((r) => r.productId === item.productId)!;
          return { ...item, quantity: Math.min(item.quantity, requested.quantity), totalPrice: item.unitPrice * Math.min(item.quantity, requested.quantity) };
        })
      : originalSale.items.map((item) => ({ ...item }));

    if (allowedItems.length === 0) {
      throw new Error('return_items_empty');
    }

    const subtotal = allowedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRatio = originalSale.subtotal > 0 ? originalSale.tax / originalSale.subtotal : 0;
    const tax = Number((subtotal * taxRatio).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    const returnSale: Sale = {
      id: `ret_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      subtotal: -subtotal,
      tax: -tax,
      total: -total,
      paymentMethod: originalSale.paymentMethod,
      synced: false,
      items: allowedItems,
      kind: 'return',
      originalSaleId: originalSale.id,
      reason: input.reason || 'devolucao',
    };

    // Nexus Standard: Executa o estorno de estoque e registro da devolução de forma atômica
    await firebaseService.runTransaction(async (tx) => {
      const [inventory, products] = await Promise.all([
        firebaseService.getAllDocs('inventory', originalSale.enterpriseId || 'global'),
        firebaseService.getAllDocs('products', originalSale.enterpriseId || 'global')
      ]) as [any, any];

      await InventoryEngine.adjustStockRecursive(
        returnSale.items.map(i => ({ 
          id: i.productId, 
          quantity: i.quantity, 
          transactionId: returnSale.id 
        })),
        -1, // Retorno físico ao estoque
        originalSale.enterpriseId || 'global',
        accountService.getSelectedShopId() || 'main-shop',
        inventory,
        products,
        tx
      );

      tx.set(firebaseService.getDocRef('orders', returnSale.id), returnSale);
    });

    await this.tryRegisterRetailFinanceTransaction(returnSale, 'return');

    if (integrationLayer.isSyncConnected()) {
      this.lastSyncAttemptAt = Date.now();
      integrationLayer.publishSyncEvent('RETAIL_SALE', returnSale);
      await saleRepository.update({ ...returnSale, synced: true });
      this.lastSyncSuccessAt = Date.now();
      this.pushSyncEvent({
        type: 'SEND',
        status: 'success',
        saleId: returnSale.id,
        message: 'Devolucao enviada para malha',
      });
      await this.emitSyncStatusEvent();
    }

    this.emitSaleUpdateEvent('local', returnSale.id);
    return returnSale;
  }

  private async tryRegisterRetailFinanceTransaction(sale: Sale, kind: 'sale' | 'return') {
    const currentUser = accountService.getCurrentUser();
    const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
    const shopId = accountService.getSelectedShopId();
    if (!enterpriseId) {
      logger.log('retail', 'FINANCE_TRANSACTION_SKIPPED', {
        reason: 'missing_enterprise_id',
        saleId: sale.id,
        kind,
      });
      return;
    }

    const amount = Math.abs(Number(sale.total || 0));
    const type = kind === 'sale' ? 'income' : 'expense';
    const category = kind === 'sale' ? 'Venda de Produtos' : 'Devolucoes / Estornos';
    const description = kind === 'sale'
      ? `Venda varejo ${sale.id}`
      : `Devolucao varejo ${sale.id} ref ${sale.originalSaleId || 'sem_ref'}`;

    try {
      await FinanceEngine.createTransaction({
        enterpriseId,
        shopId,
        module: 'retail',
        staffId: currentUser?.id || 'retail-system',
        staffName: currentUser?.name || 'Retail System',
        type,
        amount,
        category,
        description,
        date: sale.createdAt?.slice(0, 10),
      });
      logger.log('retail', 'FINANCE_TRANSACTION_CREATED', {
        saleId: sale.id,
        kind,
        type,
        amount,
      });
    } catch (error) {
      logger.log('retail', 'FINANCE_TRANSACTION_FAILED', {
        saleId: sale.id,
        kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private startUnsyncedRetryLoop() {
    if (this.retryTimer) return;
    this.retryTimer = setInterval(() => {
      void this.retryUnsyncedSales();
    }, 10000);
  }

  private async retryUnsyncedSales() {
    if (this.isRetryingUnsynced) return;
    if (!integrationLayer.isSyncConnected()) return;

    this.isRetryingUnsynced = true;
    this.lastSyncAttemptAt = Date.now();
    try {
      const unsyncedSales = await saleRepository.findUnsynced();
      for (const sale of unsyncedSales) {
        integrationLayer.publishSyncEvent('RETAIL_SALE', sale);
        logger.log('retail', 'SALE_SYNC_SENT', { saleId: sale.id, retry: true });
        await saleRepository.update({ ...sale, synced: true });
        this.lastSyncSuccessAt = Date.now();
        this.resentInSession += 1;
        this.pushSyncEvent({
          type: 'RETRY',
          status: 'success',
          saleId: sale.id,
          message: 'Venda reenviada com sucesso',
        });
      }
    } finally {
      this.isRetryingUnsynced = false;
      await this.emitSyncStatusEvent();
    }
  }

  private async generateWarranty(saleId: string, item: any) {
    const warranty: Warranty = {
      id: `war-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      saleId,
      productId: item.productId,
      serialNumber: item.serial,
      startDate: Date.now(),
      endDate: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year default
      status: 'active'
    };

    integrationLayer.publishSyncEvent('WARRANTY_GEN', warranty);
  }

  private async handleRetailSale(payload: RetailSyncPayload) {
    const sale = this.toSaleEntity(payload, true);
    const existingSale = await saleRepository.findById(sale.id);

    if (existingSale) {
      logger.log('retail', 'SALE_DUPLICATE_IGNORED', { saleId: sale.id, source: 'sync_receive' });
      this.pushSyncEvent({
        type: 'DUPLICATE',
        status: 'ignored',
        saleId: sale.id,
        message: 'Venda remota duplicada ignorada',
      });
      return;
    }

    // Nexus Standard: Sincronização Atômica via Motor Central
    await firebaseService.runTransaction(async (tx) => {
      const [inventory, products] = await Promise.all([
        firebaseService.getAllDocs('inventory', sale.enterpriseId || 'global'),
        firebaseService.getAllDocs('products', sale.enterpriseId || 'global')
      ]) as [any, any];

      await InventoryEngine.adjustStockRecursive(
        sale.items.map(i => ({ id: i.productId, quantity: i.quantity, transactionId: sale.id })),
        sale.kind === 'return' ? -1 : 1,
        sale.enterpriseId || 'global',
        accountService.getSelectedShopId() || 'main-shop',
        inventory,
        products,
        tx
      );

      tx.set(firebaseService.getDocRef('orders', sale.id), sale);
    });

    await saleRepository.create(sale);
    logger.log('retail', 'SALE_SYNC_RECEIVED', { saleId: sale.id, total: sale.total });

    this.logProductUpdates(sale.items, 'sync_receive');

    this.emitSaleUpdateEvent('remote', sale.id);
    this.pushSyncEvent({
      type: 'RECEIVE',
      status: 'success',
      saleId: sale.id,
      message: 'Venda recebida da malha',
    });
    await this.emitSyncStatusEvent();
  }

  private toSaleEntity(rawSale: Partial<RetailSyncPayload>, synced: boolean): Sale {
    const rawItems = Array.isArray(rawSale?.items) ? rawSale.items : [];
    const items: SaleItem[] = rawItems.map((item) => ({
      productId: String(item?.productId || item?.id || ''),
      name: String(item?.name || 'Unknown Product'),
      quantity: Number(item?.quantity || 0),
      unitPrice: Number(item?.unitPrice || item?.price || 0),
      totalPrice: Number(item?.totalPrice || (Number(item?.quantity || 0) * Number(item?.unitPrice || item?.price || 0))),
    }));

    const saleId = String(rawSale?.id || `sale_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const enterpriseId = rawSale.enterpriseId || accountService.getCurrentCompanyId() || 'unknown';
    const createdAt =
      typeof rawSale?.createdAt === 'string'
        ? rawSale.createdAt
        : typeof rawSale?.createdAt === 'number'
          ? new Date(rawSale.createdAt).toISOString()
          : new Date().toISOString();

    return {
      id: saleId,
      enterpriseId,
      shopId: accountService.getSelectedShopId() || 'unknown',
      staffId: accountService.getCurrentUser()?.id || 'unknown',
      timestamp: Date.now(),
      status: (rawSale?.status as any) || 'completed',
      discount: Number(rawSale?.discount || 0),
      createdAt,
      subtotal: Number(rawSale?.subtotal || 0),
      tax: Number(rawSale?.tax || 0),
      total: Number(rawSale?.total || 0),
      paymentMethod: String(rawSale?.paymentMethod || 'unknown'),
      synced,
      items,
      kind: rawSale?.kind || 'sale',
      originalSaleId: rawSale?.originalSaleId,
      reason: rawSale?.reason,
    };
  }

  private logProductUpdates(items: SaleItem[], source: 'local_process' | 'sync_receive') {
    for (const item of items) {
      logger.log('retail', 'PRODUCT_UPDATED_LOCAL', {
        saleSource: source,
        productId: item.productId,
        quantity: item.quantity,
      });
    }
  }

  private emitSaleUpdateEvent(source: 'local' | 'remote', saleId: string) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('retail:sale-updated', {
        detail: { source, saleId, timestamp: Date.now() },
      })
    );
  }

  public async getSyncQueueStatus(): Promise<RetailSyncStatus> {
    const pendingSales = await saleRepository.findUnsynced();
    return {
      connected: integrationLayer.isSyncConnected(),
      pendingCount: pendingSales.length,
      lastAttemptAt: this.lastSyncAttemptAt,
      lastSuccessAt: this.lastSyncSuccessAt,
      isRetrying: this.isRetryingUnsynced,
      resentInSession: this.resentInSession,
      recentEvents: [...this.recentSyncEvents],
    };
  }

  public async syncNow(): Promise<RetailSyncStatus> {
    this.pushSyncEvent({
      type: 'MANUAL_SYNC',
      status: 'pending',
      message: 'Sincronização manual iniciada',
    });
    await this.retryUnsyncedSales();
    return this.getSyncQueueStatus();
  }

  public async clearSyncHistory(): Promise<RetailSyncStatus> {
    this.recentSyncEvents = [];
    await this.emitSyncStatusEvent();
    return this.getSyncQueueStatus();
  }

  private async emitSyncStatusEvent() {
    if (typeof window === 'undefined') return;
    const status = await this.getSyncQueueStatus();
    window.dispatchEvent(
      new CustomEvent('retail:sync-status', {
        detail: status,
      })
    );
  }

  private pushSyncEvent(event: Omit<RetailSyncHistoryEvent, 'id' | 'timestamp'>) {
    const fullEvent: RetailSyncHistoryEvent = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      ...event,
    };
    this.recentSyncEvents = [fullEvent, ...this.recentSyncEvents].slice(0, 10);
  }

  private handleWarrantyGen(payload: Warranty) {
    console.log('[RETAIL] New warranty generated', payload.id);
  }
}

export const retailService = new RetailService();
