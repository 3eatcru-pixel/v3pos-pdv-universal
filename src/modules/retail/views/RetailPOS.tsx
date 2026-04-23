import React, { useEffect, useState } from 'react';
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
  Ticket,
  ChevronRight,
  LayoutGrid,
  List,
  X,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../../../services/firebaseService';
import { cn, formatCurrency } from '../../../lib/utils';
import { paymentService } from '../../../services/paymentService';
import { retailService, RetailSyncStatus } from '../services/retailService';
import { accountService } from '../../../core/services/accountService';
import { BarcodeEngine } from '../../../core/services/BarcodeEngine';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variation?: string;
}

type PaymentMethod = 'card' | 'cash' | 'pix';

export const RetailPOS: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isQuickStockOpen, setIsQuickStockOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<RetailSyncStatus>({
    connected: false,
    pendingCount: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    isRetrying: false,
    resentInSession: 0,
    recentEvents: [],
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  useEffect(() => {
    const user = accountService.getCurrentUser();
    const entId = user?.companyId || accountService.getCurrentCompanyId() || 'default';
    const sId = localStorage.getItem('rm_selected_shop_id') || 'default';

    const unsub = firebaseService.subscribeCollection('products', entId, sId, (data) => {
      // Filter for retail relevant categories if needed, or just show all
      setProducts(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSyncStatus = async () => {
      const status = await retailService.getSyncQueueStatus();
      if (isMounted) {
        setSyncStatus(status);
      }
    };

    const onSyncStatus = (event: Event) => {
      const detail = (event as CustomEvent<RetailSyncStatus>).detail;
      if (!detail || !isMounted) return;
      setSyncStatus(detail);
    };

    void loadSyncStatus();
    window.addEventListener('retail:sync-status', onSyncStatus as EventListener);
    const syncPolling = window.setInterval(() => {
      void loadSyncStatus();
    }, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener('retail:sync-status', onSyncStatus as EventListener);
      window.clearInterval(syncPolling);
    };
  }, []);

  const handleAddToCart = (product: any) => {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      setCart(cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0)
    );
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) return alert('Carrinho vazio!');

    paymentService.requestPaymentUI({
      total: total,
      orderId: `RT-${Date.now().toString().substr(-6)}`,
      title: 'Checkout Varejo',
      itemsSummary: `${cart.length} itens`,
      module: 'retail',
      onSuccess: async (payments) => {
        try {
          for (const p of payments) {
            await paymentService.processPayment({ 
              amount: p.amount, 
              method: p.method as any, 
              module: 'retail' 
            });
          }

          const saleData = {
            id: `sale_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            items: cart.map((item) => ({
              productId: item.id,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity,
            })),
            subtotal,
            tax,
            total,
            paymentMethod: payments.length > 1 ? 'split' : payments[0].method,
            createdAt: new Date().toISOString(),
          };

          await retailService.processSale(saleData);
          setCart([]);
        } catch (err) {
          console.error('Error finalizing retail sale:', err);
          throw err;
        }
      }
    });
  };

  const handleManualSync = async () => {
    if (isManualSyncing || syncStatus.isRetrying) return;
    setIsManualSyncing(true);
    try {
      const status = await retailService.syncNow();
      setSyncStatus(status);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const findProductsByQuery = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products.filter((p) => p.active);
    return products.filter((p) => {
      const matchesText =
        String(p.name || '').toLowerCase().includes(normalized) ||
        String(p.category || '').toLowerCase().includes(normalized) ||
        String(p.sku || '').toLowerCase().includes(normalized);
      if (matchesText) return true;
      const parsed = BarcodeEngine.parse(query);
      return BarcodeEngine.matchesProduct(parsed, p);
    });
  };

  const handleBarcodeSubmit = () => {
    if (!searchQuery.trim()) return;
    const parsed = BarcodeEngine.parse(searchQuery);
    const found = products.find((p) => BarcodeEngine.matchesProduct(parsed, p));
    if (found) {
      handleAddToCart(found);
      setSearchQuery('');
      return;
    }
    alert('Codigo nao encontrado no cadastro de produtos.');
  };

  const handleQuickReturn = async () => {
    const originalSaleId = prompt('Informe o ID da venda para devolucao:');
    if (!originalSaleId) return;
    const reason = prompt('Motivo da devolucao (ex: defeito, arrependimento, troca):') || 'devolucao';

    try {
      await retailService.processReturn({ originalSaleId, reason });
      alert('Devolucao registrada com sucesso.');
      const status = await retailService.getSyncQueueStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Erro ao registrar devolucao:', error);
      alert('Nao foi possivel registrar a devolucao. Verifique o ID da venda.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 lg:pb-0">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", syncStatus.connected ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
            {syncStatus.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync PDV</p>
            <p className="text-sm font-black text-slate-800">
              {syncStatus.connected ? "Conectado em tempo real" : "Offline - fila local ativa"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Pendentes: {syncStatus.pendingCount}
          </p>
          <button
            onClick={() => void handleManualSync()}
            disabled={isManualSyncing || syncStatus.isRetrying}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", (isManualSyncing || syncStatus.isRetrying) && "animate-spin")} />
            Sincronizar
          </button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
      {/* Product Selection Area */}
      <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
         <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
               <input 
                 type="text" 
                 placeholder="Pesquisar produto ou bipar código..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     handleBarcodeSubmit();
                   }
                 }}
                 className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl py-4 pl-14 pr-6 font-bold outline-none transition-all"
               />
               <button onClick={handleBarcodeSubmit} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Scan className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl">
               <button 
                 onClick={() => setIsQuickStockOpen(true)}
                 className="p-3 rounded-xl transition-all text-rose-500 hover:bg-white hover:shadow-sm"
                 title="Gestão de Faltas (86)"
               >
                 <ShoppingCart className="w-5 h-5 line-through opacity-70" />
               </button>
               <button 
                 onClick={() => setViewMode('grid')}
                 className={cn("p-3 rounded-xl transition-all", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
               >
                 <LayoutGrid className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={cn("p-3 rounded-xl transition-all", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
               >
                 <List className="w-5 h-5" />
               </button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-10">
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid' ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
            )}>
               {findProductsByQuery(searchQuery).map((p) => (
                 <motion.button
                   whileTap={{ scale: 0.95 }}
                   key={p.id}
                   onClick={() => handleAddToCart(p)}
                   className="group bg-slate-50 border border-transparent hover:border-indigo-200 hover:bg-white hover:shadow-xl p-6 rounded-[2rem] text-left transition-all"
                 >
                    <div className="w-full aspect-square bg-white rounded-2xl mb-4 overflow-hidden p-4">
                       <img src={`https://picsum.photos/seed/${p.id}/200/200`} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mb-2 inline-block">
                       {p.category}
                    </span>
                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight mb-1 group-hover:text-indigo-600">{p.name}</h4>
                    <p className="font-black text-slate-900">{formatCurrency(p.price)}</p>
                 </motion.button>
               ))}
            </div>
         </div>
      </div>

      {/* Cart & Checkout Area */}
      <div className="w-full lg:w-[480px] flex flex-col gap-8">
         <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Sacola de Compras</h3>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{cart.length} ITENS SELECIONADOS</p>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {cart.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                    <div className="p-6 bg-slate-100 rounded-full mb-4">
                       <ShoppingCart className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">O carrinho está vazio</p>
                    <p className="text-xs font-medium text-slate-300 mt-2">Selecione produtos para começar.</p>
                 </div>
               ) : (
                 <AnimatePresence>
                   {cart.map((item) => (
                     <motion.div 
                       layout
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       key={item.id}
                       className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-between group"
                     >
                        <div className="flex items-center gap-4">
                           <button onClick={() => removeFromCart(item.id)} className="p-2 bg-white text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4" />
                           </button>
                           <div>
                              <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{item.name}</p>
                              <p className="text-[10px] font-black text-indigo-600">{formatCurrency(item.price)}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="font-black text-slate-800 text-xs">{formatCurrency(item.price * item.quantity)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <button onClick={() => updateCartQuantity(item.id, -1)} className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
                                    <Minus className="w-3 h-3" />
                                 </button>
                                 <span className="font-black text-xs min-w-[20px] text-center">{item.quantity}</span>
                                 <button onClick={() => updateCartQuantity(item.id, 1)} className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
                                    <Plus className="w-3 h-3" />
                                 </button>
                              </div>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
               )}
            </div>

            <div className="p-10 border-t border-slate-50 bg-slate-50/50 space-y-6">
               <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-widest">
                     <span>Subtotal</span>
                     <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-widest">
                     <span>Impostos (5%)</span>
                     <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="h-[1px] bg-slate-200" />
                  <div className="flex items-center justify-between">
                     <span className="text-lg font-black uppercase tracking-tight italic">Total Geral</span>
                     <span className="text-3xl font-black text-indigo-600 tracking-tighter">{formatCurrency(total)}</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button className="py-5 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-sm">
                     <User className="w-4 h-4" /> Cliente
                  </button>
                  <button
                    onClick={() => void handleQuickReturn()}
                    className="py-5 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-sm"
                  >
                     <Ticket className="w-4 h-4" /> Cupom
                  </button>
               </div>
            </div>
         </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={handleOpenPayment}
              disabled={cart.length === 0}
              className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-6 hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 group disabled:opacity-50 disabled:grayscale"
            >
               Finalizar Pagamento <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
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
                    Gestão de Faltas (Eletrônicos/Vestuário)
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Ative ou esgote itens da vitrine</p>
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
                        const user = accountService.getCurrentUser();
                        const entId = user?.companyId || accountService.getCurrentCompanyId() || null;
                        const sId = localStorage.getItem('rm_selected_shop_id') || null;
                        const nextActive = !p.active;
                        try {
                          await firebaseService.updateItem('products', p.id, { active: nextActive, enterpriseId: entId, shopId: sId });
                          setProducts(products.map(prod => prod.id === p.id ? { ...prod, active: nextActive } : prod));
                        } catch (err) {
                          console.error('Error persisting quick stock change:', err);
                        }
                      }}
                      className={cn(
                        "p-6 rounded-3xl border-2 text-left transition-all duration-300 flex flex-col items-start gap-4 ring-offset-2",
                        p.active ? "bg-white border-slate-100 hover:border-indigo-200" : "bg-rose-50 border-rose-200 ring-2 ring-rose-500 shadow-lg shadow-rose-500/20"
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
                           <ShoppingCart className="w-5 h-5 line-through" />
                         </div>
                       </div>
                       <p className={cn("text-[10px] font-bold uppercase tracking-widest", p.active ? "text-emerald-600" : "text-rose-600")}>
                         {p.active ? 'Em Estoque' : 'Vitrine Esgotada'}
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
    </div>
  );
};
