import React, { useState, useEffect } from 'react';
import { 
  User, 
  Clock, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useRetailCart } from '../../retail/hooks/useRetailCart';
import { logger } from '../../../core/services/logger';
import { formatCurrency, cn } from '../../../lib/utils';
import { paymentService } from '../../../services/paymentService';
import { retailService } from '../../retail/services/retailService';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { motion, AnimatePresence } from 'motion/react';
import { fiscalService } from '../../../core/services/fiscalService';
import { cashierEngine, CashierSession } from '../../../core/services/CashierEngine';
import { paymentReconciliationEngine } from '../../../core/services/PaymentReconciliationEngine';
import { businessHoursEngine } from '../../../core/services/BusinessHoursEngine';
import { BusinessConfig } from '../../../types';
import { useCollection } from '../../../hooks/useCollection';

export const ServicePOS: React.FC = () => {
  const { cart, total, handleAddToCart, removeFromCart, clearCart } = useRetailCart();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const currentUser = accountService.getCurrentUser();
  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();

  const { data: businessConfigs, loading: loadingConfigs } = useCollection<BusinessConfig>('businessConfigs', { enterpriseId: enterpriseId || null });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const config = businessConfigs[0];

  useEffect(() => {
    const checkCashier = async () => {
      if (shopId && currentUser) {
        const session = await cashierEngine.getActiveSession(shopId, currentUser.id);
        setCashierSession(session);
      }
    };
    checkCashier();
  }, [shopId, currentUser]);

  useEffect(() => {
    if (!enterpriseId || !shopId) return;
    
    // Carrega profissionais e serviços do banco real (Motor de RH e Catálogo)
    const loadData = async () => {
      const [staffData, serviceData] = await Promise.all([
        firebaseService.getAllDocs('staff', enterpriseId, shopId),
        firebaseService.getAllDocs('products', enterpriseId, shopId) // Serviços ficam no catálogo de produtos
      ]);
      setProfessionals(staffData.filter((s: any) => s.role === 'staff' || s.role === 'operator'));
      setServices(serviceData.filter((p: any) => p.category === 'Serviço' || p.type === 'service'));
    };

    loadData();
  }, [enterpriseId, shopId]);

  const handleAddService = (service: any) => {
    if (!selectedProfessional) {
      setNotification({ type: 'error', message: 'Selecione um profissional primeiro' });
      return;
    }
    
    const prof = professionals.find(p => p.id === selectedProfessional);
    handleAddToCart({
      ...service,
      selectedVariation: prof?.name, // Usamos variation para exibir o profissional no item
      metadata: { professionalId: selectedProfessional, professionalName: prof?.name }
    });
    
    logger.info('service', 'Serviço adicionado à comanda', { 
      service: service.name, 
      professional: prof?.name 
    }, currentUser?.id);
  };

  const handleFinalize = () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', message: 'Nenhum serviço selecionado.' });
      return;
    }
    if (!cashierSession) {
      setNotification({ type: 'error', message: 'Abra o caixa antes de realizar vendas.' });
      return;
    }

    if (loadingConfigs) return;

    // Regra Opcional: Abertura de Caixa
    if (!cashierSession && config?.enforceCashier) {
      setNotification({ type: 'error', message: 'Abra o caixa antes de realizar vendas.' });
      return;
    }
    
    // Regra Opcional: Horário de Funcionamento
    const businessStatus = businessHoursEngine.isBusinessOpen(config?.businessHours || []);
    if (config?.enforceBusinessHours && !businessStatus.isOpen) {
      setNotification({ type: 'error', message: businessStatus.reason || 'Fora do horário comercial.' });
      return;
    }

    paymentService.requestPaymentUI({
      total,
      orderId: `SRV-${Date.now().toString().slice(-6)}`,
      title: 'Checkout de Serviços',
      module: 'service',
      onSuccess: async (payments) => {
        try {
          const saleData = {
            id: `service_sale_${Date.now()}`,
            items: cart.map(item => ({
              productId: item.id,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
              variation: item.variation,
              totalPrice: item.price * item.quantity,
              unitType: item.unitType, metadata: item.metadata, professionalId: item.professionalId, status: item.status, notes: item.notes,
            })),
            total,
            staffId: currentUser?.id,
            payments,
            module: 'service',
            createdAt: new Date().toISOString()
          };

          await retailService.processSale(saleData);

          // Emissão Fiscal (Serviços no Brasil geralmente usam NFS-e, mas alguns estados permitem NFC-e com itens mistos)
          void fiscalService.emitNFCe({
            saleId: saleData.id,
            items: saleData.items,
            total: saleData.total,
            payments: payments
          });

          logger.info('service', 'Venda de serviço concluída', { saleId: saleData.id, items: cart.length }, currentUser?.id);
          setNotification({ type: 'success', message: 'Serviço finalizado com sucesso!' });
          clearCart();
        } catch (err) {
          logger.error('service', 'Erro ao finalizar serviço', { error: err });
          setNotification({ type: 'error', message: 'Erro ao processar pagamento.' });
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
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

      {/* Coluna de Seleção */}
      <div className="lg:col-span-8 space-y-6">
        <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <User className="w-4 h-4" /> Selecione o Profissional
          </h3>
          <div className="flex flex-wrap gap-3">
            {professionals.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProfessional(p.id)}
                className={cn(
                  "px-6 py-3 rounded-2xl font-bold text-sm transition-all border-2",
                  selectedProfessional === p.id 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
                    : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200"
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => handleAddService(s)}
              className="p-6 bg-white border border-slate-100 rounded-[2rem] text-left hover:shadow-xl transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight">{s.name}</h4>
              <p className="font-black text-indigo-600 mt-1">{formatCurrency(s.price)}</p>
            </button>
          ))}
        </section>
      </div>

      {/* Checkout / Carrinho de Serviço */}
      <div className="lg:col-span-4 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden h-fit">
        <div className="p-8 bg-slate-900 text-white">
          <h3 className="font-black uppercase tracking-widest text-xs">Resumo do Atendimento</h3>
          <p className="text-[10px] font-bold opacity-50 uppercase mt-1">Sincronizado com Financeiro Central</p>
        </div>
        
        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{item.variation}</p>
                <p className="font-bold text-slate-800 text-sm">{item.name}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-900 text-sm">{formatCurrency(item.price * item.quantity)}</p>
                <button onClick={() => removeFromCart(item.id)} className="text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-end mb-6">
            <span className="text-xs font-black uppercase text-slate-400">Total a Pagar</span>
            <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={handleFinalize}
            disabled={cart.length === 0}
            className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            Finalizar Atendimento <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};