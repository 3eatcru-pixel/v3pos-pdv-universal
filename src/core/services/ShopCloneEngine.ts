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

      // Encapsular em transação para garantir que nada seja criado se houver erro no meio
      await firebaseService.runTransaction(async (tx) => {
        // 1. Criar o documento da nova Loja
        const newShop: Shop = {
          ...newShopData,
          id: newShopId,
          enterpriseId,
          createdAt: Date.now(),
          status: 'active',
        } as Shop;

        const shopRef = firebaseService.getDocRef('shops', newShopId);
        tx.set(shopRef, newShop);

        // 2. Tratar Categorias
        if (options.cloneCategories) {
          const categories = await firebaseService.getDocsByQuery('categories', [
            { field: 'enterpriseId', op: '==', value: sourceEnterpriseId },
            { field: 'shopId', op: '==', value: sourceShopId }
          ]) as Category[];
          
          for (const cat of categories) {
            const catId = generateSafeId('cat');
            const newCat = { ...cat, id: catId, shopId: newShopId, masterCategoryId: options.syncMenuChanges ? cat.id : null };
            tx.set(firebaseService.getDocRef('categories', catId), newCat);
          }
        }

        // 3. Tratar Produtos
        if (options.cloneProducts) {
          const products = await firebaseService.getDocsByQuery('products', [
            { field: 'enterpriseId', op: '==', value: sourceEnterpriseId },
            { field: 'shopId', op: '==', value: sourceShopId }
          ]) as Product[];
          
          for (const prod of products) {
            if (prod.shopId === sourceShopId) {
              const prodId = generateSafeId('prod');
              const newProd = {
                ...prod,
                id: prodId,
                shopId: newShopId,
                stock: options.resetStock ? 0 : prod.stock,
                currentStock: options.resetStock ? 0 : (prod as any).currentStock,
                masterProductId: options.syncMenuChanges ? prod.id : null,
                availableInShops: [newShopId]
              };
              tx.set(firebaseService.getDocRef('products', prodId), newProd);
            }
          }
        }
      });

      logger.info('core', 'Clonagem de unidade concluída com sucesso', { newShopId });
      return newShopId;
    } catch (error) {
      logger.error('core', 'Falha crítica ao clonar unidade', { error, sourceShopId });
      throw error;
    }
  }
}