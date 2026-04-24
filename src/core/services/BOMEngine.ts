import { logger } from './logger';
import { CartItem } from '../../modules/retail/hooks/useRetailCart';
import { Product, InventoryItem } from '../../types';

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
   */
  explodeCartToInsumos(cartItems: CartItem[], allProducts: Product[], inventory: InventoryItem[] = []): InsumoAdjustment[] {
    const adjustments: InsumoAdjustment[] = [];

    cartItems.forEach(cartItem => {
      const product = allProducts.find(p => p.id === cartItem.id);

      // Caso 1: O produto tem Ficha Técnica (Ingredientes/Materiais)
      if (product?.ingredients && Object.keys(product.ingredients).length > 0) {
        logger.debug('inventory', 'Explodindo ficha técnica para produto composto', { productName: cartItem.name });
        
        Object.entries(product.ingredients).forEach(([insumoId, qtyPerUnit]) => {
          let targetInsumoId = insumoId;
          
          // Lógica de Substituto: Se o estoque do insumo principal for <= 0 e houver um substituto no cadastro
          const invItem = inventory.find(i => i.id === insumoId);
          if (invItem && invItem.currentStock <= 0 && invItem.substituteId) {
            const subItem = inventory.find(i => i.id === invItem.substituteId);
            if (subItem && subItem.currentStock > 0) {
              targetInsumoId = invItem.substituteId;
              logger.warn('inventory', 'Usando insumo substituto devido a falta de estoque', { 
                original: invItem.name, 
                substitute: subItem.name 
              });
            }
          }

          adjustments.push({
            inventoryItemId: targetInsumoId,
            quantityToDeduct: Number(qtyPerUnit) * cartItem.quantity,
            name: `Insumo para ${cartItem.name}`
          });
        });
      } 
      // Caso 2: Produto simples (Varejo comum) - baixa ele mesmo como insumo
      else {
        adjustments.push({
          inventoryItemId: cartItem.id,
          quantityToDeduct: cartItem.quantity,
          name: cartItem.name
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