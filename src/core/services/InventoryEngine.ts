import { InventoryItem, Product } from '../types';
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
    items: { id: string; quantity: number; composition?: any }[],
    multiplier: number, // 1 for deduction, -1 for return
    enterpriseId: string,
    shopId: string,
    inventory: InventoryItem[]
  ) {
    const adjustments: { id: string; amount: number }[] = [];

    const resolveItem = (item: any, qty: number) => {
      // If the item has a composition (Combo/Kit/Recipe), resolve its ingredients
      if (item.composition && item.composition.length > 0) {
        item.composition.forEach((comp: any) => {
          resolveItem(comp, qty * (comp.quantity || 1));
        });
      } else {
        // Try to find in inventory first (Ingredients)
        const invItem = inventory.find(i => 
          i.id === item.inventoryItemId || 
          i.id === item.id || 
          i.name.toLowerCase() === item.name.toLowerCase()
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

        logger.log('core', 'INVENTORY_ADJUSTMENT_SUCCESS', { count: adjustments.length });
      } catch (error) {
        logger.log('core', 'INVENTORY_ADJUSTMENT_FAILED', { error });
        throw error;
      }
    }
  }
}
