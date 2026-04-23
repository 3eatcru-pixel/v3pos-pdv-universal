import { OrderItem, Order } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { coreEventBus } from '../events/CoreEventBus';
import { InventoryEngine } from './InventoryEngine';

/**
 * Universal Order Engine
 * Handles order lifecycle, voiding, and financial calculations.
 */
export class OrderEngine {
  /**
   * Voids an item from an order and handles inventory/financials.
   */
  static async voidItem(
    order: Order,
    itemIndex: number,
    reason: string,
    staff: { id: string; name: string },
    context: { enterpriseId: string; shopId: string; inventory: any[] }
  ) {
    const item = order.items[itemIndex];
    if (!item || item.status === 'voided') return order;

    const updatedItems = [...order.items];
    updatedItems[itemIndex] = {
      ...item,
      status: 'voided',
      voidReason: reason,
      voidedAt: Date.now(),
      voidedBy: staff.name
    };

    // Recalculate Totals
    // Assuming a standard total recalculation here
    const subtotal = updatedItems.reduce((sum, i) => sum + (i.status === 'voided' ? 0 : i.price * i.quantity), 0);
    const totalCost = updatedItems.reduce((sum, i) => {
       const shouldCount = i.status !== 'voided' || i.sentToKitchen;
       return sum + (shouldCount ? (i.cost || 0) * i.quantity : 0);
    }, 0);

    const updates: Partial<Order> = {
      items: updatedItems,
      total: subtotal - (order.discount || 0), // Simple version, modular apps might have complex tax
      totalCost
    };

    // 1. Return Inventory if it was already deducted
    if (item.sentToKitchen || item.status === 'delivered') {
      await InventoryEngine.adjustStockRecursive(
        [item],
        -1, // Return to stock
        context.enterpriseId,
        context.shopId,
        context.inventory
      );
    }

    // 2. Persist Order Change
    await firebaseService.updateItem('orders', order.id, updates);

    // 3. Log Audit
    await firebaseService.addAuditLog({
      enterpriseId: context.enterpriseId,
      shopId: context.shopId,
      staffId: staff.id,
      staffName: staff.name,
      action: 'VOID_ITEM',
      details: `Item "${item.name}" voided. Reason: ${reason}`,
      referenceId: order.id
    });

    // 4. Notify System
    coreEventBus.emit('order:updated', { ...order, ...updates });

    return { ...order, ...updates };
  }
}
