import React, { useState, useEffect } from 'react';
import { Wallet, Ticket, CheckCircle2, ArrowRight, CreditCard, User, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookingDeposit, BookingDepositEngine } from '../../../core/services/BookingDepositEngine';
import { formatCurrency, cn } from '../../../lib/utils';
import { logger } from '../../../core/services/logger';

interface ServiceCheckoutProps {
  enterpriseId: string;
  shopId: string;
  customerName: string;
  totalAmount: number;
  onConfirm: (depositId?: string) => void;
  onCancel: () => void;
}

/**
 * ServiceCheckout - Componente de fechamento de venda para serviços.
 * Integra-se ao BookingDepositEngine para abater sinais automaticamente.
 */
export const ServiceCheckout: React.FC<ServiceCheckoutProps> = ({
  enterpriseId,
  shopId,
  customerName,
  totalAmount,
  onConfirm,
  onCancel
}) => {
  const [deposits, setDeposits] = useState<BookingDeposit[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<BookingDeposit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDeposits = async () => {
      try {
        const found = await BookingDepositEngine.findPendingDeposits(enterpriseId, customerName);
        setDeposits(found);
        if (found.length > 0) {
          setSelectedDeposit(found[0]); // Pré-seleciona o sinal mais antigo encontrado
        }
      } catch (error) {
        logger.error('finance', 'Erro ao buscar sinais para checkout', { customerName });
      } finally {
        setLoading(false);
      }
    };
    loadDeposits();
  }, [enterpriseId, customerName]);

  const remainingBalance = totalAmount - (selectedDeposit?.depositAmount || 0);

  return (
    <div className="fixed inset-0 z-[700] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-[3rem] shadow-4xl overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header Profissional */}
        <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Ticket className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Fechamento</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Validação de Créditos & Sinais</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 transition-all active:scale-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
          {/* Customer Badge */}
          <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-[2rem] border border-blue-100/50">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Identificação do Cliente</p>
              <p className="text-xl font-black text-blue-900 uppercase italic tracking-tighter">{customerName}</p>
            </div>
          </div>

          {/* Credits/Deposits List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinais & Adiantamentos</h4>
              {!loading && deposits.length > 0 && (
                 <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase italic">Crédito Disponível</span>
              )}
            </div>

            {loading ? (
              <div className="py-10 text-center animate-pulse text-slate-300 font-black uppercase text-[10px] tracking-widest">Sincronizando registros...</div>
            ) : deposits.length > 0 ? (
              <div className="grid gap-3">
                {deposits.map(dep => (
                  <button
                    key={dep.id}
                    onClick={() => setSelectedDeposit(dep.id === selectedDeposit?.id ? null : dep)}
                    className={cn(
                      "w-full p-6 rounded-[1.5rem] border-2 transition-all flex items-center justify-between group",
                      selectedDeposit?.id === dep.id 
                        ? "bg-emerald-50 border-emerald-500 shadow-xl shadow-emerald-500/10" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                        selectedDeposit?.id === dep.id ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                      )}>
                        <Ticket className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className={cn("text-xs font-black uppercase tracking-tight", selectedDeposit?.id === dep.id ? "text-emerald-900" : "text-slate-800")}>Sinal Digital #{dep.id.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pago em {new Date(dep.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xl font-black italic tracking-tighter", selectedDeposit?.id === dep.id ? "text-emerald-600" : "text-slate-900")}>{formatCurrency(dep.depositAmount)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center gap-4 grayscale">
                <Info className="w-10 h-10 text-slate-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Nenhum sinal pendente <br/> para este CPF/Nome</p>
              </div>
            )}
          </div>

          {/* Summary Footer Box */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-center border-b border-white/5 pb-6 mb-6">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total do Atendimento</span>
              <span className="text-2xl font-black italic tracking-tighter">{formatCurrency(totalAmount)}</span>
            </div>
            
            <AnimatePresence>
              {selectedDeposit && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="relative z-10 flex justify-between items-center text-emerald-400 font-black mb-8"
                >
                  <span className="text-xs uppercase tracking-widest italic">Abatimento de Sinal</span>
                  <span className="text-2xl italic tracking-tighter">-{formatCurrency(selectedDeposit.depositAmount)}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] block mb-2">Líquido a Pagar Agora</span>
                <span className="text-5xl font-black italic tracking-tighter leading-none">{formatCurrency(remainingBalance)}</span>
              </div>
              <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <CreditCard className="w-8 h-8 text-slate-500" />
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px]" />
          </div>
        </div>

        {/* Main Action Footer */}
        <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onCancel}
            className="flex-1 py-6 bg-white border-2 border-slate-200 text-slate-600 rounded-[1.8rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(selectedDeposit?.id)}
            className="flex-[2] py-6 bg-slate-900 text-white rounded-[1.8rem] font-black uppercase text-[11px] tracking-widest hover:bg-black transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {remainingBalance > 0 ? <><CreditCard className="w-5 h-5" /> Processar Saldo</> : <><CheckCircle2 className="w-5 h-5" /> Finalizar Sem Saldo</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};