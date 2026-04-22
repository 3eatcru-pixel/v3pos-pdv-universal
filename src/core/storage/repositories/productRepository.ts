import { indexedDBAdapter } from '../adapters/indexedDBAdapter';
import { Product, SaleItem } from '../types';

class ProductRepository {
  async create(product: Product): Promise<Product> {
    return indexedDBAdapter.add('products', product);
  }

  async update(product: Product): Promise<Product> {
    return indexedDBAdapter.update('products', product);
  }

  async findById(id: string): Promise<Product | undefined> {
    return indexedDBAdapter.get<Product>('products', id);
  }

  async findAll(): Promise<Product[]> {
    return indexedDBAdapter.getAll<Product>('products');
  }

  async applySaleItems(items: SaleItem[]): Promise<void> {
    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      if (!item.productId || quantity <= 0) continue;

      const existing = await this.findById(item.productId);
      const currentStock = Number(existing?.stock ?? 0);
      if (quantity > currentStock) {
        throw new Error(`insufficient_stock:${item.productId}`);
      }
      const nextStock = currentStock - quantity;

      const productToSave: Product = {
        id: item.productId,
        name: existing?.name || item.name || 'Unknown Product',
        category: existing?.category,
        price: existing?.price ?? item.unitPrice,
        stock: nextStock,
        updatedAt: new Date().toISOString(),
      };

      await this.update(productToSave);
    }
  }
}

export const productRepository = new ProductRepository();

