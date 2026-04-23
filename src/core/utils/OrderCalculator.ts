import { OrderItem } from '../../types';

export interface OrderTotals {
  subtotal: number;
  serviceFee: number;
  tax: number;
  discount: number;
  total: number;
  totalCost: number;
}

/**
 * Universal Order Calculator
 * Centralizes financial math to prevent inconsistencies between modules.
 */
export const calculateOrderTotals = (
  items: OrderItem[], 
  discount: number, 
  isTakeaway: boolean,
  config: { serviceCharge: number; taxRate: number } = { serviceCharge: 10, taxRate: 0 }
): OrderTotals => {
  const subtotal = items.reduce((sum, item) => {
    const modifiersTotal = (item.modifiers || []).reduce((acc, m) => acc + (m.price || 0), 0);
    // Voided items don't contribute to subtotal
    return sum + (item.status === 'voided' ? 0 : (item.price + modifiersTotal) * item.quantity);
  }, 0);

  const totalCost = items.reduce((sum, item) => {
    // Cost calculation (CMV/COGS)
    // Voided items only count cost if they were already sent to kitchen (wastage)
    const shouldCountCost = item.status !== 'voided' || item.sentToKitchen;
    return sum + (shouldCountCost ? (item.cost || 0) * item.quantity : 0);
  }, 0);

  const serviceFee = isTakeaway ? 0 : Number((subtotal * (config.serviceCharge / 100)).toFixed(2));
  const tax = Number((subtotal * (config.taxRate / 100)).toFixed(2));
  const total = Number((subtotal + serviceFee + tax - discount).toFixed(2));

  return { subtotal, serviceFee, tax, discount, total, totalCost };
};
