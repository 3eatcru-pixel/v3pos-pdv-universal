import { coreEventBus } from '../events/CoreEventBus';
import { meshNetwork } from '../../services/p2pSync';
import { firebaseService } from '../../services/firebaseService';
import { logger } from '../services/logger';
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
    coreEventBus.on('product:stock_decremented', async ({ productId, quantity }) => {
      if (!this.companyId) return;

      // Cloud Sync (Atomic)
      try {
        await firebaseService.decrementProductStocksAtomic(
          [{ productId, quantity }],
          { enterpriseId: this.companyId }
        );
        logger.info('core', 'STOCK_SYNC_CLOUD_SUCCESS', { productId, quantity });
      } catch (error) {
        logger.error('core', 'STOCK_SYNC_CLOUD_FAILED', { productId, quantity, error });
      }
      
      // P2P Mesh Sync
      meshNetwork.emitEvent('STOCK_UPDATE', { 
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
