import { logger } from '../../../core/services/logger';
import { firebaseService } from '../../../services/firebaseService';
import { RestaurantRoutingEngine } from './RestaurantRoutingEngine';
import { Order } from '../../../types';

export interface RestaurantOrder {
  tableId: string;
  items: any[];
  waiterId: string;
  timestamp: number;
  orderType: 'table' | 'takeaway';
  takeawayNumber?: number;
  enterpriseId: string;
  shopId: string;
}

class RestaurantService {
  /**
   * Envia itens para a fila de produção central (coleção orders)
   */
  async sendToProduction(order: RestaurantOrder) {
    const orderId = order.orderType === 'takeaway' 
      ? `tkw-${Date.now()}` 
      : `mesa-${order.tableId}-${Date.now()}`;

    const orderData: Partial<Order> = {
      id: orderId,
      enterpriseId: order.enterpriseId,
      shopId: order.shopId,
      tableId: order.tableId,
      staffId: order.waiterId,
      items: order.items.map(i => ({
        ...i,
        status: 'pending', // Garçom acabou de enviar
        sentToKitchen: true,
        sentAt: Date.now()
      })),
      status: 'preparing',
      startTime: order.timestamp,
      orderType: order.orderType,
      takeawayNumber: order.takeawayNumber,
      total: order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0) // Total will be recalculated on checkout
    };

    await firebaseService.saveItem('orders', orderId, orderData);
    logger.info('restaurant', 'Pedido enviado para produção', { orderId, type: order.orderType });
    return orderId;
  }
}

export const restaurantService = new RestaurantService();