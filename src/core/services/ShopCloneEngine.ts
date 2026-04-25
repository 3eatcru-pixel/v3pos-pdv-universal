import { firebaseService } from '../../services/firebaseService';
import { Shop, Product, Category } from '../../types';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';

export interface CloneOptions {
  cloneProducts: boolean;
  cloneCategories: boolean;
  syncMenuChanges: boolean; // Se true, alterações no mestre refletem aqui
  resetStock: boolean;
}

export class ShopCloneEngine {
  /**
   * Clona uma loja existente para criar uma nova localidade.
   */
  static async cloneShop(
    enterpriseId: string,
    sourceEnterpriseId: string, // Adicionado para permitir puxar de outras empresas/templates
    sourceShopId: string,
    newShopData: Partial<Shop>,
    options: CloneOptions = { cloneProducts: true, cloneCategories: true, syncMenuChanges: true, resetStock: true }
  ): Promise<string> {
    const newShopId = `shop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    try {
      logger.info('core', 'Iniciando clonagem de loja', { sourceShopId, newShopId });

      // 1. Criar o documento da nova Loja
      const newShop: Shop = {
        ...newShopData,
        id: newShopId,
        enterpriseId,
        createdAt: Date.now(),
        status: 'active',
      } as Shop;

      await firebaseService.saveItem('shops', newShopId, newShop);

      // 2. Tratar Categorias e Menu
      if (options.cloneCategories) {
        // Busca categorias da empresa de origem (Template ou Loja Mãe)
        const categories = await firebaseService.getDocsByQuery('categories', [
          { field: 'enterpriseId', op: '==', value: sourceEnterpriseId },
          { field: 'shopId', op: '==', value: sourceShopId }
        ]) as Category[];
        for (const cat of categories) {
          const newCat = { 
            ...cat, 
            id: generateSafeId('cat'), 
            shopId: newShopId,
            // Se syncMenuChanges for true, mantemos uma referência ao ID original para atualizações em massa
            masterCategoryId: options.syncMenuChanges ? cat.id : null 
          };
          await firebaseService.saveItem('categories', newCat.id, newCat);
        }
      }

      // 3. Tratar Produtos (Sem clonar estoque)
      if (options.cloneProducts) {
        // Busca produtos da empresa de origem
        const products = await firebaseService.getDocsByQuery('products', [
          { field: 'enterpriseId', op: '==', value: sourceEnterpriseId },
          { field: 'shopId', op: '==', value: sourceShopId }
        ]) as Product[];
        
        for (const prod of products) {
          // No nosso sistema universal, produtos podem ser Enterprise-wide.
          // Se o produto for específico da loja, clonamos. Se for global, apenas liberamos para a nova loja.
          if (prod.shopId === sourceShopId) {
            const newProd = {
              ...prod,
              id: generateSafeId('prod'),
              shopId: newShopId,
              stock: options.resetStock ? 0 : prod.stock,
              currentStock: options.resetStock ? 0 : (prod as any).currentStock,
              masterProductId: options.syncMenuChanges ? prod.id : null,
              // Inicialmente disponível em todos os locais clonados
              availableInShops: [newShopId]
            };
            await firebaseService.saveItem('products', newProd.id, newProd);
          }
        }
      }

      logger.info('core', 'Clonagem de unidade concluída com sucesso', { newShopId });
      return newShopId;
    } catch (error) {
      logger.error('core', 'Falha crítica ao clonar unidade', { error, sourceShopId });
      throw error;
    }
  }
}