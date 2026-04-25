import { coreEventBus } from '../events/CoreEventBus';
import { meshNetwork } from '../../services/p2pSync';
import { firebaseService } from '../../services/firebaseService';
import { logger } from '../services/logger';
import { InventoryEngine } from './InventoryEngine';
import { accountService } from '../services/accountService';

/**
 * Orchestrates synchronization between Local Storage, P2P Mesh, and Cloud (Firebase).
 * Listen to core events and propagates changes.
 */
class CoreSyncService {
  private companyId: string | null = null;

  constructor() {
    this.companyId = accountService.getCurrentCompanyId();
    this.setupListeners();
  }

  private setupListeners() {
    // 1. Sync Stock Decrements
    coreEventBus.on('product:stock_decremented', async ({ productId, quantity, saleId }) => {
      if (!this.companyId) return;

      // Cloud Sync (Atomic)
      const shopId = accountService.getSelectedShopId() || 'global'; // Assumindo que o shopId está disponível
      const inventoryItems = await firebaseService.getAllDocs('inventory', this.companyId, shopId); // Buscar inventário para resolução de substitutos
      try {
        await InventoryEngine.adjustStockRecursive(
          [{ id: productId, quantity: quantity, name: 'unknown' }], // Passar item no formato esperado
          1, // Multiplier 1 para deduzir
          this.companyId, shopId, inventoryItems as any
        );
        logger.info('core', 'STOCK_SYNC_CLOUD_SUCCESS', { productId, quantity });
      } catch (error) {
        logger.error('core', 'STOCK_SYNC_CLOUD_FAILED', { productId, quantity, error });
      }
      
      // P2P Mesh Sync
      meshNetwork.emitEvent('STOCK_UPDATE', { 
        eventId: saleId || `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        productId, 
        quantity, 
        companyId: this.companyId,
        type: 'decrement'
      });
    });

    // 2. Sync Product Updates
    coreEventBus.on('product:updated', async (product) => {
      if (!this.companyId) return;

      // P2P Mesh Sync
      meshNetwork.emitEvent('PRODUCT_UPDATE', product);
      
      // Cloud Sync
      try {
        await firebaseService.saveItem('products', product.id, product);
      } catch (error) {
        logger.error('core', 'Failed to sync product to cloud', { productId: product.id, error });
      }
    });

    // 3. Sync Sales
    coreEventBus.on('sale:created', async (sale) => {
      if (!this.companyId) return;

      meshNetwork.emitEvent('SALE_CREATED', sale);
      
      try {
        await firebaseService.saveItem('sales', sale.id, sale);
      } catch (error) {
        logger.error('core', 'Failed to sync sale to cloud', { saleId: sale.id, error });
      }
    });
  }
}

export const coreSyncService = new CoreSyncService();
