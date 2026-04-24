import { CoreProduct, CoreSale } from '../types';
import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';
import { DailyAggregatorEngine } from './DailyAggregatorEngine';

class SalesService {
  async processSale(sale: CoreSale, items: any[]) {
    logger.info('core', 'Processing real sale', { saleId: sale.id, total: sale.total });
    
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
        const stockItems = items.map(i => ({ productId: i.productId || i.id, quantity: i.quantity || 1 }));
        const enterpriseId = (sale as any).enterpriseId || (sale as any).companyId;

        // Lógica de Construção: Se for entrega futura, apenas reserva. Se for balcão, abate direto.
        if (sale.module === 'construction' && (sale as any).logistics?.type === 'scheduled_delivery') {
          await firebaseService.reserveInventoryStocksAtomic(stockItems, { enterpriseId });
          logger.info('core', 'Estoque reservado para entrega futura', { saleId: sale.id });
        } else {
          await firebaseService.decrementProductStocksAtomic(stockItems, { enterpriseId });
        }
      }

      // BFF Aggregation: Update Daily Summary for faster Dashboard rendering
      await DailyAggregatorEngine.updateSummary(sale, items);

    } catch (error) {
      logger.error('core', 'Erro ao processar venda no core', { error });
      throw error;
    }
  }
}

class ProductService {
  async updateInventory(productId: string, quantity: number) {
    logger.info('core', 'Updating base inventory fuel', { productId, quantity });
    await firebaseService.adjustProductStockAtomic(productId, quantity);
  }
}

export const coreSalesService = new SalesService();
export const coreProductService = new ProductService();
