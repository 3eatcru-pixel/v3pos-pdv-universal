import { integrationLayer } from '../../../integration/integrationLayer';

export interface TableOrder {
  tableId: string;
  items: any[];
  status: 'preparando' | 'pronto' | 'entregue';
}

class RestaurantService {
  async updateTableStatus(tableId: string, status: 'free' | 'occupied' | 'reserved') {
    await integrationLayer.sendLog('restaurant', 'Updated table status', { tableId, status });
  }

  async sendToKDS(order: TableOrder) {
    await integrationLayer.sendLog('restaurant', 'Order sent to Kitchen Display System', { tableId: order.tableId });
    // KDS logic
  }
}

export const restaurantService = new RestaurantService();
