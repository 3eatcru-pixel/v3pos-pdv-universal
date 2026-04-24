import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  MessageSquare, 
  Activity, 
  ShieldCheck, 
  Terminal, 
  Search, 
  Filter, 
  ChevronRight, 
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { useCollection } from '../../hooks/useCollection';
import { accountService } from '../services/accountService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '../services/logger';

export const DevAlertsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'support' | 'audit'>('alerts');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: alerts } = useCollection<any>('dev_alerts');
  const { data: supportMessages } = useCollection<any>('support_messages');
  const { data: auditLogs } = useCollection<any>('auditLogs');
  const { data: enterprises } = useCollection<any>('enterprises');

  const stats = useMemo(() => ({
    criticalAlerts: alerts.filter(a => a.priority === 'high' && a.status === 'pending_review').length,
    openSupport: supportMessages.filter(m => m.status === 'open').length,
    activeTenants: enterprises.filter(e => e.status === 'active').length,
    suspendedTenants: enterprises.filter(e => e.status === 'suspended').length,
  }), [alerts, supportMessages, enterprises]);

  const renderAlerts = () => (
    <div className="space-y-4">
      {alerts.map((alert: any) => {
        const company = enterprises.find(e => e.id === alert.companyId);
        return (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            key={alert.id}
            className="bg-slate-900 border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-rose-500/50 transition-all"
          >
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                alert.priority === 'high' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
              )}>
                <ShieldAlert size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">{alert.type}</span>
                  <span className="text-slate-600 font-mono text-[10px]">{format(alert.timestamp, 'HH:mm:ss')}</span>
                </div>
                <h4 className="text-white font-bold uppercase tracking-tight italic mt-1">
                  {company?.name || 'ID: ' + alert.companyId}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md italic">{alert.details}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => accountService.loginAsManager(alert.companyId)}
                className="p-3 bg-white/5 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                title="Investigar via Impersonation"
              >
                <Eye size={18} />
              </button>
              <button 
                className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
              >
                Resolver
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const handleSendReply = async (msgId: string) => {
    if (!replyText.trim()) return;
    try {
      await accountService.replyToSupportMessage(msgId, replyText);
      setReplyingTo(null);
      setReplyText('');
      logger.info('auth', 'Resposta de suporte enviada', { messageId: msgId });
    } catch (error) {
      logger.error('auth', 'Erro ao enviar resposta de suporte', { error });
    }
  };

  const renderSupport = () => (
    <div className="space-y-4">
      {supportMessages.filter((m: any) => 
        m.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.userName?.toLowerCase().includes(searchTerm.toLowerCase())
      ).map((msg: any) => {
        const company = enterprises.find(e => e.id === msg.companyId);
        const isSelected = replyingTo === msg.id;

        return (
          <motion.div 
            layout
            key={msg.id}
            className={cn(
              "bg-slate-900 border border-white/5 rounded-3xl p-6 transition-all",
              msg.status === 'open' ? "border-blue-500/30 shadow-lg shadow-blue-500/5" : "opacity-60"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <User size={20} />
                 </div>
                 <div>
                    <h4 className="text-white font-bold text-sm uppercase tracking-tight italic">{msg.userName || 'Usuário'}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mt-1">
                      {company?.name || 'ID: ' + msg.companyId}
                    </p>
                 </div>
              </div>
              <div className="text-right">
                 <span className="text-[10px] text-slate-600 font-mono">{format(msg.timestamp, 'dd MMM HH:mm')}</span>
                 <div className={cn(
                   "text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1",
                   msg.status === 'open' ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                 )}>
                    {msg.status === 'open' ? 'Aberto' : 'Resolvido'}
                 </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 italic mb-6">"{msg.message}"</p>

            {msg.reply && (
              <div className="bg-black/40 rounded-2xl p-4 mb-4 border-l-4 border-emerald-500">
                 <p className="text-[9px] font-black uppercase text-emerald-500 mb-1">Resposta do Dev ({msg.repliedBy})</p>
                 <p className="text-xs text-slate-400 italic">{msg.reply}</p>
              </div>
            )}

            {isSelected ? (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <textarea 
                  autoFocus
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Digite sua resposta técnica..."
                  className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm font-bold italic outline-none focus:border-blue-500 transition-all resize-none h-24"
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setReplyingTo(null)} className="px-6 py-2 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white">Cancelar</button>
                  <button onClick={() => handleSendReply(msg.id)} className="px-8 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Enviar Resposta</button>
                </div>
              </motion.div>
            ) : (
              msg.status === 'open' && (
                <div className="flex justify-end">
                  <button onClick={() => setReplyingTo(msg.id)} className="px-6 py-2 bg-white/5 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Responder</button>
                </div>
              )
            )}
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-slate-300 font-sans p-8 md:p-16 space-y-12">
      {/* Dev Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-rose-500/20">
             <Terminal className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Dev Command Center</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Status Global da Infraestrutura & Segurança</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { label: 'Violações', val: stats.criticalAlerts, color: 'text-rose-500', icon: <ShieldAlert /> },
             { label: 'Suporte', val: stats.openSupport, color: 'text-blue-500', icon: <MessageSquare /> },
             { label: 'Tenants OK', val: stats.activeTenants, color: 'text-emerald-500', icon: <CheckCircle2 /> },
             { label: 'Suspensos', val: stats.suspendedTenants, color: 'text-slate-500', icon: <Lock /> },
           ].map((stat, i) => (
             <div key={i} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 min-w-[120px]">
                <div className={cn("mb-2", stat.color)}>{stat.icon}</div>
                <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-white italic tracking-tighter">{stat.val.toString().padStart(2, '0')}</p>
             </div>
           ))}
        </div>
      </div>

      {/* Console Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-4">
           {[
             { id: 'alerts', label: 'Monitor de Violações', icon: <ShieldAlert /> },
             { id: 'support', label: 'Chamados de Suporte', icon: <MessageSquare /> },
             { id: 'audit', label: 'Auditoria de Ações', icon: <Activity /> },
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={cn(
                 "w-full p-5 rounded-2xl flex items-center gap-4 font-black text-[10px] uppercase tracking-widest transition-all",
                 activeTab === tab.id ? "bg-white text-black shadow-2xl" : "bg-slate-900/50 text-slate-500 hover:text-white"
               )}
             >
                {tab.icon}
                {tab.label}
             </button>
           ))}
           
           <div className="pt-10">
              <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-4 px-5 italic">Quick Access</p>
              <button className="w-full p-5 rounded-2xl bg-rose-600/10 text-rose-500 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
                 <AlertTriangle size={16} /> Global Kill Switch
              </button>
           </div>
        </div>

        {/* Feed Content */}
        <div className="lg:col-span-9 space-y-8">
           <div className="bg-slate-900/30 border border-white/5 rounded-[3rem] p-10 min-h-[600px] backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-4 relative flex-1">
                    <Search className="absolute left-6 text-slate-600" size={18} />
                    <input 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Filtrar por Tenant ID ou Tipo de Erro..."
                      className="bg-black/40 border border-white/5 rounded-2xl py-4 pl-16 pr-6 w-full text-sm font-bold italic outline-none focus:border-blue-500 transition-all"
                    />
                 </div>
              </div>

              <AnimatePresence mode="wait">
                 {activeTab === 'alerts' && (
                   <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {renderAlerts()}
                      {alerts.length === 0 && (
                        <div className="py-40 text-center opacity-20 italic">
                           <ShieldCheck size={64} className="mx-auto mb-4" />
                           <p className="uppercase tracking-[0.3em] font-black">Nenhuma ameaça detectada no grid.</p>
                        </div>
                      )}
                   </motion.div>
                 )}

                 {activeTab === 'support' && (
                   <motion.div key="support" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {renderSupport()}
                      {supportMessages.length === 0 && (
                        <div className="py-40 text-center opacity-20 italic">
                           <MessageSquare size={64} className="mx-auto mb-4" />
                           <p className="uppercase tracking-[0.3em] font-black">Nenhuma mensagem pendente.</p>
                        </div>
                      )}
                   </motion.div>
                 )}

                 {activeTab === 'audit' && (
                   <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {auditLogs.slice(0, 20).map((log: any) => (
                        <div key={log.id} className="text-[11px] font-mono p-4 border-b border-white/5 flex gap-4 hover:bg-white/5">
                           <span className="text-slate-600">[{format(log.timestamp, 'HH:mm:ss')}]</span>
                           <span className="text-blue-400 font-bold">@{log.staffName}</span>
                           <span className="text-emerald-500 uppercase">[{log.action}]</span>
                           <span className="text-slate-400 truncate italic">{log.details}</span>
                        </div>
                      ))}
                   </motion.div>
                 )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
};