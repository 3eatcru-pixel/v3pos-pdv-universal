import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  X, 
  User, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  RefreshCw,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { DailyPayoutEngine, FreelancerPayout } from '../services/DailyPayoutEngine';
import { Staff } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '../services/logger';

export const PayoutApprovalDashboard: React.FC = () => {
  const currentUser = accountService.getCurrentUser();
  const enterpriseId = currentUser?.companyId || 'default';

  const { data: pendingPayouts, loading, refresh } = useCollection<FreelancerPayout>('freelancer_payouts', {
    enterpriseId,
    status: 'calculated' // Busca apenas os pagamentos que precisam de autorização
  });
  const { data: staff } = useCollection<Staff>('staff', { enterpriseId });

  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [authorizing, setAuthorizing] = useState(false);

  const staffMap = useMemo(() => {
    return new Map(staff.map(s => [s.id, s]));
  }, [staff]);

  const handleToggleSelect = (payoutId: string) => {
    setSelectedPayouts(prev => 
      prev.includes(payoutId) ? prev.filter(id => id !== payoutId) : [...prev, payoutId]
    );
  };

  const handleAuthorizeSelected = async () => {
    if (selectedPayouts.length === 0) {
      alert('Selecione pelo menos um pagamento para autorizar.');
      return;
    }
    if (!currentUser?.name) {
      alert('Nome do usuário não disponível para auditoria.');
      return;
    }

    if (!confirm(`Confirmar autorização de ${selectedPayouts.length} pagamentos? Esta ação é irreversível.`)) {
      return;
    }

    setAuthorizing(true);
    try {
      const promises = selectedPayouts.map(payoutId => 
        DailyPayoutEngine.authorizePayout(payoutId, currentUser.name!)
      );
      await Promise.all(promises);
      setSelectedPayouts([]);
      await refresh(); // Atualiza a lista após a autorização
      logger.info('finance', 'Pagamentos de freelancer autorizados em lote', { count: promises.length, authorizedBy: currentUser.name });
    } catch (error) {
      logger.error('finance', 'Falha ao autorizar pagamentos em lote', { error });
      alert('Erro ao autorizar pagamentos. Verifique os logs.');
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Aprovação de Diárias</h2>
           <p className="text-slate-500 font-medium italic">Gerencie pagamentos de freelancers e parceiros.</p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={handleAuthorizeSelected}
             disabled={selectedPayouts.length === 0 || authorizing}
             className={cn(
               "px-10 py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3 active:scale-95",
               (selectedPayouts.length === 0 || authorizing) && "opacity-50 cursor-not-allowed"
             )}
           >
              <CheckCircle2 className="w-4 h-4" /> {authorizing ? 'Autorizando...' : `Autorizar ${selectedPayouts.length} Pagamento(s)`}
           </button>
        </div>
      </div>

      {/* Payouts List */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Diárias Pendentes ({pendingPayouts.length})</h3>
          <button onClick={refresh} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-blue-600 transition-all">
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>

        <div className="p-8 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest animate-pulse">Carregando pagamentos...</div>
          ) : pendingPayouts.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">Nenhum pagamento pendente de autorização.</div>
          ) : (
            pendingPayouts.map(payout => {
              const freelancer = staffMap.get(payout.staffId);
              return (
                <motion.div 
                  key={payout.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex items-center justify-between group hover:border-blue-500/50 transition-all",
                    selectedPayouts.includes(payout.id) && "bg-blue-50 border-blue-500/50"
                  )}
                >
                  <div className="flex items-center gap-5">
                    <input 
                      type="checkbox" 
                      checked={selectedPayouts.includes(payout.id)}
                      onChange={() => handleToggleSelect(payout.id)}
                      className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{freelancer?.name || 'Freelancer Desconhecido'}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Turno: {format(payout.createdAt, 'dd/MM HH:mm', { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 uppercase italic">Diária Base: {formatCurrency(payout.baseRate)}</p>
                    <p className="text-sm font-black text-emerald-600 uppercase italic">Comissão: {formatCurrency(payout.commissionAmount)}</p>
                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter mt-2">{formatCurrency(payout.totalAmount)}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};