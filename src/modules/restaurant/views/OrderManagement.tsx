import React, { useState } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeftRight,
  ChevronLeft,
  UtensilsCrossed,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Table, Order, OrderItem, Staff } from '../../../types';
import { useRestaurantOrders } from '../hooks/useRestaurantOrders';
import { cn, formatCurrency } from '../../../lib/utils';

interface OrderManagementProps {
  products: Product[];
  tables: Table[];
  orders: Order[];
  staff: Staff[];
  selectedTable: Table | null;
  onBack: () => void;
  onAssignTable: (table: Table) => void;
  onSendToKitchen: (orderId: string, items: OrderItem[]) => void;
  onCloseOrder: (orderId: string) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  products,
  tables,
  orders,
  staff,
  selectedTable,
  onBack,
  onAssignTable,
  onSendToKitchen,
  onCloseOrder
}) => {
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const {
    cart,
    setCart,
    searchQuery,
    setSearchQuery,
    activeOrder,
    calculateOrderTotals,
    handleAddToCart,
    removeFromCart
  } = useRestaurantOrders(orders, selectedTable);

  const filteredProducts = products.filter(p => 
    p.active && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const { subtotal, total, discount } = calculateOrderTotals(cart, activeOrder?.discount || 0, !selectedTable);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-8 animate-in fade-in duration-500">
      {/* Product Selection Area */}
      <div className={cn(
        "lg:col-span-2 space-y-6",
        isMobileCartOpen ? "hidden lg:block" : "block"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar produtos ou categorias..."
              className="w-full pl-12 pr-6 py-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-2 custom-scrollbar">
          {filteredProducts.map(product => (
            <motion.button
              key={product.id}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAddToCart(product)}
              className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm text-left group transition-all hover:shadow-xl hover:shadow-slate-200/50"
            >
              <div className={cn(
                "h-32 w-full bg-slate-50 rounded-2xl mb-4 flex items-center justify-center group-hover:bg-emerald-50 transition-colors overflow-hidden relative",
                product.image && "bg-center bg-cover"
              )}
              style={product.image ? { backgroundImage: `url(${product.image})` } : {}}
              >
                {!product.image && <UtensilsCrossed className="w-10 h-10 text-slate-200 group-hover:text-emerald-200" />}
                <div className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                   <Plus className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <h4 className="font-black text-slate-800 line-clamp-1 text-sm tracking-tight">{product.name}</h4>
              <p className="text-[10px] uppercase font-black text-slate-400 mb-3 tracking-widest">{product.category}</p>
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-600">{formatCurrency(product.price)}</span>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">un</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cart / Order Summary */}
      <div className={cn(
        "bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl flex flex-col overflow-hidden sticky top-8 max-h-[calc(100vh-100px)]",
        isMobileCartOpen ? "fixed inset-0 z-50 rounded-none" : "hidden lg:flex"
      )}>
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <ShoppingCart className="w-6 h-6" />
             </div>
             <div>
                <h3 className="font-black text-lg text-slate-900 tracking-tight leading-none">Pedido Atual</h3>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                   {selectedTable ? `Mesa ${selectedTable.number}` : 'Venda Rápida'}
                </span>
             </div>
          </div>
          {isMobileCartOpen && (
             <button onClick={() => setIsMobileCartOpen(false)} className="p-3 bg-white rounded-xl border border-slate-200">
                <ChevronLeft className="w-5 h-5" />
             </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-50">
              <UtensilsCrossed className="w-16 h-16 mb-4" />
              <p className="text-xs font-black uppercase tracking-[0.2em]">Carrinho Vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl group transition-all border border-transparent hover:border-slate-100">
                <div className="flex-1">
                  <h5 className="font-black text-slate-800 text-sm tracking-tight">{item.name}</h5>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
                  <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-900 w-4 text-center">{item.quantity}</span>
                  <button onClick={() => handleAddToCart({ id: item.productId, name: item.name, price: item.price } as any)} className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-900 text-white rounded-t-[3rem] space-y-6">
          <div className="space-y-3">
             <div className="flex justify-between items-center opacity-60">
                <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                <span className="text-xs font-bold">{formatCurrency(subtotal)}</span>
             </div>
             <div className="flex justify-between items-center text-emerald-400">
                <span className="text-[10px] font-black uppercase tracking-widest">Total Geral</span>
                <span className="text-2xl font-black tracking-tighter">{formatCurrency(total)}</span>
             </div>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => {
              if (activeOrder) onSendToKitchen(activeOrder.id, cart);
              else console.log('Create new order');
            }}
            className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
          >
            Enviar para Cozinha
          </button>
        </div>
      </div>
    </div>
  );
};
