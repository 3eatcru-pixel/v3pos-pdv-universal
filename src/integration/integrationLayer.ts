import { coreSalesService, coreProductService } from '../core/services/coreServices';
import { logger } from '../core/services/logger';
import { CoreSale, CoreProduct } from '../core/types';
import { authService } from '../auth/authService';

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
    const result = await coreSalesService.processSale(sale, []);
    
    return result;
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
