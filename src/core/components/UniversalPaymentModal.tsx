import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  CheckCircle2, 
  Download,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';

interface PaymentEntry {
  method: 'cash' | 'card' | 'pix';
  amount: number;
  change?: number;
}

interface UniversalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  title: string;
  itemsSummary?: string;
  orderId: string;
  onSuccess: (payments: PaymentEntry[]) => Promise<void>;
  alreadyPaid?: number;
}

export const UniversalPaymentModal: React.FC<UniversalPaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  title,
  itemsSummary,
  orderId,
  onSuccess,
  alreadyPaid = 0
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{ total: number; change: number; method: string } | null>(null);
  
  const [tempPayments, setTempPayments] = useState<PaymentEntry[]>([]);
  const [payMethod, setPayMethod] = useState<'card' | 'pix' | 'cash'>('card');
  
  const currentPaymentsTotal = useMemo(() => 
    tempPayments.reduce((sum, p) => sum + (p.amount - (p.change || 0)), 0),
  [tempPayments]);
  
  const totalPaid = alreadyPaid + currentPaymentsTotal;
  const balanceRemaining = Math.max(0, total - totalPaid);
  const isFullyPaid = totalPaid >= (total - 0.01);

  const [payAmount, setPayAmount] = useState<string>(balanceRemaining.toFixed(2));
  const [cashReceived, setCashReceived] = useState<string>('');

  // Update payAmount when balanceRemaining changes
  useEffect(() => {
    setPayAmount(balanceRemaining.toFixed(2));
  }, [balanceRemaining]);

  const changeToGive = useMemo(() => {
    if (payMethod !== 'cash') return 0;
    const received = parseFloat(cashReceived) || 0;
    const amountToPayNow = parseFloat(payAmount) || 0;
    return Math.max(0, received - amountToPayNow);
  }, [payMethod, cashReceived, payAmount]);

  const handleAddPayment = () => {
    const amtToPayNow = parseFloat(payAmount);
    if (isNaN(amtToPayNow) || amtToPayNow <= 0) return;
    
    const received = payMethod === 'cash' ? Math.max(amtToPayNow, parseFloat(cashReceived) || 0) : amtToPayNow;
    
    setTempPayments([...tempPayments, {
      method: payMethod,
      amount: received,
      change: payMethod === 'cash' ? changeToGive : 0
    }]);
    
    setCashReceived('');
  };

  const handleConfirm = async () => {
    if (tempPayments.length === 0) return;
    
    try {
      await onSuccess(tempPayments);
      
      const finalChange = tempPayments.reduce((sum, p) => sum + (p.change || 0), 0);
      setSuccessDetails({
        total: total,
        change: finalChange,
        method: tempPayments.length > 1 ? 'Múltiplos' : tempPayments[0].method
      });
      setIsSuccess(true);
    } catch (err) {
      console.error('Error confirming payment:', err);
      alert('Erro ao confirmar pagamento. Tente novamente.');
    }
  };

  const reset = () => {
    setIsSuccess(false);
    setSuccessDetails(null);
    setTempPayments([]);
    setPayMethod('card');
    setCashReceived('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        {isSuccess ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[3rem] w-full max-w-sm shadow-4xl overflow-hidden text-center p-12 relative"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
              className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-12 h-12" />
            </motion.div>

            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mb-2">Sucesso!</h3>
            <p className="text-sm font-medium text-slate-400 mb-10">O pagamento foi processado com sucesso.</p>

            <div className="bg-slate-50 rounded-[2rem] p-8 mb-10 border border-slate-100 space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Pago</span>
                  <span className="text-xl font-black text-slate-800 tracking-tighter">{formatCurrency(successDetails?.total || 0)}</span>
               </div>
               {successDetails && successDetails.change > 0 && (
                 <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Troco Entregue</span>
                    <span className="text-xl font-black text-amber-600 tracking-tighter">{formatCurrency(successDetails.change)}</span>
                 </div>
               )}
               <div className="pt-4 border-t border-slate-200">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest uppercase">Método: {successDetails?.method}</p>
               </div>
            </div>

            <button 
              onClick={reset}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Concluído
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase italic underline-offset-4 decoration-emerald-500/30 underline decoration-4">{title}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                  ID: {orderId.toUpperCase()} {itemsSummary ? `• ${itemsSummary}` : ''}
                </p>
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-400 hover:text-slate-600 border border-slate-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                   <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 opacity-60">Total da Conta</p>
                      <p className="text-4xl font-black italic tracking-tighter">{formatCurrency(total)}</p>
                      {alreadyPaid > 0 && (
                        <p className="text-[10px] font-black text-emerald-400 uppercase mt-4 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" /> Já Pago: {formatCurrency(alreadyPaid)}
                        </p>
                      )}
                   </div>
                   <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
                </div>
                <div className={cn(
                  "rounded-3xl p-8 shadow-2xl transition-all flex flex-col justify-center border-2",
                  isFullyPaid ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20" : "bg-white text-slate-400 border-slate-100"
                )}>
                   <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-2">
                     {isFullyPaid ? 'Conta Liquidada' : 'Faltante'}
                   </p>
                   <p className="text-4xl font-black italic tracking-tighter">
                     {formatCurrency(balanceRemaining)}
                   </p>
                </div>
              </div>

              {!isFullyPaid && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
                    {[2, 3, 4, 5].map(n => (
                      <button 
                        key={n}
                        onClick={() => setPayAmount((balanceRemaining / n).toFixed(2))}
                        className="whitespace-nowrap px-6 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl text-[9px] font-black uppercase text-slate-500 transition-all shadow-sm"
                      >
                        Dividir em {n}x ({formatCurrency(balanceRemaining / n)})
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6 bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-2">Valor do Pagamento</label>
                        <div className="relative group">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black italic">R$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full pl-16 pr-6 py-6 bg-white border-2 border-slate-100 rounded-[2rem] focus:border-emerald-500 outline-none font-black text-slate-900 text-2xl shadow-sm transition-all"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-2">Forma de Pagamento</label>
                        <div className="flex gap-2">
                          {[ 
                            { id: 'card', icon: <CreditCard className="w-5 h-5" />, label: 'Cartão' },
                            { id: 'pix', icon: <Smartphone className="w-5 h-5" />, label: 'PIX' },
                            { id: 'cash', icon: <Banknote className="w-5 h-5" />, label: 'Dinheiro' }
                          ].map(m => (
                            <button 
                              key={m.id}
                              onClick={() => setPayMethod(m.id as any)}
                              className={cn(
                                "flex-1 py-6 flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 transition-all",
                                payMethod === m.id 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]" 
                                  : "bg-white border-slate-100 text-slate-300 hover:border-slate-200"
                              )}
                            >
                              {m.icon}
                              <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {payMethod === 'cash' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100"
                      >
                         <div>
                           <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-2 italic">Valor Recebido do Cliente</label>
                           <input 
                             type="number" 
                             step="0.01"
                             value={cashReceived}
                             onChange={(e) => setCashReceived(e.target.value)}
                             placeholder="0,00"
                             className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:border-amber-500 outline-none font-black text-slate-900 text-xl shadow-sm"
                           />
                         </div>
                         <div className="bg-amber-50 rounded-[1.5rem] p-6 flex flex-col justify-center border border-amber-100 shadow-inner">
                           <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Troco Disponível</span>
                           </div>
                           <span className="text-3xl font-black text-amber-800 italic tracking-tighter">{formatCurrency(changeToGive)}</span>
                         </div>
                      </motion.div>
                    )}

                    <button 
                      onClick={handleAddPayment}
                      disabled={!payAmount || parseFloat(payAmount) <= 0}
                      className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      Processar este Pagamento
                    </button>
                  </div>
                </div>
              )}

              {tempPayments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] px-2 italic">Pagamentos em Sessão</h4>
                  <div className="space-y-3">
                     {tempPayments.map((p, idx) => (
                       <motion.div 
                         key={idx} 
                         initial={{ x: 20, opacity: 0 }}
                         animate={{ x: 0, opacity: 1 }}
                         className="flex items-center justify-between p-6 bg-white rounded-[2rem] border-2 border-emerald-500/20 shadow-lg relative overflow-hidden"
                       >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                              {p.method === 'card' ? <CreditCard className="w-5 h-5" /> : p.method === 'pix' ? <Smartphone className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                            </div>
                            <div>
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Método</span>
                               <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{p.method}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black text-emerald-600 italic tracking-tighter">{formatCurrency(p.amount)}</p>
                             {p.change !== undefined && p.change > 0 && (
                               <div className="flex items-center gap-1 justify-end text-amber-600">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <p className="text-[9px] font-black uppercase">Troco: {formatCurrency(p.change)}</p>
                               </div>
                             )}
                          </div>
                          
                          <button 
                            onClick={() => setTempPayments(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                             <X className="w-3 h-3" />
                          </button>
                       </motion.div>
                     ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 mt-auto">
              <button 
                disabled={tempPayments.length === 0}
                onClick={handleConfirm}
                className={cn(
                  "w-full py-7 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95 italic",
                  tempPayments.length > 0 
                    ? (isFullyPaid ? "bg-slate-900 text-white shadow-slate-900/40 hover:bg-black" : "bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-400") 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {isFullyPaid ? "Finalizar & Confirmar Tudo" : `Confirmar Parcialmente (${formatCurrency(currentPaymentsTotal)})`}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};
