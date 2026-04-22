import { indexedDBAdapter } from '../adapters/indexedDBAdapter';
import { Sale } from '../types';

class SaleRepository {
  async create(sale: Sale): Promise<Sale> {
    return indexedDBAdapter.add('sales', sale);
  }

  async update(sale: Sale): Promise<Sale> {
    return indexedDBAdapter.update('sales', sale);
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

