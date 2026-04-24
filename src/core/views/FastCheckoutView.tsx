import React, { useRef, useEffect } from 'react';
import { Scan, Zap, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

export const FastCheckoutView: React.FC<any> = ({ cart, total, onAddByBarcode, onCheckout }) => {
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Mantém o foco no input de scan o tempo todo
    const keepFocus = () => scanInputRef.current?.focus();
    window.addEventListener('click', keepFocus);
    return () => window.removeEventListener('click', keepFocus);
  }, []);

  return (
    <div className="h-full flex flex-col gap-6 font-sans">
      {/* Scanner Bar */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-2xl shadow-slate-900/40 border border-white/10">
        <div className="p-4 bg-blue-500 rounded-2xl text-white animate-pulse">
          <Scan className="w-8 h-8" />
        </div>
        <input 
          ref={scanInputRef}
          autoFocus
          placeholder="AGUARDANDO SCANNER..."
          className="bg-transparent border-none text-white text-4xl font-black italic tracking-tighter w-full outline-none placeholder:text-white/10"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAddByBarcode(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
        <div className="text-right">
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Itens</p>
           <p className="text-3xl font-black text-white">{cart.length}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Items List (Minimized) */}
        <div className="col-span-8 bg-white rounded-[3rem] border border-slate-100 p-8 overflow-y-auto">
           {cart.map((item: any, i: number) => (
             <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 italic">
                <span className="font-bold text-slate-800">{item.quantity}x {item.name}</span>
                <span className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
             </div>
           ))}
        </div>

        {/* Quick Payment Tiles */}
        <div className="col-span-4 space-y-4">
          <div className="bg-blue-600 p-10 rounded-[3rem] text-white text-center">
             <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">Total Venda</p>
             <h2 className="text-6xl font-black italic tracking-tighter">{formatCurrency(total)}</h2>
          </div>
          
          <button onClick={() => onCheckout('card')} className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black uppercase flex flex-col items-center gap-2 hover:bg-black transition-all">
             <CreditCard /> CARTÃO (F1)
          </button>
          <button onClick={() => onCheckout('cash')} className="w-full py-8 bg-emerald-600 text-white rounded-[2rem] font-black uppercase flex flex-col items-center gap-2 hover:bg-emerald-700 transition-all">
             <Banknote /> DINHEIRO (F2)
          </button>
        </div>
      </div>
    </div>
  );
};