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
        await firebaseService.decrementProductStocksAtomic(this.companyId, [{ productId, quantity }]);
        logger.log('core', 'STOCK_SYNC_CLOUD_SUCCESS', { productId, quantity });
      } catch (err) {
        logger.log('core', 'STOCK_SYNC_CLOUD_FAILED', { productId, quantity, error: err });
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
      } catch (err) {
        console.error('Failed to sync product to cloud', err);
      }
    });

    // 3. Sync Sales
    coreEventBus.on('sale:created', async (sale) => {
      if (!this.companyId) return;

      meshNetwork.emitEvent('SALE_CREATED', sale);
      
      try {
        await firebaseService.saveItem('sales', sale.id, sale);
      } catch (err) {
        console.error('Failed to sync sale to cloud', err);
      }
    });
  }
}

export const coreSyncService = new CoreSyncService();
