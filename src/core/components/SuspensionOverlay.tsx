import React from 'react';
import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { accountService } from '../services/accountService';

interface SuspensionOverlayProps {
  company: {
    name: string;
    status: string;
    suspensionReason?: string;
  };
}

/**
 * SuspensionOverlay: Bloqueio total de UI para empresas suspensas.
 * O desenvolvedor master possui bypass para realizar manutenções.
 */
export const SuspensionOverlay: React.FC<SuspensionOverlayProps> = ({ company }) => {
  const user = accountService.getCurrentUser();
  const isDev = user?.role === 'dev';

  // Lógica: Se não estiver suspensa ou for desenvolvedor master, não exibe nada.
  if (company.status !== 'suspended' || isDev) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-6 text-white text-center">
      {/* Efeito de brilho de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600 rounded-full blur-[150px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-2xl w-full space-y-10 relative z-10"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-rose-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-500/40 animate-pulse">
            <ShieldAlert size={48} className="text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">Acesso Suspenso</h1>
            <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">{company.name}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-6 backdrop-blur-md">
          <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
            Esta unidade foi suspensa por decisão administrativa. O acesso aos dados e operações de venda estão bloqueados devido a irregularidades cadastrais ou violação dos termos de uso.
          </p>
          
          {company.suspensionReason && (
            <div className="py-4 px-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-left">
               <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">Nota Administrativa</p>
               <p className="text-sm font-bold text-rose-100">{company.suspensionReason}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
           <button 
             onClick={() => window.location.href = 'mailto:suporte@pos-universal.com'}
             className="px-10 py-5 bg-white text-slate-900 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-slate-200 transition-all active:scale-95"
           >
              <MessageSquare size={16} /> Contatar Central
           </button>
           <button 
             onClick={() => accountService.logoutCompany()}
             className="px-10 py-5 bg-slate-900 text-slate-400 border border-white/10 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:text-white transition-all active:scale-95"
           >
              <LogOut size={16} /> Desconectar Terminal
           </button>
        </div>
        
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Tenant Hash: {accountService.getCurrentCompanyId()}</p>
      </motion.div>
    </div>
  );
};