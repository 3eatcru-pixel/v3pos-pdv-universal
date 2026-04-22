import React from 'react';
import { Trash2, Plus, Minus, CreditCard, Banknote, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  category?: string;
  requiresWeight?: boolean;
}

interface POSCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (method: 'cash' | 'card') => void;
}

export const POSCart: React.FC<POSCartProps> = ({ items, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-emerald-500" />
          Carrinho
        </h3>
        <span className="bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full">
          {items.length} Itens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-emerald-50 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">{item.name}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {formatCurrency(item.price)} / {item.unit}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                  <button 
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-mono font-black text-sm text-slate-800">
                    {item.quantity}
                  </span>
                  <button 
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-24 text-right">
                  <span className="font-mono font-black text-emerald-600">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>

                <button 
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
            <ShoppingCart className="w-16 h-16 mb-4" />
            <p className="font-black uppercase tracking-widest text-xs">Seu carrinho está vazio</p>
          </div>
        )}
      </div>

      <div className="p-8 bg-slate-900 border-t border-white/5 space-y-6">
        <div className="flex items-center justify-between text-white">
          <span className="text-xs font-black uppercase tracking-[0.2em] opacity-50">Total da Compra</span>
          <span className="text-4xl font-black tracking-tighter">
            {formatCurrency(total)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={items.length === 0}
            onClick={() => onCheckout('card')}
            className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-white/10 transition-all group disabled:opacity-50"
          >
            <CreditCard className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase text-white tracking-widest">Cartão</span>
          </button>
          
          <button 
            disabled={items.length === 0}
            onClick={() => onCheckout('cash')}
            className="flex flex-col items-center gap-3 p-6 bg-emerald-500 hover:bg-emerald-400 rounded-[2rem] transition-all group disabled:opacity-50 shadow-xl shadow-emerald-500/20"
          >
            <Banknote className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase text-white tracking-widest">Dinheiro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
