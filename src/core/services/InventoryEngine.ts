import { InventoryItem, Product } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { coreEventBus } from '../events/CoreEventBus';
import { logger } from './logger';

/**
 * Universal Inventory Engine
 * Handles recursive stock deduction, yield factors, and atomic synchronization.
 */
export class InventoryEngine {
  /**
   * Recursively resolves and adjusts stock for a list of items.
   * Supports complex compositions (combos/kits) and yield factors.
   */
  static async adjustStockRecursive(
    items: { id: string; quantity: number; name?: string; composition?: any }[],
    multiplier: number, // 1 for deduction, -1 for return
    enterpriseId: string,
    shopId: string,
    inventory: InventoryItem[]
  ) {
    const adjustments: { id: string; amount: number; type: 'inventory' | 'product' }[] = [];

    const resolveItem = (item: any, qty: number) => {
      // If the item has a composition (Combo/Kit/Recipe), resolve its ingredients
      if (item.composition && item.composition.length > 0) {
        item.composition.forEach((comp: any) => {
          resolveItem(comp, qty * (comp.quantity || 1));
        });
      } else {
        // Auditoria: Ignorar itens marcados como serviço ou sem controle de estoque
        if (item.type === 'service' || item.trackStock === false) {
          logger.debug('core', 'Ignorando ajuste de estoque para item não estocável', { name: item.name });
          return;
        }

        // Try to find in inventory first (Ingredients)
        const invItem = inventory.find(i => 
          i.id === item.inventoryItemId || 
          i.id === item.id || 
          (item.name && i.name.toLowerCase() === item.name.toLowerCase())
        );

        if (invItem) {
          const yieldFactor = invItem.yieldFactor || 1;
          const totalAdjustment = (qty * multiplier) / yieldFactor;
          
          const existing = adjustments.find(a => a.id === invItem.id && a.type === 'inventory');
          if (existing) {
            existing.amount += totalAdjustment;
          } else {
            adjustments.push({ id: invItem.id, amount: totalAdjustment, type: 'inventory' });
          }
        } else {
          // Fallback to direct Product stock (Retail/Market)
          const existing = adjustments.find(a => a.id === item.id && a.type === 'product');
          if (existing) {
            existing.amount += qty * multiplier;
          } else {
            adjustments.push({ id: item.id, amount: qty * multiplier, type: 'product' });
          }
        }

        // Modifiers can affect stock usage:
        // - extra: consumes additional stock
        // - remove: reduces stock usage of linked ingredient
        if (Array.isArray(item.modifiers) && item.modifiers.length > 0) {
          item.modifiers.forEach((mod: any) => {
            if (!mod?.inventoryItemId) return;
            if (mod.type === 'allergy') return; // informational only
            const modifierSign = mod.type === 'remove' ? -1 : 1;
            const modifierQty = qty * modifierSign;
            const modifierItem = { id: mod.inventoryItemId, quantity: modifierQty, composition: [] };
            resolveItem(modifierItem, modifierQty);
          });
        }
      }
    };

    items.forEach(item => resolveItem(item, item.quantity));

    if (adjustments.length > 0) {
      try {
        await firebaseService.runTransaction(async (tx) => {
          for (const adj of adjustments) {
            const collectionName = adj.type === 'inventory' ? 'inventory' : 'products';
            const ref = firebaseService.getDocRef(collectionName, adj.id);
            const snap = await tx.get(ref);
            
            if (snap.exists()) {
              const data = snap.data();
              const currentStock = Number(adj.type === 'inventory' ? data.currentStock : data.stock) || 0;
              const nextStock = Math.max(0, currentStock - adj.amount);
              
              tx.update(ref, { 
                [adj.type === 'inventory' ? 'currentStock' : 'stock']: nextStock,
                updatedAt: Date.now() 
              });
            }
          }
        });
        
        // Notify the rest of the system via Event Bus
        adjustments.forEach(adj => {
          coreEventBus.emit('inventory:updated', { 
            id: adj.id, 
            type: adj.type,
            amount: -adj.amount
          });
        });

        logger.info('core', 'INVENTORY_ADJUSTMENT_SUCCESS', { count: adjustments.length });
      } catch (error) {
        logger.error('core', 'INVENTORY_ADJUSTMENT_FAILED', { error });
        throw error;
      }
    }
  }

  /**
   * Realiza um ajuste manual direto no item de inventário ou produto.
   * Utiliza transação para garantir que o cálculo seja baseado no valor mais recente do servidor.
   */
  static async manualAdjustment(itemId: string, delta: number, collection: 'inventory' | 'products' = 'inventory') {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef(collection, itemId);
        const snap = await tx.get(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          const field = collection === 'inventory' ? 'currentStock' : 'stock';
          const current = Number(data[field]) || 0;
          const next = Math.max(0, current + delta);
          
          tx.update(ref, { [field]: next, updatedAt: Date.now() });
        }
      });
      logger.info('core', 'MANUAL_INVENTORY_ADJUSTMENT_SUCCESS', { itemId, delta });
    } catch (error) {
      logger.error('core', 'MANUAL_INVENTORY_ADJUSTMENT_FAILED', { itemId, error });
      throw error;
    }
  }
}
