import { CoreProduct, CoreSale } from '../types';
import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';
import { DailyAggregatorEngine } from './DailyAggregatorEngine';
import { coreEventBus } from '../events/CoreEventBus';
import { InventoryEngine } from './InventoryEngine';
import { BookingDepositEngine } from './BookingDepositEngine';

class SalesService {
  async processSale(sale: CoreSale, items: any[], depositId?: string) {
    logger.info('core', 'Processing real sale', { saleId: sale.id, total: sale.total, depositId });
    
    // Save to Firebase
    try {
      await firebaseService.runTransaction(async (tx) => {
        // 1. Salva o pedido de forma atômica
        const orderRef = firebaseService.getDocRef('orders', sale.id);
        tx.set(orderRef, {
          ...sale,
          items,
          status: 'delivered',
          startTime: Date.now(),
          closedAt: Date.now(),
          depositId: depositId || null // Vincula o sinal ao pedido para auditoria
        });

        // 2. Consome o sinal (booking fee) se houver, garantindo que não seja reusado
        if (depositId) {
          await BookingDepositEngine.consumeDeposit(tx, depositId, sale.id);
        }
      });

      // Update Inventory Atomically
      if (items && items.length > 0 && sale.enterpriseId && sale.shopId) {
        const enterpriseId = sale.enterpriseId;
        const shopId = sale.shopId;
        const inventoryItems = await firebaseService.getAllDocs('inventory', enterpriseId, shopId); // Buscar inventário para resolução de substitutos

        // Lógica de Construção: Se for entrega futura, apenas reserva. Se for balcão, abate direto.
        if (sale.module === 'construction' && (sale as any).logistics?.type === 'scheduled_delivery') {
          // A reserva também deve usar o InventoryEngine para resolver composições
          await InventoryEngine.adjustStockRecursive(items, 0, enterpriseId, shopId, inventoryItems as any); // Multiplier 0 para reservar
          logger.info('core', 'Estoque reservado para entrega futura', { saleId: sale.id });
        } else {
          await InventoryEngine.adjustStockRecursive(items, 1, enterpriseId, shopId, inventoryItems as any); // Multiplier 1 para deduzir
        }
      }

      // Dispara evento com ID da venda para garantir que o Mesh não duplique a baixa
      if (items && items.length > 0) {
        items.forEach(item => {
          coreEventBus.emit('product:stock_decremented', { 
            productId: item.productId || item.id, 
            quantity: item.quantity,
            saleId: sale.id 
          });
        });
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
