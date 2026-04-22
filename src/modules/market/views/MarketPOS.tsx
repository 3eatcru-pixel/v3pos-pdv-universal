import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Scan, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Zap,
  ArrowRight,
  User,
  Scale,
  History,
  LayoutGrid,
  Monitor,
  Printer,
  ChevronRight,
  ChevronDown,
  X,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Product, Transaction } from '../../../types';
import { firebaseService } from '../../../services/firebaseService';
import { paymentService } from '../../../services/paymentService';
import { accountService } from '../../../core/services/accountService';

interface POSItem extends Product {
  quantity: number;
}

export const MarketPOS: React.FC = () => {
  const [cart, setCart] = useState<POSItem[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingSale, setProcessingSale] = useState(false);
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal; 

  useEffect(() => {
    const user = accountService.getCurrentUser();
    const entId = user?.companyId || accountService.getCurrentCompanyId() || 'default';
    const sId = localStorage.getItem('rm_selected_shop_id') || 'default';

    const unsub = firebaseService.subscribeCollection('products', entId, sId, (data) => {
      setProducts(data as Product[]);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleScan = (barcode: string) => {
    setLastScanned(barcode);
    const product = products.find(p => p.barcode === barcode);
    if (product) {
       addItemToCart(product);
    }
  };

  const addItemToCart = (product: Product) => {
    if (product.unit === 'kg') {
      const weight = (Math.random() * 1.5 + 0.2).toFixed(3);
      const quantity = parseFloat(weight);
      const existing = cart.find(i => i.id === product.id);
      if (existing) {
        setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i));
      } else {
        setCart([...cart, { ...product, quantity }]);
      }
    } else {
      const existing = cart.find(i => i.id === product.id);
      if (existing) {
        setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setCart([...cart, { ...product, quantity: 1 }]);
      }
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0.001, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleOpenPayment = () => {
    const user = accountService.getCurrentUser();
    const entId = user?.companyId || accountService.getCurrentCompanyId() || 'default';
    const sId = localStorage.getItem('rm_selected_shop_id') || 'default';

    paymentService.requestPaymentUI({
      total: total,
      orderId: `MK-${Date.now().toString().substr(-6)}`,
      title: 'Checkout Supermercado',
      itemsSummary: `${cart.length} produtos`,
      module: 'market',
      onSuccess: async (payments) => {
        setProcessingSale(true);
        try {
          for (const p of payments) {
            await paymentService.processPayment({
              amount: p.amount,
              method: p.method,
              module: 'market',
              shopId: sId,
              change: p.change || 0
            });
          }

          const stockItems = cart.map(item => ({
            productId: item.id,
            quantity: item.quantity
          }));

          await firebaseService.decrementProductStocksAtomic(stockItems, { enterpriseId: entId });

          setCart([]);
        } catch (err) {
          console.error('Error finalizing market sale:', err);
          throw err;
        } finally {
          setProcessingSale(false);
        }
      }
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cart]);

  return (
    <div className="flex flex-col lg:flex-row gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans pb-24 lg:pb-0">
      <div className="flex-1 flex flex-col gap-8">
         <div className="flex-col gap-8 flex h-[60%]">
            <div className="bg-white border border-slate-100 rounded-[4.5rem] p-4 shadow-sm">
               <BarcodeScanner onScan={handleScan} />
            </div>
            
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex-1 group">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20">
                        <Monitor className="w-5 h-5 text-emerald-400" />
                     </div>
                     <h3 className="text-sm font-black uppercase tracking-widest italic outline-text">Terminal Ativo</h3>
                  </div>
                  <div className="flex items-center gap-4">
                     <button
                        onClick={() => setIsQuickStockOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-2 border-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-md"
                     >
                        <Package className="w-4 h-4 text-slate-400" /> Gestão de Faltas (86)
                     </button>
                     <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                        <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Aguardando Registro</span>
                     </div>
                  </div>
               </div>

               <div className="flex-1 flex flex-col items-center justify-center h-full">
                  <AnimatePresence mode="wait">
                    {lastScanned ? (
                      <motion.div 
                        key={lastScanned}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        className="text-center"
                      >
                         <Scan className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-pulse" />
                         <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-1">Bip!</h2>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Último Código: {lastScanned}</p>
                      </motion.div>
                    ) : (
                      <div className="text-center opacity-30">
                         <Scan className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                         <p className="text-xs font-black uppercase tracking-tighter italic">Nenhum produto lido</p>
                      </div>
                    )}
                  </AnimatePresence>
               </div>
               
               <div className="absolute inset-x-0 bottom-0 p-8 flex justify-center gap-2">
                   {[
                     { b: '789123', l: 'Leite' }, 
                     { b: '789456', l: 'Pão' }, 
                     { b: '789000', l: 'Maçã (Kg)' }
                   ].map(item => (
                     <button 
                      key={item.b} 
                      onClick={() => handleScan(item.b)} 
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[8px] font-black uppercase tracking-widest transition-all"
                     >
                        Simular {item.l}
                     </button>
                   ))}
                </div>
               
               <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
            </div>
         </div>

         <div className="flex-1 grid grid-cols-4 gap-6">
            {[
              { n: 'Hortifruti', c: 'bg-emerald-500' },
              { n: 'Padaria', c: 'bg-amber-500' },
              { n: 'Açougue', c: 'bg-rose-500' },
              { n: 'Bebidas', c: 'bg-indigo-500' },
              { n: 'Frios', c: 'bg-blue-500' },
              { n: 'Mercearia', c: 'bg-slate-700' },
              { n: 'Limpeza', c: 'bg-purple-500' },
              { n: 'Higiene', c: 'bg-pink-500' },
            ].map((cat, i) => (
              <button key={i} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:scale-105 transition-all group">
                 <div className={cn("w-12 h-12 rounded-2xl group-hover:rotate-6 transition-transform", cat.c)} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-800 transition-colors">{cat.n}</span>
              </button>
            ))}
         </div>
      </div>

      <div className="w-full lg:w-[580px] bg-white rounded-[2rem] sm:rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col overflow-hidden relative font-sans">
         <div className="p-10 border-b border-slate-50 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <ShoppingCart className="w-6 h-6 text-white" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-widest italic text-sm">Lista de Itens</h3>
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{cart.length} PRODUTOS REGISTRADOS</p>
               </div>
            </div>
            <button 
              onClick={() => setCart([])}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group"
            >
               <Trash2 className="w-5 h-5 text-white group-hover:text-rose-400" />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-slate-50/30" ref={scrollRef}>
            <AnimatePresence>
               {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-20">
                     <LayoutGrid className="w-16 h-16 text-slate-400" />
                     <p className="text-xl font-black uppercase tracking-tighter italic">Nenhum item <br /> no cupom fiscal</p>
                  </div>
               ) : (
                  cart.map((item, idx) => (
                    <motion.div 
                      key={`${item.id}-${idx}`}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group"
                    >
                       <div className="flex items-center gap-6">
                          <span className="text-[10px] font-black text-slate-300">00{idx + 1}</span>
                          <div>
                             <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.name}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{item.barcode} • {item.quantity}{item.unit} x {formatCurrency(item.price)}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-lg font-black text-slate-900 italic tracking-tighter">{formatCurrency(item.price * item.quantity)}</p>
                          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => updateQuantity(item.id, - (item.unit === 'kg' ? 0.1 : 1))}
                                className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => updateQuantity(item.id, (item.unit === 'kg' ? 0.1 : 1))}
                                className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                          </div>
                       </div>
                    </motion.div>
                  ))
               )}
            </AnimatePresence>
         </div>

         <div className="p-12 border-t border-slate-100 bg-white space-y-10">
            <div className="space-y-4">
               <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] italic">
                  <span>Subtotal Fiscal</span>
                  <span>{formatCurrency(subtotal)}</span>
               </div>
               <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] italic">
                  <span>Descontos de Oferta</span>
                  <span className="text-emerald-500">- R$ 0,00</span>
               </div>
               <div className="h-[2px] bg-slate-100 border-dashed border-slate-200" />
               <div className="flex items-center justify-between">
                  <span className="text-2xl font-black uppercase italic tracking-tighter">Total a Pagar</span>
                  <span className="text-5xl font-black text-slate-900 tracking-tighter italic">{formatCurrency(total)}</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button className="py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-200 transition-all">
                  <User className="w-5 h-5" /> CPF Inclusão
               </button>
               <button className="py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-200 transition-all">
                  <Printer className="w-5 h-5" /> Reimprimir
               </button>
            </div>

            <button 
              onClick={handleOpenPayment}
              disabled={cart.length === 0 || processingSale}
              className="w-full py-8 bg-emerald-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-6 hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-200 group disabled:opacity-50 disabled:grayscale"
            >
               {processingSale ? 'Processando...' : 'Finalizar Pagamento'} <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
         </div>

         <div className="absolute top-1/2 -left-12 -translate-y-1/2 w-24 h-24 bg-white rounded-full border-8 border-slate-50 z-20" />
      </div>

      <AnimatePresence>
        {isQuickStockOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    Gestão de Faltas (Mercado)
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Ative ou esgote itens das gôndolas</p>
                </div>
                <button onClick={() => setIsQuickStockOpen(false)} className="p-3 bg-white/10 rounded-2xl text-slate-300 hover:text-white hover:bg-rose-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={async () => {
                        await firebaseService.updateItem('products', p.id, { active: !p.active });
                        setProducts(products.map(prod => prod.id === p.id ? { ...prod, active: !prod.active } : prod));
                      }}
                      className={cn(
                        "p-6 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col items-start gap-4 ring-offset-2",
                        p.active ? "bg-white border-slate-100 hover:border-emerald-200" : "bg-rose-50 border-rose-200 ring-2 ring-rose-500 shadow-lg shadow-rose-500/20"
                      )}
                    >
                       <div className="w-full flex items-start justify-between gap-4">
                         <div>
                           <span className={cn(
                             "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block",
                             p.active ? "bg-slate-100 text-slate-500" : "bg-rose-500 text-white"
                           )}>
                             {p.category}
                           </span>
                           <h4 className={cn("font-black text-sm uppercase tracking-tight", p.active ? "text-slate-800" : "text-rose-900 line-through decoration-rose-500/50 decoration-2")}>{p.name}</h4>
                         </div>
                         <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2", p.active ? "bg-emerald-50 border-emerald-200 text-emerald-500" : "bg-rose-100 border-rose-300 text-rose-600")}>
                           <Package className="w-5 h-5 line-through" />
                         </div>
                       </div>
                       <p className={cn("text-[10px] font-bold uppercase tracking-widest", p.active ? "text-emerald-600" : "text-rose-600")}>
                         {p.active ? 'Em Estoque' : 'Gôndola Vazia'}
                       </p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
