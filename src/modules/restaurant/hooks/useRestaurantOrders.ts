import { useState, useCallback, useMemo } from 'react';
import { Product, Order, OrderItem, Table } from '../../../types';
import { calculateOrderTotals as calcTotals } from '../../../core/utils/OrderCalculator';

export const useRestaurantOrders = (
  initialOrders: Order[], 
  selectedTable: Table | null,
  serviceChargePercentage: number = 10,
  taxPercentage: number = 0
) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const calculateOrderTotals = useCallback((items: OrderItem[], discount: number, isTakeaway: boolean) => {
    return calcTotals(items, discount, isTakeaway, { 
      serviceCharge: serviceChargePercentage, 
      taxRate: taxPercentage 
    });
  }, [serviceChargePercentage, taxPercentage]);

  const activeOrder = useMemo(() => 
    initialOrders.find(o => o.tableId === selectedTable?.id && o.status !== 'delivered'),
  [initialOrders, selectedTable]);

  const handleAddToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id && i.status === 'pending');
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        productId: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1,
        status: 'pending',
        sentToKitchen: false
      }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  }, []);

  return {
    cart,
    setCart,
    searchQuery,
    setSearchQuery,
    activeOrder,
    calculateOrderTotals,
    handleAddToCart,
    removeFromCart
  };
};
