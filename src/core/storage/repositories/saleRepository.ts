import { indexedDBAdapter } from '../adapters/indexedDBAdapter';
import { Sale } from '../types';
import { coreEventBus } from '../../events/CoreEventBus';
import { CoreSale } from '../../types';

class SaleRepository {
  async create(sale: Sale): Promise<Sale> {
    const created = await indexedDBAdapter.add('sales', sale);
    coreEventBus.emit('sale:created', created as unknown as CoreSale);
    return created;
  }

  async update(sale: Sale): Promise<Sale> {
    const updated = await indexedDBAdapter.update('sales', sale);
    // coreEventBus.emit('sale:updated', updated as unknown as CoreSale);
    return updated;
  }

  async findById(id: string): Promise<Sale | undefined> {
    return indexedDBAdapter.get<Sale>('sales', id);
  }

  async findAll(): Promise<Sale[]> {
    return indexedDBAdapter.getAll<Sale>('sales');
  }

  async findUnsynced(): Promise<Sale[]> {
    const all = await this.findAll();
    return all.filter((sale) => !sale.synced);
  }
}

export const saleRepository = new SaleRepository();

