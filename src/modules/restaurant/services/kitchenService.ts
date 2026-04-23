import { orderRepository } from '../../../core/storage/repositories/orderRepository';
import { firebaseService } from '../../../services/firebaseService';
import { Order, ItemStatus } from '../../../types';

class KitchenService {
  private barCategories = ['Bebidas', 'Bar', 'FOH'];

  async acceptItems(order: Order, isBar: boolean): Promise<void> {
    const updatedItems = order.items.map(item => {
      const isItemBar = this.barCategories.includes(item.category);
      if (((isBar && isItemBar) || (!isBar && !isItemBar)) && item.status === 'pending') {
        return { ...item, status: 'preparing' as ItemStatus };
      }
      return item;
    });

    const updatedOrder = { ...order, items: updatedItems, status: 'preparing' as const };
    
    // Local Update
    await orderRepository.update(updatedOrder);
    
    // Cloud Sync (Service handles this via events usually, but for now we maintain direct sync)
    await firebaseService.updateItem('orders', order.id, { 
      items: updatedItems, 
      status: 'preparing' 
    });
  }

  async markItemsReady(order: Order, isBar: boolean): Promise<void> {
    const updatedItems = order.items.map(item => {
      const isItemBar = this.barCategories.includes(item.category);
      if (((isBar && isItemBar) || (!isBar && !isItemBar)) && item.status === 'preparing') {
        return { ...item, status: 'ready' as ItemStatus };
      }
      return item;
    });

    const updatedOrder = { ...order, items: updatedItems };
    
    // Local Update
    await orderRepository.update(updatedOrder);
    
    // Cloud Sync
    await firebaseService.updateItem('orders', order.id, { items: updatedItems });
  }
}

export const kitchenService = new KitchenService();
