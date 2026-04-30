import { useState, useMemo } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variation?: string;
  staffId?: string; // Adicionado para vincular o item ao staff que o adicionou/vendeu
  unitType?: 'un' | 'kg' | 'm' | 'h'; // Adicionado 'h' para Serviços
  metadata?: Record<string, any>; // Para modificadores de restaurante ou variantes
  professionalId?: string; // ID do profissional que realizou o serviço
  status?: 'pending' | 'production' | 'ready' | 'delivered'; // Para Restaurante/KDS
  notes?: string; // Observações de cozinha
}

export const useRetailCart = (taxRate: number = 0.05) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [cart, taxRate]);

  const handleAddToCart = (product: any, metadata?: Record<string, any>, customQuantity?: number, notes?: string) => {
    setCart(prev => {
      // Identifica item por ID + variação para não agrupar tamanhos diferentes
      // No restaurante, itens com notas diferentes NÃO devem ser agrupados
      const existing = prev.find(i => i.id === product.id && i.variation === product.selectedVariation && i.notes === notes);
      
      if (existing && !notes) {
        const addQty = customQuantity ?? (product.defaultQuantity || 1);
        return prev.map(i => (i.id === product.id && i.variation === product.selectedVariation && i.notes === notes) ? { ...i, quantity: i.quantity + addQty } : i);
      }
      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: customQuantity ?? (product.defaultQuantity || 1),
        status: 'pending',
        notes: notes,
        unitType: product.unitType || 'un',
        variation: product.selectedVariation,
        metadata: metadata || product.metadata
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateCartQuantity = (id: string, delta: number, variation?: string, notes?: string) => {
    setCart(prev => prev
      .map(item => {
        if (item.id === id && item.variation === variation && item.notes === notes) {
          const step = item.unitType === 'un' ? 1 : (item.unitType === 'h' ? 0.25 : 0.001); // 1g de precisão para balança
          const newQty = item.quantity + (delta * step);
          return { 
            ...item, 
            quantity: item.unitType === 'un' 
              ? Math.max(1, Math.round(newQty)) 
              : Math.max(0.001, parseFloat(newQty.toFixed(3))) 
          };
        }
        return item;
      })
      .filter(item => item.quantity > 0)
    );
  };

  const updateItemStatus = (id: string, status: CartItem['status'], variation?: string, notes?: string) => {
    setCart(prev => prev.map(item => 
      (item.id === id && item.variation === variation && item.notes === notes)
        ? { ...item, status }
        : item
    ));
  };

  const clearCart = () => setCart([]);

  return {
    cart, ...totals, handleAddToCart, removeFromCart, updateCartQuantity, updateItemStatus, clearCart
  };
};