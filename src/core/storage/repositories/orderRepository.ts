import { indexedDBAdapter } from '../adapters/indexedDBAdapter';
import { coreEventBus } from '../../events/CoreEventBus';

type Order = { id: string; shopId?: string; [key: string]: any };

class OrderRepository {
  async create(order: Order): Promise<Order> {
    const created = await indexedDBAdapter.add('orders', order);
    coreEventBus.emit('order:created', created);
    return created;
  }

  async update(order: Order): Promise<Order> {
    const updated = await indexedDBAdapter.update('orders', order);
    coreEventBus.emit('order:updated', updated);
    return updated;
  }

  async findById(id: string): Promise<Order | undefined> {
    return indexedDBAdapter.get<Order>('orders', id);
  }

  async findAll(): Promise<Order[]> {
    return indexedDBAdapter.getAll<Order>('orders');
  }

  async findByShop(shopId: string): Promise<Order[]> {
    const all = await this.findAll();
    return all.filter(o => o.shopId === shopId);
  }
}

export const orderRepository = new OrderRepository();
