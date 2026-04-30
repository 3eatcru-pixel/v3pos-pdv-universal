import React, { useState } from 'react';
import { Truck, Calendar, MapPin, ClipboardList, ChevronRight, PackageCheck } from 'lucide-react';
import { paymentService } from '../../../services/paymentService';
import { retailService } from '../../retail/services/retailService';
import { fiscalService } from '../../../core/services/fiscalService';
import { accountService } from '../../../core/services/accountService';
import { useRetailCart } from '../../retail/hooks/useRetailCart';
import { cn, formatCurrency } from '../../../lib/utils';
import { logger } from '../../../core/services/logger';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { cashierEngine, CashierSession } from '../../../core/services/CashierEngine';
import { paymentReconciliationEngine } from '../../../core/services/PaymentReconciliationEngine';
import { businessHoursEngine } from '../../../core/services/BusinessHoursEngine';
import { constructionLogisticsService } from '../services/ConstructionLogisticsService';
import { idGenerator } from '../../../core/utils/idGenerator';
import { RetailPOS } from '../../retail/views/RetailPOS';
import { useCollection } from '../../../hooks/useCollection';
import { BusinessConfig, Order } from '../../../types';

/**
 * ConstructionPOS: Estende o Varejo com lógica de Logística
 */
export const ConstructionPOS: React.FC = () => {
  const currentUser = accountService.getCurrentUser();
  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();
  const { data: businessConfigs, loading: loadingConfigs } = useCollection<BusinessConfig>('businessConfigs', { enterpriseId: enterpriseId || null });
  const config = businessConfigs[0]; // Assuming only one config per enterprise
  const { cart, total, subtotal, tax, handleAddToCart, clearCart } = useRetailCart(config?.taxRate || 0.05);
  const [isDeliveryMode, setIsDeliveryMode] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [address, setAddress] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);

  React.useEffect(() => {
    const checkCashier = async () => {
      if (shopId && currentUser) {
        const session = await cashierEngine.getActiveSession(shopId, currentUser.id);
        setCashierSession(session);
      }
    };
    checkCashier();
  }, [shopId, currentUser]);

  const handleCloseCashier = async () => {
    if (!cashierSession) return;
    if (!window.confirm("Deseja fechar o caixa do depósito?")) return;
    try {
      await cashierEngine.closeCashier(cashierSession.id, 0);
      setCashierSession(null);
      setNotification({ type: 'success', message: 'Caixa de Construção encerrado.' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao fechar caixa.' });
    }
  };

  const handleConstructionCheckout = async () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', message: 'Adicione itens para continuar' });
      return;
    }

    const validation = constructionLogisticsService.validateLogistics(isDeliveryMode, deliveryDate, address);
    if (!validation.isValid) {
      setNotification({ type: 'error', message: validation.error! });
      return;
    }

    if (loadingConfigs) return; // Wait for configs to load

    if (!cashierSession && config?.enforceCashier) {
      setNotification({ type: 'error', message: 'Abra o caixa na central financeira primeiro.' });
      return;
    }

    // Unificação: Validação de Horário
    const businessStatus = businessHoursEngine.isBusinessOpen(config?.businessHours || []);
    if (config?.enforceBusinessHours && !businessStatus.isOpen) {
      setNotification({ type: 'error', message: businessStatus.reason || 'Depósito fechado.' });
      return;
    }
    
    paymentService.requestPaymentUI({
      total,
      orderId: `CON-${Date.now().toString().slice(-6)}`,
      title: 'Checkout de Materiais',
      module: 'construction',
      onSuccess: async (payments) => {
        try {
          // Unificação da geração de ID via central utility
          const saleId = idGenerator.generate('cs');

          for (const p of payments) {
            if (p.transactionId) {
              const transactionId = idGenerator.generate('tr');
              await paymentReconciliationEngine.registerPayment({
                id: transactionId,
                saleId: saleId,
                amount: p.amount,
                shopId: shopId!,
                method: p.method as any,
                externalId: p.transactionId,
                provider: p.cardBrand || 'LogisticsMachine'
              });
            }
          }

          const logisticsData = constructionLogisticsService.prepareLogistics(isDeliveryMode, deliveryDate, address);

          const saleData = {
            id: saleId,
            items: cart.map(item => ({
              productId: item.id, name: item.name, quantity: item.quantity, unitPrice: item.price,
              cost: item.cost, // Essencial para o cálculo de CMV no DRE
              variation: item.variation, totalPrice: item.price * item.quantity,
              unitType: item.unitType, metadata: item.metadata, notes: item.notes,
              staffId: currentUser?.id
            })),
            subtotal,
            tax,
            total,
            enterpriseId,
            shopId,
            staffId: currentUser?.id,
            payments,
            module: 'construction',
            createdAt: new Date().toISOString(),
            logistics: logisticsData,
          };

          await retailService.processSale(saleData); // Reutiliza o retailService para processar a venda
          
          // Notifica expedição se for entrega agendada
          void constructionLogisticsService.notifyExpedition(saleId, logisticsData);

          // Unificação: Vincula venda ao caixa para conferência de saldo
          if (cashierSession) {
            void cashierEngine.addTransactionToSession(cashierSession.id, total, saleId);
          }

          void fiscalService.emitNFCe({
            saleId: saleData.id,
            items: saleData.items,
            total: saleData.total,
            payments: payments
          });

          logger.info('construction', 'Venda de materiais concluída', { saleId: saleData.id, items: cart.length, logistics: logisticsData }, currentUser?.id);
          setNotification({ type: 'success', message: `Venda registrada! Modo: ${isDeliveryMode ? 'ENTREGA AGENDADA' : 'RETIRADA IMEDIATA'}` });
          clearCart();
        } catch (err) {
          logger.error('construction', 'Erro ao finalizar venda de materiais', { error: err }, currentUser?.id);
          setNotification({ type: 'error', message: 'Erro ao processar venda de materiais.' });
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
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

      {/* Header Logístico */}
      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2.5rem] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-amber-900 uppercase italic">Módulo de Obras & Logística</h2>
            <p className="text-xs font-bold text-amber-700/60 uppercase tracking-widest">Gestão de Entrega Futura</p>
          </div>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-amber-200">
          <button 
            onClick={() => setIsDeliveryMode(false)}
            className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all", !isDeliveryMode ? "bg-amber-500 text-white shadow-md" : "text-slate-400")}
          >
            Pronta Entrega / Balcão
          </button>
          <button 
            onClick={() => setIsDeliveryMode(true)}
            className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all", isDeliveryMode ? "bg-amber-500 text-white shadow-md" : "text-slate-400")}
          >
            Agendar Frete / Obra
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <RetailPOS 
            externalAddToCart={handleAddToCart} 
            hideCart={true} 
          /> 
        </div>

        <div className="lg:col-span-4 space-y-6">
          {isDeliveryMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] border-2 border-amber-200 shadow-xl space-y-6"
            >
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Dados da Entrega
              </h3>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Data Agendada</label>
                <input 
                  type="date" 
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-xl p-4 font-bold outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Endereço da Obra / Lote</label>
                <textarea 
                  placeholder="Rua, Número, Referência do Lote..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-xl p-4 font-bold outline-none transition-all h-24"
                />
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-amber-700 font-black uppercase mb-1">Reserva de Mercadoria</p>
                  <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                    Os itens serão bloqueados para venda. O romaneio de carga será enviado para a expedição do pátio.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
            <div className="flex justify-between items-end mb-8">
               <span className="text-xs font-black uppercase text-white/40 tracking-widest">Total Geral</span>
               <span className="text-4xl font-black tracking-tighter text-amber-400">{formatCurrency(total)}</span>
            </div>
            
            <button 
              onClick={handleConstructionCheckout}
              disabled={cart.length === 0 || (isDeliveryMode && (!deliveryDate || !address))}
              className="w-full py-6 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-20"
            >
              {isDeliveryMode ? 'Agendar Entrega' : 'Finalizar Retirada'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};