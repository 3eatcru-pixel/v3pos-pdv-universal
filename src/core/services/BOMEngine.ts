import { logger } from './logger';
import { CartItem } from '../../modules/retail/hooks/useRetailCart';
import { Product, InventoryItem, OrderItem } from '../../types';

export interface InsumoAdjustment {
  inventoryItemId: string;
  quantityToDeduct: number;
  name: string;
}

class BOMEngine {
  /**
   * Transforma uma lista de itens do carrinho em uma lista de insumos para baixa de estoque.
   * Suporta produtos simples (baixa ele mesmo) e compostos (baixa ficha técnica).
   * Agora suporta Insumos Substitutos caso o principal esteja zerado.
   * @param items Itens do carrinho ou do pedido.
   * @param allProducts Lista completa de produtos para resolver composições.
   * @param inventory Lista completa de itens de inventário para verificar estoque e substitutos.
   */
  explodeCartToInsumos(items: (CartItem | OrderItem)[], allProducts: Product[], inventory: InventoryItem[] = []): InsumoAdjustment[] {
    const adjustments: InsumoAdjustment[] = [];

    items.forEach(item => {
      const targetId = (item as OrderItem).productId || item.id;
      const product = allProducts.find(p => p.id === targetId);

      // Caso 1: O produto tem Ficha Técnica (Ingredientes/Materiais)
      if (product?.ingredients && Object.keys(product.ingredients).length > 0) {
        logger.debug('inventory', 'Explodindo ficha técnica para produto composto', { productName: item.name });
        
        Object.entries(product.ingredients).forEach(([insumoId, qtyPerUnit]) => {
          let targetInsumoId = insumoId;

          // Lógica de Substituto: Se o estoque do insumo principal for <= 0 e houver um substituto no cadastro
          const invItem = inventory.find(i => i.id === insumoId);
          const substituteId = (invItem as any)?.substituteId as string | undefined;
          if (invItem && invItem.currentStock <= 0 && substituteId) {
            const subItem = inventory.find(i => i.id === substituteId);
            if (subItem && subItem.currentStock > 0) {
              targetInsumoId = substituteId;
              logger.warn('inventory', 'Usando insumo substituto devido a falta de estoque', { 
                original: invItem.name,
                substitute: subItem.name,
              });
            }
          }

          adjustments.push({
            inventoryItemId: targetInsumoId,
            quantityToDeduct: Number(qtyPerUnit) * item.quantity,
            name: `Insumo para ${item.name}`
          });
        });
      } 
      // Caso 2: Produto simples (Varejo comum) - baixa ele mesmo como insumo
      else {
        adjustments.push({
          inventoryItemId: targetId, 
          quantityToDeduct: item.quantity,
          name: item.name
        });
      }
    });

    return this.consolidateAdjustments(adjustments);
  }

  /**
   * Agrupa insumos repetidos (ex: se dois pratos usam Tomate, soma as quantidades)
   */
  private consolidateAdjustments(adjustments: InsumoAdjustment[]): InsumoAdjustment[] {
    const consolidated: Record<string, InsumoAdjustment> = {};

    adjustments.forEach(adj => {
      if (consolidated[adj.inventoryItemId]) {
        consolidated[adj.inventoryItemId].quantityToDeduct += adj.quantityToDeduct;
      } else {
        consolidated[adj.inventoryItemId] = { ...adj };
      }
    });

    return Object.values(consolidated);
  }
}

export const bomEngine = new BOMEngine();
