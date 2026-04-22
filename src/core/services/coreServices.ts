import { CoreProduct, CoreSale } from '../types';
import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';

class SalesService {
  async processSale(sale: CoreSale, items: any[]) {
    logger.log('core', 'Processing real sale', { saleId: sale.id, total: sale.total });
    
    // Save to Firebase
    try {
      await firebaseService.saveItem('orders', sale.id, {
        ...sale,
        items,
        status: 'delivered',
        startTime: Date.now(),
        closedAt: Date.now()
      });

      // Update Inventory Atomically
      if (items && items.length > 0) {
        const stockItems = items.map(i => ({ 
          productId: i.productId || i.id, 
          quantity: i.quantity || 1 
        }));
        await firebaseService.decrementProductStocksAtomic(stockItems, { 
          enterpriseId: (sale as any).enterpriseId || (sale as any).companyId 
        });
      }

      return { success: true, timestamp: Date.now() };
    } catch (error) {
      console.error("Erro ao processar venda no core:", error);
      throw error;
    }
  }
}

class ProductService {
  async updateInventory(productId: string, quantity: number) {
    logger.log('core', 'Updating base inventory fuel', { productId, quantity });
    await firebaseService.adjustProductStockAtomic(productId, quantity);
  }
}

export const coreSalesService = new SalesService();
export const coreProductService = new ProductService();
