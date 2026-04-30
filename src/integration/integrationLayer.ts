import { coreSalesService, coreProductService } from '../core/services/coreServices';
import { logger } from '../core/services/logger';
import { CoreSale, SyncEvent } from '../core/types';
import { SyncEventType } from '../core/events/eventCatalog';
import { authService } from '../auth/authService';
import { meshNetwork } from '../services/p2pSync';

/**
 * Integration Layer
 * 
 * This layer acts as a gateway between business modules and the core system.
 * It is prepares the system for future external API connections.
 */
class IntegrationLayer {
  
  private getCurrentUser() {
    const current = authService.getCurrentUser();
    if (!current) {
      return null;
    }
    return {
      id: current.id,
      role: current.role,
      companyId: current.tenantId || null,
    };
  }

  // Generic Sales Integration
  async registerSale(origin: 'restaurant' | 'construction' | 'retail' | 'market', sale: CoreSale, items: any[]) {
    const currentUser = this.getCurrentUser();
    const companyId = currentUser?.companyId || 'unknown';

    logger.log(origin, `Processing sale via Integration Layer (Company: ${companyId})`, { saleId: sale.id, companyId });
    
    // 1. Call core sales service
    const result = await coreSalesService.processSale(sale, items || []);
    
    return result;
  }

  // Unified sync publishing API
  publishSyncEvent(type: SyncEventType, payload: any) {
    meshNetwork.emitEvent(type, payload);
  }

  // Unified sync subscription API
  onSyncEvent(callback: (event: SyncEvent) => void) {
    return meshNetwork.setOnSync(callback);
  }

  // Connectivity probe for modules
  isSyncConnected() {
    return meshNetwork.isConnectedToLocalMesh;
  }

  // Inventory Integration
  async updateStock(origin: 'restaurant' | 'construction' | 'retail' | 'market', productId: string, delta: number) {
    const currentUser = this.getCurrentUser();
    const companyId = currentUser?.companyId || 'unknown';

    logger.log(origin, `Updating inventory via Integration Layer (Company: ${companyId})`, { productId, delta, companyId });
    return await coreProductService.updateInventory(productId, delta);
  }

  // Auditor Integration
  async sendLog(origin: 'restaurant' | 'construction' | 'retail' | 'market', action: string, metadata?: any) {
    const currentUser = this.getCurrentUser();
    const companyId = currentUser?.companyId || 'unknown';

    return logger.log(origin, action, { ...metadata, companyId });
  }
}

export const integrationLayer = new IntegrationLayer();
