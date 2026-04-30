import React, { useRef, useEffect, useState } from 'react';
import { Scan, Zap, CreditCard, Banknote, WifiOff, CloudUpload, Activity } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { coreEventBus } from '../../events/CoreEventBus';
import { t } from '../services/LocaleEngine';
import { PrinterEngine } from '../services/PrinterEngine';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
}

export const FastCheckoutView: React.FC<{
  cart: CartItem[];
  total: number;
  onAddByBarcode: (barcode: string) => void;
  onCheckout: (method: 'card' | 'cash') => Promise<void>;
}> = ({ cart, total, onAddByBarcode, onCheckout }) => {
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    // Mantém o foco no input de scan o tempo todo
    const keepFocus = () => scanInputRef.current?.focus();
    
    // Fase 6: Monitor de estado de rede local
    const unsub = coreEventBus.on('system:sync_status', (data) => {
      setIsOffline(data.status !== 'synced');
      if (data.pending !== undefined) setPendingSync(data.pending);
    });

    window.addEventListener('online', () => setIsOffline(false));
    window.addEventListener('offline', () => setIsOffline(true));

    window.addEventListener('click', keepFocus);
    return () => {
      window.removeEventListener('click', keepFocus);
      unsub();
    };
  }, []);

  // Fase 9: Alerta de abandono de checkout (Prevenção de perda de dados)
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`pos_pending_cart_${enterpriseId}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`pos_pending_cart_${enterpriseId}`);
    }
  }, [cart, enterpriseId]);

  const handleCheckoutWithPrint = async (method: 'card' | 'cash') => {
    // Fase 2: Impede fechamento de venda sem valor (prevenção de erro operacional)
    if (total <= 0 && cart.length > 0) {
      alert('Operação Negada: Não é permitido processar vendas com valor total zerado.');
      return;
    }

    // Executa o fechamento original
    await onCheckout(method);
    
    // Fase 9: Dispara impressão do recibo
    PrinterEngine.printReceipt({
      items: cart,
      total,
      paymentMethod: method,
      shopName: 'Nexus Store PDV' // Em produção, vem do contexto do Tenant
    });
  };

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
           {cart.map((item, i) => (
             <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50 italic">
                <span className="font-bold text-slate-800">{item.quantity}x {item.name}</span>
                <span className="font-black text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
             </div>
           ))}
        </div>

        {/* Quick Payment Tiles */}
        <div className="col-span-4 space-y-4">
          <div className="bg-blue-600 p-10 rounded-[3rem] text-white text-center">
             <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">{t('checkout.total')}</p>
             <h2 className="text-6xl font-black italic tracking-tighter">{formatCurrency(total)}</h2>
          </div>
          
          <button onClick={() => handleCheckoutWithPrint('card')} className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black uppercase flex flex-col items-center gap-2 hover:bg-black transition-all relative">
             <CreditCard /> {t('checkout.card')} (F1)
             {isOffline && <div className="absolute top-4 right-4 text-amber-500" title="Processamento Local Ativo"><CloudUpload className="w-4 h-4 animate-bounce" /></div>}
          </button>
          <button onClick={() => handleCheckoutWithPrint('cash')} className="w-full py-8 bg-emerald-600 text-white rounded-[2rem] font-black uppercase flex flex-col items-center gap-2 hover:bg-emerald-700 transition-all relative">
             <Banknote /> {t('checkout.cash')} (F2)
             {isOffline && <div className="absolute top-4 right-4 text-white/50"><WifiOff className="w-4 h-4" /></div>}
          </button>
        </div>
      </div>

      {/* Fase 6: Health Bar persistente */}
      {(isOffline || pendingSync > 0) && (
        <div className="bg-amber-500 text-white px-8 py-2 rounded-full flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <Activity className="w-4 h-4" /> 
            {isOffline ? 'Operando em Contingência Local (Offline)' : 'Sincronização Cloud em Segundo Plano'}
          </div>
          {pendingSync > 0 && <span className="text-[10px] font-black">{pendingSync} operações pendentes</span>}
        </div>
      )}
    </div>
  );
};