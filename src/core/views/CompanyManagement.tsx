import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  MessageSquare, 
  Key, 
  Send, 
  CheckCircle,
  Copy,
  Info,
  Server,
  Zap,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { accountService, Company } from '../services/accountService';
import { meshNetwork } from '../../services/p2pSync';
import { cn } from '../../lib/utils';

export const CompanyManagement: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [syncMode, setSyncMode] = useState(meshNetwork.getSyncMode());

  useEffect(() => {
    let mounted = true;
    const loadCompany = async () => {
      const data = await accountService.getCompanyById(accountService.getCurrentCompanyId() || '');
      if (mounted) setCompany(data);
    };
    loadCompany();
    return () => { mounted = false; };
  }, []);

  if (!company) return (
    <div className="flex items-center justify-center p-20">
      <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
    </div>
  );

  const handleSyncModeChange = (mode: 'p2p' | 'host_server') => {
    meshNetwork.setSyncMode(mode);
    setSyncMode(mode);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(company.accessCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    await accountService.sendSupportMessage(supportMessage);
    setSupportMessage('');
    setIsSent(true);
    setTimeout(() => setIsSent(false), 5000);
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto py-10">
      <div className="flex items-center gap-6 mb-8">
        <div className="bg-blue-600 p-4 rounded-[2rem] text-white">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Gestão da Unidade</h2>
          <p className="text-slate-500 font-medium">Configurações de acesso e suporte técnico.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Access Control */}
        <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 text-blue-600">
            <Key className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-xs">Controle de Acesso</h3>
          </div>
          
          <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center relative group">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">Código de Funcionário</span>
            <span className="text-5xl font-black text-slate-800 tracking-[0.2em] block mb-6 font-mono">
              {company.accessCode}
            </span>
            <button 
              onClick={handleCopyCode}
              className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              {isCopied ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {isCopied ? 'Copiado!' : 'Copiar Código'}
            </button>
          </div>

          <div className="flex items-start gap-3 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
              Compartilhe este código apenas com seus funcionários de confiança. Ele permite vincular novos terminais (dispositivos) à sua rede local isolada.
            </p>
          </div>
        </section>

        {/* Support */}
        <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center gap-4 text-rose-600">
            <MessageSquare className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-widest text-xs">Suporte Global Dev</h3>
          </div>

          <form onSubmit={handleSendSupport} className="space-y-4">
            <textarea 
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Descreva seu problema ou solicitação técnica..."
              className="w-full h-32 bg-slate-50 border-2 border-transparent focus:border-rose-500 focus:bg-white rounded-[1.5rem] p-6 font-medium outline-none transition-all resize-none"
            />
            
            <button 
              type="submit"
              disabled={isSent || !supportMessage.trim()}
              className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSent ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {isSent ? 'Mensagem Enviada!' : 'Enviar ao Suporte'}
              {isSent ? <CheckCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </form>

          <p className="text-[10px] text-slate-400 font-black uppercase text-center tracking-widest mt-6">
            Tempo médio de resposta: 4h
          </p>
          <div className="flex items-center gap-2 justify-center text-[10px] text-slate-500 font-bold mt-2">
             <span>Ou contate via email:</span>
             <a href="mailto:3eatcru@gmail.com" className="text-blue-500 hover:text-blue-600 transition-colors">3eatcru@gmail.com</a>
          </div>
        </section>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/10 rounded-2xl">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h4 className="font-black uppercase tracking-tight">Gerenciar Time</h4>
            <p className="text-xs text-white/50">Veja quem está online na sua rede Wi-Fi agora.</p>
          </div>
        </div>
        <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors">
          Visualizar Monitor
        </button>
      </div>

      {/* Sync Mode Strategy */}
      <section className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-xl space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 text-emerald-600">
               <Zap className="w-8 h-8 focus:animate-pulse" />
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic italic">Estratégia de Sincronismo</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Defina como os terminais se comunicam</p>
               </div>
            </div>
            {meshNetwork.fallbackStatus && (
               <div className="px-5 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">MODO FALLBACK ATIVO</span>
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <button 
              onClick={() => handleSyncModeChange('p2p')}
              className={cn(
               "p-10 rounded-[3rem] border-2 text-left transition-all group relative overflow-hidden",
               syncMode === 'p2p' ? "border-emerald-500 bg-emerald-50" : "border-slate-100 hover:border-slate-200"
              )}
             >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                  syncMode === 'p2p' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400"
                )}>
                   <Users className="w-6 h-6" />
                </div>
                <h4 className={cn("text-xl font-black uppercase tracking-tighter italic mb-4", syncMode === 'p2p' ? "text-emerald-900" : "text-slate-800")}>Rede Mesh (P2P)</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                   Ideal para pequenos negócios. Um celular ou tablet atua como host temporário. Rápido e prático para poucos terminais.
                </p>
             </button>

             <button 
              onClick={() => handleSyncModeChange('host_server')}
              className={cn(
               "p-10 rounded-[3rem] border-2 text-left transition-all group relative overflow-hidden",
               syncMode === 'host_server' ? "border-blue-500 bg-blue-50" : "border-slate-100 hover:border-slate-200"
              )}
             >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                  syncMode === 'host_server' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-slate-100 text-slate-400"
                )}>
                   <Server className="w-6 h-6" />
                </div>
                <h4 className={cn("text-xl font-black uppercase tracking-tighter italic mb-4", syncMode === 'host_server' ? "text-blue-900" : "text-slate-800")}>Host Server (Dedicado)</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                   Para grandes operações. Utiliza um computador dedicado como central de backup e processamento. Oferece mais estabilidade e segurança.
                </p>
             </button>
          </div>

          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200/50 flex items-center gap-8">
             <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                <Shield className="w-10 h-10" />
             </div>
             <div>
                <h5 className="font-black uppercase text-xs tracking-widest text-slate-900 mb-2">Segurança em Camadas</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                   No modo **Host Server**, o sistema valida cada venda no servidor central antes de distribuir aos outros PDVs. Em caso de queda do servidor, o sistema ativa o **Fallback Inteligente** instantaneamente.
                </p>
             </div>
          </div>
      </section>
    </div>
  );
};
