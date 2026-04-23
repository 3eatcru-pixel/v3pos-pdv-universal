import { indexedDBAdapter } from '../adapters/indexedDBAdapter';
import { coreEventBus } from '../../events/CoreEventBus';

type InventoryItem = { id: string; shopId?: string; enterpriseId?: string; currentStock: number; minStock: number; costPerUnit: number; [key: string]: any };

class InventoryRepository {
  async create(item: InventoryItem): Promise<InventoryItem> {
    const created = await indexedDBAdapter.add('inventory', item);
    coreEventBus.emit('inventory:updated', created);
    return created;
  }

  async update(item: InventoryItem): Promise<InventoryItem> {
    const updated = await indexedDBAdapter.update('inventory', item);
    coreEventBus.emit('inventory:updated', updated);
    return updated;
  }

  async findById(id: string): Promise<InventoryItem | undefined> {
    return indexedDBAdapter.get<InventoryItem>('inventory', id);
  }

  async findAll(): Promise<InventoryItem[]> {
    return indexedDBAdapter.getAll<InventoryItem>('inventory');
  }

  async findByShop(shopId: string): Promise<InventoryItem[]> {
    const all = await this.findAll();
    return all.filter(o => o.shopId === shopId);
  }

  async adjustStock(id: string, quantity: number): Promise<void> {
    const item = await this.findById(id);
    if (!item) return;
    const updated = { ...item, currentStock: item.currentStock + quantity };
    await this.update(updated);
  }
}

export const inventoryRepository = new InventoryRepository();
