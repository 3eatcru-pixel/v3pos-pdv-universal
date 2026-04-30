import { firebaseService } from '../../services/firebaseService';
import { Order, InventoryItem } from '../../types';
import { logger } from './logger';

export interface StockPrediction {
  itemId: string;
  daysRemaining: number;
  dailyBurnRate: number;
  status: 'stable' | 'warning' | 'critical';
}

export class InventoryForecastEngine {
  /**
   * Calcula a previsão de término de estoque com base nos últimos 7 dias de vendas.
   * Essencial para compras inteligentes no Varejo e Supermercados.
   */
  static async predictItemStock(enterpriseId: string, item: InventoryItem): Promise<StockPrediction> {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    try {
      // Busca ordens recentes que contêm este item
      const recentOrders = await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'status', op: '==', value: 'delivered' },
        { field: 'closedAt', op: '>=', value: sevenDaysAgo }
      ]) as Order[];

      let totalQuantitySold = 0;
      recentOrders.forEach(order => {
        const orderItem = order.items.find(i => i.productId === item.id);
        if (orderItem) totalQuantitySold += orderItem.quantity;
      });

      const dailyBurnRate = totalQuantitySold / 7;
      
      // Se não houve vendas, o estoque é considerado estável (infinito no tempo)
      if (dailyBurnRate <= 0) {
        return { itemId: item.id, daysRemaining: 999, dailyBurnRate: 0, status: 'stable' };
      }

      const daysRemaining = item.currentStock / dailyBurnRate;
      
      let status: StockPrediction['status'] = 'stable';
      if (daysRemaining <= 3) status = 'critical';
      else if (daysRemaining <= 7) status = 'warning';

      return {
        itemId: item.id,
        daysRemaining: Math.round(daysRemaining),
        dailyBurnRate: Number(dailyBurnRate.toFixed(2)),
        status
      };

    } catch (error) {
      logger.error('inventory', 'Erro ao calcular previsão de estoque', { itemId: item.id, error });
      return { itemId: item.id, daysRemaining: 0, dailyBurnRate: 0, status: 'stable' };
    }
  }
}