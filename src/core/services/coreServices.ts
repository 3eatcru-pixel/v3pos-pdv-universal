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
      const enterpriseId = sale.enterpriseId;
      const shopId = sale.shopId;
      
      await firebaseService.runTransaction(async (tx) => {
        // 1. Auditoria: Leituras dentro da transação para garantir consistência de custo e saldo
        const itemIds = Array.from(new Set(items.map(i => i.productId || i.id).filter(Boolean)));
        
        const [inventoryItems, allProducts] = await Promise.all([
          firebaseService.getDocsByQuery('inventory', [{ field: 'enterpriseId', op: '==', value: enterpriseId }, { field: 'id', op: 'in', value: itemIds }]),
          firebaseService.getDocsByQuery('products', [{ field: 'enterpriseId', op: '==', value: enterpriseId }, { field: 'id', op: 'in', value: itemIds }])
        ]);

        // Auditoria: Snapshots de Custo devem ser baseados no momento exato da transação
        // Mapeia custos atuais para congelar no pedido (Snapshot de Custo)
        const itemsWithCosts = items.map(item => {
          const invItem = (inventoryItems as any[]).find(i => i.id === (item.productId || item.id));
          return { ...item, unitCost: invItem?.costPerUnit || 0 };
        });

        // 1. Auditoria: PROCESSAMENTO DE ESTOQUE (Deve ser a PRIMEIRA operação para permitir tx.get)
        // Firestore exige que todas as leituras ocorram antes de qualquer escrita na transação.
        if (items && items.length > 0) {
          const multiplier = (sale.module === 'construction' && (sale as any).logistics?.type === 'scheduled_delivery') ? 0 : 1;
          
          await InventoryEngine.adjustStockRecursive(
            items, 
            multiplier, 
            enterpriseId, 
            shopId, 
            inventoryItems as any, 
            allProducts as any,
            tx // Passa a transação existente
          );
        }

        // 2. Transação: Consumo de sinal (Escrita: tx.update)
        if (depositId) {
          await BookingDepositEngine.consumeDeposit(tx, depositId, sale.id);
        }

        // 1.5 Auditoria de Compliance: Verificação de Idade (Tobacco/Alcohol)
        const needsAgeCheck = allProducts.some(p => (p as any).metadata?.requiresAgeCheck);
        if (needsAgeCheck && !(sale as any).metadata?.ageVerified) {
          throw new Error('age_verification_required: Este pedido contém itens controlados. Verifique o documento do cliente.');
        }

        // 3. Transação: ESCRITA FINAL (Pedido salvo por último)
        const orderRef = firebaseService.getDocRef('orders', sale.id);
        tx.set(orderRef, {
          ...sale,
          items: itemsWithCosts,
          status: 'delivered',
          startTime: Date.now(),
          closedAt: Date.now(),
          depositId: depositId || null
        });
      });

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
