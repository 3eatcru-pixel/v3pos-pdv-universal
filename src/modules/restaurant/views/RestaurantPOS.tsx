import React, { useState, useEffect, useMemo } from 'react';
import { Utensils, Send, Receipt, Users, Plus, Minus, Trash2, MessageSquare, CheckCircle2, AlertCircle, ShoppingBag, ShoppingCart, Search } from 'lucide-react';
import { useRetailCart, CartItem } from '../../retail/hooks/useRetailCart';
import { formatCurrency, cn } from '../../../lib/utils';
import { restaurantService } from '../services/restaurantService';
import { paymentService } from '../../../services/paymentService';
import { fiscalService } from '../../../core/services/fiscalService';
import { accountService } from '../../../core/services/accountService';
import { motion, AnimatePresence } from 'motion/react';
import { logger } from '../../../core/services/logger';
import { useCollection } from '../../../hooks/useCollection';
import { Product, Order, BusinessConfig } from '../../../types';
import { cashierEngine, CashierSession } from '../../../core/services/CashierEngine';
import { paymentReconciliationEngine } from '../../../core/services/PaymentReconciliationEngine';
import { retailService } from '../../retail/services/retailService';

export const RestaurantPOS: React.FC = () => {
  const { cart, total, handleAddToCart, clearCart, updateCartQuantity, removeFromCart } = useRetailCart();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTakeaway, setIsTakeaway] = useState(false);
  const currentUser = accountService.getCurrentUser();
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  const { data: products } = useCollection<Product>('products', { enterpriseId: enterpriseId || null, shopId: shopId || null });
  const { data: allOrders } = useCollection<Order>('orders', { enterpriseId: enterpriseId || null, shopId: shopId || null });
  const { data: businessConfigs, loading: loadingConfigs } = useCollection<BusinessConfig>('businessConfigs', { enterpriseId: enterpriseId || null });

  // Notification useEffect
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const config = businessConfigs[0];
  const { cart, total, handleAddToCart, clearCart, updateCartQuantity, removeFromCart } = useRetailCart(config?.taxRate || 0.05);

  useEffect(() => {
    const checkCashier = async () => {
      if (shopId && currentUser) {
        const session = await cashierEngine.getActiveSession(shopId, currentUser.id);
        setCashierSession(session);
      }
    };
    checkCashier();
  }, [shopId, currentUser]);

  const filteredProducts = useMemo(() => {
    const term = searchQuery.toLowerCase();
    return products.filter(p => 
      p.active && 
      (p.category === 'Alimentação' || p.category === 'Bebidas' || p.type === 'service') &&
      (p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
    );
  }, [products, searchQuery]);

  const handleSendToKitchen = async () => {
    if (!selectedTable && !isTakeaway) {
      setNotification({ type: 'error', message: 'Selecione uma mesa ou ative Retirada.' });
      return;
    }
    if (cart.length === 0) {
      setNotification({ type: 'error', message: 'Adicione itens ao pedido.' });
      return;
    }
    
    if (loadingConfigs) return;

    // Regra Opcional: Abertura de Caixa
    if (!cashierSession && config?.enforceCashier) {
      setNotification({ type: 'error', message: 'Abra o caixa para iniciar pedidos.' });
      return;
    }
    
    // Regra Opcional: Horário de Funcionamento
    const businessStatus = businessHoursEngine.isBusinessOpen(config?.businessHours || []);
    if (config?.enforceBusinessHours && !businessStatus.isOpen) {
      setNotification({ type: 'error', message: businessStatus.reason || 'Restaurante fechado.' });
      return;
    }

    // Lógica de senha sequencial para Takeaway
    let takeawayNumber;
    if (isTakeaway) {
      const today = new Date().setHours(0,0,0,0); // Início do dia atual
      const todayTakeaways = allOrders.filter(o => o.orderType === 'takeaway' && o.startTime >= today);
      takeawayNumber = todayTakeaways.length + 1;
    }

    await restaurantService.sendToProduction({
      tableId: isTakeaway ? 'takeaway' : selectedTable,
      items: cart,
      waiterId: currentUser?.id || 'system',
      timestamp: Date.now(),
      orderType: isTakeaway ? 'takeaway' : 'table',
      takeawayNumber,
      enterpriseId: enterpriseId!,
      shopId: shopId!
    });

    logger.info('restaurant', 'Pedido enviado à produção', { table: selectedTable, isTakeaway, takeawayNumber });
    setNotification({ type: 'success', message: isTakeaway ? `Pedido #${takeawayNumber} na cozinha!` : 'Pedido enviado!' });
    
    if (isTakeaway) clearCart();
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', message: 'Nenhum item no pedido para fechar a conta.' });
      return;
    }
    if (!selectedTable && !isTakeaway) {
      setNotification({ type: 'error', message: 'Vincule a uma mesa ou retirada.' });
      return;
    }

    // Regra Opcional: Bloqueio por Caixa Fechado
    if (!cashierSession && config?.enforceCashier) {
      setNotification({ type: 'error', message: 'Caixa fechado.' });
      return;
    }
    
    // Regra Opcional: Bloqueio por Horário
    const businessStatus = businessHoursEngine.isBusinessOpen(config?.businessHours || []);
    if (config?.enforceBusinessHours && !businessStatus.isOpen) {
      setNotification({ type: 'error', message: 'Impossível fechar conta fora do horário.' });
      return;
    }

    paymentService.requestPaymentUI({
      total,
      orderId: isTakeaway ? `TKW-${Date.now().toString().slice(-4)}` : `TBL-${selectedTable}-${Date.now().toString().slice(-4)}`,
      title: isTakeaway ? 'Pagamento Retirada' : `Conta Mesa ${selectedTable}`,
      module: 'restaurant',
      onSuccess: async (payments) => {
        try {
          const saleId = `res_${Date.now()}`;

          // Registro para Reconciliação Bancária Unificada
          for (const p of payments) {
            if (p.transactionId || p.method !== 'cash') {
              await paymentReconciliationEngine.registerPayment({
                id: `tr_${Date.now()}`,
                saleId: saleId,
                amount: p.amount,
                method: p.method as any,
                externalId: p.transactionId || 'MANUAL',
                provider: p.cardBrand || 'RestaurantPOS'
              });
            }
          }

          const saleData = {
            id: saleId,
            items: cart.map(item => ({
              productId: item.id, 
              name: item.name, 
              quantity: item.quantity, 
              unitPrice: item.price,
              variation: item.variation, totalPrice: item.price * item.quantity,
              unitType: item.unitType, 
              metadata: item.metadata, 
              status: item.status, 
              notes: item.notes, 
              staffId: currentUser?.id // Unificado para staffId
            })),
            total,
            payments,
            module: 'restaurant',
            createdAt: new Date().toISOString(),
            tableId: isTakeaway ? 'takeaway' : selectedTable,
            staffId: currentUser?.id,
          };

          // Processa a venda no sistema de retail (para baixa de estoque e relatórios unificados)
          await retailService.processSale(saleData);
          
          // Emissão Fiscal
          void fiscalService.emitNFCe({
            saleId: saleId,
            items: saleData.items,
            total: saleData.total,
            payments: payments
          });

          logger.info('restaurant', 'Conta fechada', { saleId, tableId: selectedTable, total }, currentUser?.id);
          setNotification({ type: 'success', message: `Conta da Mesa ${selectedTable} fechada!` });
          clearCart();
          setSelectedTable('');
        } catch (err) {
          logger.error('restaurant', 'Erro ao fechar conta', { error: err }, currentUser?.id);
          setNotification({ type: 'error', message: 'Erro ao fechar conta. Tente novamente.' });
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-10 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-xs uppercase tracking-widest",
              notification.type === 'success' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seleção de Mesas */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Controle de Consumo
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
               <button 
                onClick={() => { setIsTakeaway(false); }}
                className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", !isTakeaway ? "bg-white text-orange-600 shadow-sm" : "text-slate-400")}
               >Mesas</button>
               <button 
                onClick={() => { setIsTakeaway(true); setSelectedTable(''); }}
                className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", isTakeaway ? "bg-orange-500 text-white shadow-sm" : "text-slate-400")}
               >Balcão (86)</button>
            </div>
          </div>
          
          {!isTakeaway && (
            <div className="grid grid-cols-8 gap-2">
              {['01', '02', '03', '04', '05', '06', '07', '08'].map(table => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={cn(
                    "h-10 w-10 rounded-xl font-black transition-all border-2 text-[10px]",
                    selectedTable === table 
                      ? "bg-orange-500 border-orange-500 text-white shadow-lg" 
                      : "bg-slate-50 border-transparent text-slate-400 hover:border-slate-200"
                  )}
                >
                  {table}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
           <input 
             type="text" 
             placeholder="Pesquisar prato ou bebida..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-white border border-slate-100 rounded-[1.5rem] py-5 pl-16 pr-6 font-bold text-slate-700 outline-none shadow-sm focus:ring-4 focus:ring-orange-500/10 transition-all"
           />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
           {filteredProducts.map(p => (
             <motion.button
               whileTap={{ scale: 0.95 }}
               key={p.id}
               onClick={() => handleAddToCart(p)}
               className="bg-white p-6 rounded-[2rem] border border-slate-100 text-left hover:shadow-xl transition-all group"
             >
                <span className="text-[8px] font-black uppercase text-orange-500 mb-1 block">{p.category}</span>
                <h4 className="font-black text-slate-800 uppercase text-xs mb-4 group-hover:text-orange-500 transition-colors">{p.name}</h4>
                <p className="font-black text-slate-900">{formatCurrency(p.price)}</p>
             </motion.button>
           ))}
        </div>
      </div>

      {/* Comanda Lateral */}
      <div className="lg:col-span-4 bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col h-[600px]">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="font-black uppercase tracking-tighter text-xl italic">Comanda</h3>
            <p className="text-[10px] font-bold text-orange-400 uppercase">
              {isTakeaway ? 'BALCÃO / RETIRADA' : `MESA: ${selectedTable || '---'}`}
            </p>
          </div>
          <Users className="w-6 h-6 opacity-20" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-8">
           {cart.map((item, i) => (
             <div key={i} className="flex justify-between items-start border-b border-white/10 pb-4 group">
                <div>
                  <p className="text-xs font-black uppercase">{item.name}</p>
                  {item.notes && <p className="text-[9px] text-orange-300 italic">*{item.notes}</p>}
                  <div className="flex items-center gap-2 mt-1">
                     <button onClick={() => updateCartQuantity(item.id, -1)} className="text-white/40 hover:text-white"><Minus className="w-3 h-3" /></button>
                     <span className="text-[10px] font-black">{item.quantity}</span>
                     <button onClick={() => updateCartQuantity(item.id, 1)} className="text-white/40 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-xs font-bold">{formatCurrency(item.price * item.quantity)}</p>
                   <button onClick={() => removeFromCart(item.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </div>
             </div>
           ))}
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleSendToProduction}
            className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-orange-400 hover:text-white transition-all"
          >
            <Send className="w-4 h-4" /> Cozinha / Bar
          </button>
          <button 
            onClick={handleCheckout}
            className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-500/20"
          >
            Fechar Conta {formatCurrency(total)}
          </button>
        </div>
      </div>
    </div>
  );
};