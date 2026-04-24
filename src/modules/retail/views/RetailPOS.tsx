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
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../../../services/firebaseService';
import { cn, formatCurrency } from '../../../lib/utils';
import { paymentService } from '../../../services/paymentService';
import { retailService, RetailSyncStatus } from '../services/retailService';
import { accountService } from '../../../core/services/accountService';
import { BarcodeEngine } from '../../../core/services/BarcodeEngine';
import { StockReconciliationEngine } from '../../../core/services/StockReconciliationEngine';
import { useRetailCart } from '../hooks/useRetailCart';
import { logger } from '../../../core/services/logger';
import { fiscalService } from '../../../core/services/fiscalService';
import { paymentReconciliationEngine } from '../../../core/services/PaymentReconciliationEngine';
import { cashierEngine, CashierSession } from '../../../core/services/CashierEngine';
import { businessHoursEngine } from '../../../core/services/BusinessHoursEngine';
import { BusinessConfig } from '../../../types';
import { useCollection } from '../../../hooks/useCollection';

type PaymentMethod = 'card' | 'cash' | 'pix';

interface RetailPOSProps {
  externalAddToCart?: (product: any) => void;
  hideCart?: boolean;
}

export const RetailPOS: React.FC<RetailPOSProps> = ({ externalAddToCart, hideCart = false }) => {
  const { data: businessConfigs, loading: loadingConfigs } = useCollection<BusinessConfig>('businessConfigs', { enterpriseId: accountService.getCurrentCompanyId() || null });
  const config = businessConfigs[0];
  const { cart, subtotal, tax, total, handleAddToCart, removeFromCart, updateCartQuantity, clearCart } = useRetailCart(config?.taxRate || 0.05);
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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedReconProductId, setSelectedReconProductId] = useState('');
  const [countedStockInput, setCountedStockInput] = useState('');
  const [reconcileComment, setReconcileComment] = useState('');
  const [approverName, setApproverName] = useState('');
  const [isReconcilingStock, setIsReconcilingStock] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccessData, setReturnSuccessData] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);
  const [isOpeningCashier, setIsOpeningCashier] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('0');
  const [returnSignature, setReturnSignature] = useState('');
  const currentUser = accountService.getCurrentUser();
  const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();
  
  useEffect(() => {
    if (!enterpriseId || !shopId) {
      setProducts([]);
      return;
    }

    const unsub = firebaseService.subscribeCollection('products', enterpriseId, shopId, (data) => {
      // Filter for retail relevant categories if needed, or just show all
      setProducts(data);
    });

    return () => unsub();
  }, [enterpriseId, shopId]);

  // Lógica de Orçamentos (Unificada para Construção/Varejo)
  const handleSaveQuote = async () => {
    if (cart.length === 0) return;
    try {
      const quoteId = `quote_${Date.now()}`;
      const quoteData = {
        id: quoteId,
        items: cart,
        total,
        status: 'draft',
        enterpriseId,
        shopId,
        staffId: currentUser?.id,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dias
      };
      await retailService.processSale({ ...quoteData, isQuote: true });
      logger.info('retail', 'Orçamento salvo', { quoteId });
      setNotification({ type: 'success', message: 'Orçamento salvo com sucesso!' });
      clearCart();
    } catch (err) {
      logger.error('retail', 'Erro ao salvar orçamento', { err });
      setNotification({ type: 'error', message: 'Falha ao salvar orçamento.' });
    }
  };

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

    const checkActiveSession = async () => {
      if (!enterpriseId || !shopId) return;
      const sessions = await StockReconciliationEngine.listCountSessions(enterpriseId, shopId);
      const active = sessions.find(s => s.status === 'open');
      if (isMounted) setActiveSessionId(active?.id || null);
    };

    void loadSyncStatus();
    window.addEventListener('retail:sync-status', onSyncStatus as EventListener);
    const syncPolling = window.setInterval(() => {
      void loadSyncStatus();
    }, 5000);

    void checkActiveSession();

    return () => {
      isMounted = false;
      window.removeEventListener('retail:sync-status', onSyncStatus as EventListener);
      window.clearInterval(syncPolling);
    };
  }, [enterpriseId, shopId]);

  const handleOpenCashier = async () => {
    if (!shopId || !currentUser) return;
    try {
      const session = await cashierEngine.openCashier(
        shopId, 
        currentUser.id, 
        currentUser.name || 'Operador', 
        Number(openingBalanceInput)
      );
      setCashierSession(session);
      setNotification({ type: 'success', message: 'Caixa aberto com sucesso!' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao abrir caixa' });
    }
  };

  // Lógica de Fechamento de Caixa (X-Report)
  const handleCloseCashier = async () => {
    if (!cashierSession) return;
    const confirmClose = window.confirm("Deseja realmente fechar o caixa e encerrar o turno?");
    if (!confirmClose) return;

    try {
      await cashierEngine.closeCashier(cashierSession.id, 0); // O saldo final viria de um input de conferência
      setCashierSession(null);
      setNotification({ type: 'success', message: 'Caixa fechado. Turno encerrado.' });
      logger.info('finance', 'Fechamento de caixa realizado', { sessionId: cashierSession.id });
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao fechar caixa.' });
    }
  };

  const processBalanceLabel = (query: string) => {
    if (query.startsWith('2') && query.length === 13) {
      const sku = query.substring(1, 6);
      const dataPart = query.substring(7, 12);
      const totalValue = parseInt(dataPart) / 100;
      const product = products.find(p => p.sku === sku || p.id.includes(sku));
      if (product && product.unitType === 'kg') {
        const calculatedQty = parseFloat((totalValue / (product.price || 1)).toFixed(3));
        return { ...product, calculatedQty, isWeightLabel: true };
      }
    }
    return null;
  };

  const handleOpenPayment = () => {
    if (cart.length === 0) {
      setNotification({ type: 'error', message: 'O carrinho está vazio.' });
      return;
    }

    if (loadingConfigs) return;

    // Regra Opcional: Abertura de Caixa
    if (!cashierSession && config?.enforceCashier) {
      setNotification({ type: 'error', message: 'Abra o caixa para vender.' });
      return;
    }

    // Unificação: Validação de Horário de Funcionamento
    const businessStatus = businessHoursEngine.isBusinessOpen(config?.businessHours || []); 
    if (config?.enforceBusinessHours && !businessStatus.isOpen) {
      setNotification({ type: 'error', message: businessStatus.reason || 'Estabelecimento fechado.' });
      return;
    }

    paymentService.requestPaymentUI({
      total: total,
      orderId: `RT-${Date.now().toString().substr(-6)}`,
      title: 'Checkout Varejo',
      itemsSummary: `${cart.length} itens`,
      module: 'retail',
      onSuccess: async (payments) => {
        try {
          const saleId = `sale_${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

          // Reconciliação Opcional: Apenas se houver ID de transação ou se o usuário estiver usando o plugin
          const shouldReconcile = payments.some(p => p.transactionId);

          if (shouldReconcile) {
            for (const p of payments) {
              await paymentReconciliationEngine.registerPayment({
                id: `tr_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                saleId: saleId,
                amount: p.amount,
                method: p.method as any,
                externalId: p.transactionId || 'MANUAL-INPUT',
                provider: p.cardBrand || 'System'
              });
            }
          }

          const saleData = {
            id: saleId,
            items: cart.map((item) => ({
              productId: item.id,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
              unitType: item.unitType,
              metadata: item.metadata,
              status: item.status,
              variation: item.variation,
              totalPrice: item.price * item.quantity,
            })),
            subtotal,
            tax,
            total,
            enterpriseId,
            shopId,
            staffId: currentUser?.id,
            paymentMethod: payments.length > 1 ? 'split' : payments[0].method,
            createdAt: new Date().toISOString(),
          };

          await retailService.processSale(saleData);
          
          // Unificação: Vincula venda ao caixa para conferência de saldo
          if (cashierSession) {
            void cashierEngine.addTransactionToSession(cashierSession.id, total, saleId);
          }

          // Emissão Fiscal Automática
          void fiscalService.emitNFCe({
            saleId: saleData.id,
            items: saleData.items,
            total: saleData.total,
            payments: payments
          });

          logger.info('retail', 'Venda finalizada', { saleId: saleData.id, total }, currentUser?.id);
          setNotification({ type: 'success', message: 'Venda realizada com sucesso!' });
          clearCart();
        } catch (err) {
          logger.error('retail', 'Erro ao finalizar venda', { error: err }, currentUser?.id);
          setNotification({ type: 'error', message: 'Erro ao processar venda.' });
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
    
    const balanceProduct = processBalanceLabel(searchQuery);
    if (balanceProduct) {
      handleAddToCart(balanceProduct, { source: 'scale' }, balanceProduct.calculatedQty);
      setSearchQuery('');
      return;
    }

    const parsed = BarcodeEngine.parse(searchQuery);
    const found = products.find((p) => BarcodeEngine.matchesProduct(parsed, p));
    if (found) {
      handleAddToCart(found);
      setSearchQuery('');
      return;
    }
  };

  const handleQuickReturn = () => {
    setIsReturnModalOpen(true);
  };

  const handleSubmitReturn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!returnSaleId.trim() || !returnReason.trim() || !returnSignature.trim()) return;
    setIsSubmittingReturn(true);
    try {
      await retailService.processReturn({ originalSaleId: returnSaleId.trim(), reason: returnReason.trim() });
      const proofId = `ret-proof-${Date.now()}`;
      if (enterpriseId && shopId) {
        await firebaseService.saveItem('returnReceipts', proofId, {
          id: proofId,
          enterpriseId,
          shopId,
          originalSaleId: returnSaleId.trim(),
          reason: returnReason.trim(),
          signature: returnSignature.trim(),
          staffId: currentUser?.id || 'manual',
          staffName: currentUser?.name || 'Manual',
          timestamp: Date.now(),
        });
        await firebaseService.addAuditLog({
          enterpriseId,
          shopId,
          staffId: currentUser?.id || 'manual',
          staffName: currentUser?.name || 'Manual',
          action: 'retail_return_registered',
          details: `Devolucao registrada para venda ${returnSaleId.trim()} com comprovante ${proofId}.`,
          referenceId: proofId,
        });
      }
      const status = await retailService.getSyncQueueStatus();
      setSyncStatus(status);
      setReturnSuccessData({ proofId, timestamp: Date.now() });
      logger.info('retail', 'Devolução processada', { originalSaleId: returnSaleId, proofId }, currentUser?.id);
    } catch (error) {
      logger.error('retail', 'Falha na devolução', { error }, currentUser?.id);
      setNotification({ type: 'error', message: 'ID de venda original não encontrado.' });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const closeReturnModal = () => {
    setIsReturnModalOpen(false);
    setReturnSuccessData(null);
    setReturnSaleId('');
    setReturnReason('');
    setReturnSignature('');
  };

  const approvalThresholdPercent = 5;
  const selectedReconProduct = products.find((p) => p.id === selectedReconProductId) || null;
  const selectedCurrentStock = selectedReconProduct ? Number(selectedReconProduct.stock || 0) : 0;
  const countedStockValue = Number(countedStockInput);
  const stockDiff = selectedReconProduct && Number.isFinite(countedStockValue)
    ? countedStockValue - selectedCurrentStock
    : 0;
  const adjustmentPercentPreview = selectedReconProduct
    ? (selectedCurrentStock === 0
      ? (countedStockValue === 0 ? 0 : 100)
      : (Math.abs(stockDiff) / Math.abs(selectedCurrentStock)) * 100)
    : 0;
  const approvalRequiredPreview = selectedReconProduct && Number.isFinite(countedStockValue)
    ? adjustmentPercentPreview >= approvalThresholdPercent
    : false;

  const handleApplyStockReconciliation = async () => {
    if (!selectedReconProduct) {
      return;
    }
    if (!Number.isFinite(countedStockValue) || countedStockValue < 0) {
      return;
    }
    if (!reconcileComment.trim()) {
      return;
    }
    if (approvalRequiredPreview && !approverName.trim()) {
      return;
    }

    const currentUser = accountService.getCurrentUser();
    const enterpriseId = currentUser?.companyId || accountService.getCurrentCompanyId();
    const shopId = accountService.getSelectedShopId();
    if (!enterpriseId || !shopId) {
      return;
    }

    const maybe = selectedReconProduct as {
      cost?: number;
      costPrice?: number;
      unitCost?: number;
      unit?: string;
    };
    const costPerUnit = Number(maybe.costPrice ?? maybe.unitCost ?? maybe.cost ?? 0) || 0;

    setIsReconcilingStock(true);
    try {
      await StockReconciliationEngine.reconcileStock({
        enterpriseId,
        shopId,
        item: {
          id: selectedReconProduct.id,
          name: selectedReconProduct.name,
          shopId,
          unit: maybe.unit || 'un',
          currentStock: selectedCurrentStock,
          costPerUnit,
          sourceType: 'product',
        },
        newStock: countedStockValue,
        comment: reconcileComment,
        staffId: currentUser?.id || 'manual',
        staffName: currentUser?.name || 'Manual',
        approvalThresholdPercent,
        approverId: approvalRequiredPreview ? currentUser?.id || 'manual-approver' : undefined,
        approverName: approvalRequiredPreview ? approverName : undefined,
        sessionId: activeSessionId || undefined,
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === selectedReconProduct.id ? { ...p, stock: countedStockValue } : p)),
      );
      setCountedStockInput('');
      setReconcileComment('');
      setApproverName('');
      setNotification({ type: 'success', message: 'Estoque atualizado!' });
      logger.info('inventory', 'Reconciliação aplicada', { productId: selectedReconProduct.id, diff: stockDiff }, currentUser?.id);
    } catch (error) {
      logger.error('inventory', 'Erro na reconciliação', { error }, currentUser?.id);
      setNotification({ type: 'error', message: 'Erro ao aplicar ajuste.' });
    } finally {
      setIsReconcilingStock(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 lg:pb-0">
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
        <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Operador</p>
            <p className="text-xs font-bold text-slate-800">{currentUser?.name || '---'}</p>
          </div>
          {cashierSession && (
            <button onClick={handleCloseCashier} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
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
                 className="p-3 rounded-xl transition-all text-slate-400 hover:text-rose-500 hover:bg-white hover:shadow-sm"
                 title="Contagem e Ajuste de Estoque (Reconciliação)"
               >
                 <Scan className="w-5 h-5 opacity-70" />
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
                   onClick={() => externalAddToCart ? externalAddToCart(p) : handleAddToCart(p)}
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
      {!hideCart && (
        <div className="w-full lg:w-[480px] flex flex-col gap-8">
         <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Itens do Pedido</h3>
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
                              <p className="font-black text-slate-800 text-xs">
                                {formatCurrency(item.price * item.quantity)}
                                {item.unitType !== 'un' && <span className="text-[9px] text-slate-400 ml-1">({item.quantity}{item.unitType})</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                 <button onClick={() => updateCartQuantity(item.id, -1, item.variation)} className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
                                    <Minus className="w-3 h-3" />
                                 </button>
                                 <span className="font-black text-xs min-w-[20px] text-center">{item.quantity}</span>
                                 <button onClick={() => updateCartQuantity(item.id, 1, item.variation)} className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
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
                  <button 
                    onClick={handleSaveQuote}
                    disabled={cart.length === 0}
                    className="py-5 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm disabled:opacity-50"
                  >
                     <FileText className="w-4 h-4 text-indigo-500" /> Orçamento
                  </button>
                  <button className="py-5 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-sm">
                     <User className="w-4 h-4" /> Cliente
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
      )}

      <AnimatePresence>
        {isReturnModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[220] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl p-8"
            >
              {returnSuccessData ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Devolução Registrada</h3>
                  <p className="text-slate-500 font-bold text-sm mb-6">Comprovante: {returnSuccessData.proofId}</p>
                  <button 
                    onClick={closeReturnModal}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    Concluir e Imprimir
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 italic">Registrar Devolução Auditada</h3>
                    <button onClick={closeReturnModal} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitReturn} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">ID da venda original</label>
                      <input
                        value={returnSaleId}
                        onChange={(e) => setReturnSaleId(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        placeholder="Ex: sale_171000..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Motivo da devolucao</label>
                      <textarea
                        rows={3}
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
                        placeholder="Ex: defeito, arrependimento, troca"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Assinatura do operador</label>
                      <input
                        value={returnSignature}
                        onChange={(e) => setReturnSignature(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        placeholder="Nome completo / assinatura"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeReturnModal}
                        className="py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReturn}
                        className={cn(
                          "py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                          isSubmittingReturn ? "bg-slate-400 text-white cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
                        )}
                      >
                        {isSubmittingReturn ? 'Processando...' : 'Processar Devolução e Estornar'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}

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
                    Contagem & Reconciliacao de Estoque
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Contagem fisica com trilha de auditoria</p>
                </div>
                <button onClick={() => setIsQuickStockOpen(false)} className="p-3 bg-white/10 rounded-2xl text-slate-300 hover:text-white hover:bg-rose-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                  {products.map((p) => {
                    const isSelected = p.id === selectedReconProductId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedReconProductId(p.id);
                          setCountedStockInput(String(Number(p.stock || 0)));
                        }}
                        className={cn(
                          "w-full p-5 rounded-3xl border-2 text-left transition-all duration-300",
                          isSelected ? "bg-indigo-50 border-indigo-400 shadow-lg" : "bg-white border-slate-100 hover:border-indigo-200"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block bg-slate-100 text-slate-600">
                              {p.category || 'Sem categoria'}
                            </span>
                            <h4 className="font-black text-sm uppercase tracking-tight text-slate-800">{p.name}</h4>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atual</p>
                            <p className="text-lg font-black text-slate-800">{Number(p.stock || 0)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Aplicar contagem</h3>
                  {!selectedReconProduct ? (
                    <p className="text-xs font-bold text-slate-500">Selecione um produto na lista para iniciar.</p>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-slate-600">
                        Produto: <span className="text-slate-900">{selectedReconProduct.name}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        Estoque atual: <span className="text-slate-900">{selectedCurrentStock}</span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Contagem fisica</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={countedStockInput}
                          onChange={(e) => setCountedStockInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Motivo</label>
                        <textarea
                          rows={3}
                          value={reconcileComment}
                          onChange={(e) => setReconcileComment(e.target.value)}
                          placeholder="Ex: contagem de fechamento do turno"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                      </div>

                      {Number.isFinite(countedStockValue) && (
                        <div className={cn("rounded-2xl border p-4", approvalRequiredPreview ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200")}>
                          <div className="text-xs font-bold text-slate-700">
                            Diferenca: {stockDiff > 0 ? '+' : ''}{stockDiff} ({adjustmentPercentPreview.toFixed(2)}%)
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Limite para aprovacao: {approvalThresholdPercent}%
                          </div>
                          {approvalRequiredPreview && (
                            <div className="mt-3">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Aprovador</label>
                              <input
                                value={approverName}
                                onChange={(e) => setApproverName(e.target.value)}
                                placeholder="Nome do gerente/dono"
                                className="w-full bg-white border border-rose-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-300"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => void handleApplyStockReconciliation()}
                        disabled={isReconcilingStock}
                        className={cn(
                          "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all",
                          isReconcilingStock ? "bg-slate-400 text-white cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
                        )}
                      >
                        {isReconcilingStock ? 'Aplicando...' : 'Aplicar reconciliacao'}
                      </button>
                    </>
                  )}
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
