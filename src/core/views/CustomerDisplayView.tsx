import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CreditCard, QrCode } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Order } from '../../types';

interface CustomerDisplayProps {
  activeOrder: Order | null;
  shopName: string;
}

export const CustomerDisplayView: React.FC<CustomerDisplayProps> = ({ activeOrder, shopName }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Branding */}
      <header className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-950 text-white">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">{shopName}</h1>
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Terminal Ativo</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Items List */}
        <div className="flex-[2] p-12 overflow-y-auto bg-slate-50/50">
          <AnimatePresence>
            {activeOrder?.items.map((item, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={idx}
                className="flex justify-between items-center py-6 border-b border-slate-100"
              >
                <div className="flex items-center gap-6">
                  <span className="text-2xl font-black text-blue-600">{item.quantity}x</span>
                  <h4 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">{item.name}</h4>
                </div>
                <span className="text-2xl font-black text-slate-900">{formatCurrency(item.totalPrice)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!activeOrder?.items.length && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-40">
               <ShoppingBag size={80} />
               <p className="text-2xl font-black uppercase tracking-widest">Bem-vindo(a)!</p>
            </div>
          )}
        </div>

        {/* Checkout Summary Side */}
        <div className="flex-1 bg-white border-l border-slate-100 p-12 flex flex-col justify-between shadow-2xl relative z-10">
          <div>
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Total a Pagar</p>
             <h2 className="text-8xl font-black text-slate-900 italic tracking-tighter mb-4">
               {formatCurrency(activeOrder?.total || 0)}
             </h2>
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: activeOrder?.items.length ? '100%' : '0%' }}
                  className="h-full bg-blue-600" 
                />
             </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white text-center space-y-6">
             <div className="w-48 h-48 bg-white mx-auto rounded-3xl p-4 flex items-center justify-center">
                {/* Simulação de QR Code para Pagamento */}
                <QrCode className="w-full h-full text-slate-900" />
             </div>
             <p className="text-xs font-black uppercase tracking-widest text-blue-400 italic">Pague via PIX ou Cartão</p>
             <div className="flex justify-center gap-4 opacity-50">
                <CreditCard />
                <ShoppingBag />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};