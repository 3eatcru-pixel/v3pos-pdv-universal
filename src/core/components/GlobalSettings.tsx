import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  LogOut, 
  PauseCircle, 
  PlayCircle, 
  ShieldAlert, 
  X, 
  Key,
  Info,
  HelpCircle,
  Smartphone,
  Globe,
  Database,
  LayoutGrid,
  ChevronRight,
  Server,
  Wifi,
  CloudSync,
  CloudUpload,
  Chrome,
  Cloud,
  Cpu,
  Calendar,
  Map as MapIcon,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { accountService } from '../services/accountService';
import { cn } from '../../lib/utils';
import { useCollection } from '../../hooks/useCollection';
import { ModuleManagement } from '../views/ModuleManagement';
import { UserInboxView } from '../views/UserInboxView'; // Importar UserInboxView
import { PayoutApprovalDashboard } from '../views/PayoutApprovalDashboard'; // Importar novo dashboard
import { CommunicationEngine, InternalMessage } from '../services/CommunicationEngine';
import { BackupManagerView } from '../views/BackupManagerView';
import { CloudConfigEngine } from '../services/CloudConfigEngine';

interface GlobalSettingsProps {
  context?: string;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [isPayoutsOpen, setIsPayoutsOpen] = useState(false); // Estado para o novo dashboard
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [step, setStep] = useState<'menu' | 'confirm' | 'pin'>('menu');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [companyName, setCompanyName] = useState('...');
  const [deviceRole, setDeviceRole] = useState<'host' | 'co-host' | 'none'>('none');
  const [googleBackupEnabled, setGoogleBackupEnabled] = useState(false);
  const [backupInterval, setBackupInterval] = useState(10); // Default 10min
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [customLogo, setCustomLogo] = useState('');
  const [customName, setCustomName] = useState('');
  const [cloudProvider, setCloudProvider] = useState<'system' | 'custom_firestore'>('system');
  const [cloudTier, setCloudTier] = useState<'free' | 'turbo'>('free');
  const [blockOnZeroStock, setBlockOnZeroStock] = useState(false);
  
  const [customProjectId, setCustomProjectId] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [isValidatingCloud, setIsValidatingCloud] = useState(false);
  const [cloudValidationStatus, setCloudValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const user = accountService.getCurrentUser();
  const companyId = user?.companyId || '';
  const canAdmin = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'dev';

  const [inboxFilterType, setInboxFilterType] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [inboxFilterPeriod, setInboxFilterPeriod] = useState<'all' | '7d' | '30d'>('all');

  const { data: inboxMessages } = useCollection<InternalMessage>('user_inbox', { 
    enterpriseId: companyId || null,
    userId: user?.id, // Restringe a busca ao usuário logado por segurança
    ...(inboxFilterType !== 'all' && { type: inboxFilterType }),
    ...(inboxFilterPeriod !== 'all' && { period: inboxFilterPeriod }) // Firebase query for period needs to be implemented in firebaseService
  });

  const unreadCount = useMemo(() => 
    inboxMessages.filter((m: any) => !m.read).length, 
  [inboxMessages]);

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      if (!companyId) return;
      const [paused, company] = await Promise.all([
        accountService.getCompanyPauseStatus(companyId),
        accountService.getCompanyById(companyId)
      ]);
      if (mounted) {
        setIsPaused(paused);
        setCompanyName(company?.name || 'N/A');
        setDeviceRole(accountService.getDeviceRole());
        setGoogleBackupEnabled((company as any)?.googleDriveBackupEnabled || false);
        setBackupInterval((company as any)?.backupIntervalMinutes || 10);
        setCustomLogo((company as any)?.branding?.logo || '');
        setCustomName((company as any)?.branding?.customName || '');
        // Simulação de verificação de provedor vinculado
        setIsGoogleLinked(user?.email?.includes('gmail.com') || false); 
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, [companyId]);

  const handleToggleServer = async () => {
    const next = !isLocalServer;
    await accountService.toggleLocalServerMode(next);
    setIsLocalServer(next);
  };

  const handleManualSync = async () => {
    if (companyId) await meshNetwork.requestCloudSync(companyId, true); // Força uma sincronização
  };

  const handleToggleBackup = async () => {
    const next = !googleBackupEnabled;
    await accountService.updateBackupSettings(companyId, next);
    setGoogleBackupEnabled(next);
  };

  const handleUpdateBranding = async () => {
    await accountService.updateCompanyBranding(companyId, { logo: customLogo, customName });
  };

  const handleLinkGoogle = async () => {
    await accountService.linkGoogleAccount();
  };

  const handleUpdateCloud = async (provider: 'system' | 'custom_firestore', tier: 'free' | 'turbo') => {
    if (provider === 'custom_firestore') {
      setIsValidatingCloud(true);
      setError(null); // Auditoria: Limpa erros anteriores antes de validar nova config
      setCloudValidationStatus('idle');
      
      const result = await CloudConfigEngine.validateFirestoreConfig(customProjectId, customApiKey);
      
      setIsValidatingCloud(false);
      if (!result.success) {
        setCloudValidationStatus('error');
        setError(result.error || 'Falha na validação');
        return;
      }
      
      setCloudValidationStatus('success');
      await accountService.updateCloudInfrastructure(companyId, { 
        provider, tier, customConfig: { projectId: customProjectId, apiKey: customApiKey } 
      });
    } else {
      await accountService.updateCloudInfrastructure(companyId, { provider, tier });
    }
    setCloudProvider(provider);
    setCloudTier(tier);
  };

  const resetState = () => {
    setIsOpen(false);
    setStep('menu');
    setPin('');
    setError(null);
  };

  const handlePause = async () => {
    const success = await accountService.pauseSystem(companyId, pin);
    if (success) {
      resetState();
      window.location.reload();
    } else {
      setError('PIN Incorreto. Falha na autenticação administrativa.');
      setPin('');
    }
  };

  const handleLogout = async () => {
    try {
      await accountService.logoutCompany();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="fixed top-6 right-6 z-[100] flex gap-3">
        {isPaused && (
           <div className="bg-rose-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sistema Pausado</span>
           </div>
        )}
        <button 
          onClick={() => setIsOpen(true)}
          className="relative bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl text-slate-600 hover:bg-white hover:text-blue-600 transition-all shadow-sm group active:scale-95"
          title="Configurações Globais"
          aria-label="Abrir Configurações"
        >
          <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-lg animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetState}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-slate-900/20 overflow-hidden"
            >
              {step === 'menu' && (
                <>
                  <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Configurações</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Terminal: {context || 'Global'}</p>
                    </div>
                    <button 
                      onClick={resetState}
                      className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-600 transition-colors"
                      title="Fechar"
                      aria-label="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                  </div>

                    <div className="p-10 space-y-8">
                       <div className="space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Painel de Operações</span>
                          <div className="grid grid-cols-1 gap-3">
                             <button 
                               onClick={() => { /* Navegar para Escalas */ setIsOpen(false); }}
                               className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:bg-blue-50 transition-all group"
                             >
                                <div className="flex items-center gap-4">
                                   <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Calendar className="w-5 h-5" /></div>
                                   <div className="text-left">
                                      <h4 className="font-black text-slate-800 text-sm italic uppercase">Escalas da Unidade</h4>
                                      <p className="text-[10px] text-slate-400 font-bold">Consulte turnos e folgas</p>
                                   </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-200" />
                             </button>

                             <button 
                               onClick={() => { /* Navegar para Mapas */ setIsOpen(false); }}
                               className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:bg-indigo-50 transition-all group"
                             >
                                <div className="flex items-center gap-4">
                                   <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><MapIcon className="w-5 h-5" /></div>
                                   <div className="text-left">
                                      <h4 className="font-black text-slate-800 text-sm italic uppercase">Mapas da Loja</h4>
                                      <p className="text-[10px] text-slate-400 font-bold">Layout técnico de ativos</p>
                                   </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-200" />
                             </button>

                             <button 
                               onClick={() => { setIsInboxOpen(true); setIsOpen(false); }}
                               className="w-full flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:bg-emerald-50 transition-all group"
                             >
                                <div className="flex items-center gap-4">
                                   <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl relative">
                                      <MessageSquare className="w-5 h-5" />
                                      {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />}
                                   </div>
                                   <div className="text-left">
                                      <h4 className="font-black text-slate-800 text-sm italic uppercase">Mensagens</h4>
                                      <p className="text-[10px] text-slate-400 font-bold">Inbox interno e alertas</p>
                                   </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-200" />
                             </button>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Minha Identidade</span>
                          <button 
                            onClick={handleLinkGoogle}
                            className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white transition-all group"
                          >
                              <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-xl shadow-lg", isGoogleLinked ? "bg-emerald-500" : "bg-white border border-slate-200")}>
                                  <Chrome className={cn("w-5 h-5", isGoogleLinked ? "text-white" : "text-slate-400")} />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-black text-slate-800 text-sm">Conta Google</h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                                    {isGoogleLinked ? 'Conta vinculada para Login' : 'Vincular para login rápido'}
                                  </p>
                                </div>
                              </div>
                              {isGoogleLinked ? (
                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Ativo</div>
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                              )}
                          </button>
                       </div>

                       {canAdmin && (
                         <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Identidade da Marca</span>
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                               <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nome Exclusivo do App</label>
                                  <input 
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                    onBlur={handleUpdateBranding}
                                    placeholder="Ex: Minha Distribuidora"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                  />
                               </div>
                               <div className="space-y-3">
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1">URL da Logo (PNG/SVG)</label>
                                  <input 
                                    value={customLogo}
                                    onChange={e => setCustomLogo(e.target.value)}
                                    onBlur={handleUpdateBranding}
                                    placeholder="https://sua-logo.com/img.png"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[10px] font-mono outline-none focus:border-blue-500 transition-all"
                                  />
                               </div>
                            </div>
                         </div>
                       )}

                       {inboxMessages.length > 0 && (
                         <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Comunicações</span>
                               <div className="flex gap-2">
                                  <select 
                                    value={inboxFilterType}
                                    onChange={(e) => setInboxFilterType(e.target.value as any)}
                                    className="text-[8px] font-black uppercase bg-slate-100 border-none rounded-md px-2 py-1 outline-none text-slate-600 focus:ring-1 focus:ring-blue-500"
                                  >
                                     <option value="all">Todos</option>
                                     <option value="info">Info</option>
                                     <option value="warning">Aviso</option>
                                     <option value="critical">Crítico</option>
                                  </select>
                                  <select 
                                    value={inboxFilterPeriod}
                                    onChange={(e) => setInboxFilterPeriod(e.target.value as any)}
                                    className="text-[8px] font-black uppercase bg-slate-100 border-none rounded-md px-2 py-1 outline-none text-slate-600 focus:ring-1 focus:ring-blue-500"
                                  >
                                     <option value="all">Data</option>
                                     <option value="7d">7 dias</option>
                                     <option value="30d">30 dias</option>
                                  </select>
                               </div>
                            </div>
                            <button 
                              onClick={() => { setIsInboxOpen(true); setIsOpen(false); }}
                              className="w-full flex items-center justify-between p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 hover:bg-white hover:border-blue-200 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg">
                                    <MessageSquare className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="font-black text-slate-800 text-sm">Mensagens Internas</h4>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase">
                                      {unreadCount > 0 
                                        ? `${unreadCount} não lidas` 
                                        : `${inboxMessages.length} mensagens`}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-blue-300" />
                            </button>
                         </div>
                       )}

                       {canAdmin && (
                         <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Cloud Computing</span>
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className={cn("p-3 rounded-xl", cloudProvider === 'custom_firestore' ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200")}>
                                        <Cloud className="w-4 h-4" />
                                     </div>
                                     <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase italic">Provedor Firestore</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{cloudProvider === 'system' ? 'Padrão Grid OS' : 'Meu Google Cloud'}</p>
                                     </div>
                                  </div>
                                  <div className="flex gap-1 bg-white p-1 rounded-full border border-slate-200">
                                     <button 
                                       onClick={() => handleUpdateCloud('system', 'free')} 
                                       className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all", cloudProvider === 'system' ? "bg-slate-900 text-white" : "text-slate-400")}
                                     >
                                       Padrão
                                     </button>
                                     <button 
                                       onClick={() => setCloudProvider('custom_firestore')} 
                                       className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all", cloudProvider === 'custom_firestore' ? "bg-indigo-600 text-white" : "text-slate-400")}
                                     >
                                       Modo Turbo
                                     </button>
                                  </div>
                               </div>
                               
                               {cloudProvider === 'custom_firestore' && cloudTier !== 'turbo' && (
                                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-slate-200">
                                    <div className="space-y-2">
                                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Project ID</label>
                                       <input 
                                         value={customProjectId}
                                         onChange={e => setCustomProjectId(e.target.value)}
                                         placeholder="my-awesome-project-123"
                                         className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono outline-none focus:border-indigo-500 transition-all"
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key (Firestore Access)</label>
                                       <input 
                                         type="password"
                                         value={customApiKey}
                                         onChange={e => setCustomApiKey(e.target.value)}
                                         placeholder="AIzaSy..."
                                         className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono outline-none focus:border-indigo-500 transition-all"
                                       />
                                    </div>
                                    <button 
                                      disabled={isValidatingCloud || !customProjectId || !customApiKey}
                                      onClick={() => handleUpdateCloud('custom_firestore', 'turbo')}
                                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                       {isValidatingCloud ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                                       Validar e Ativar GCP
                                    </button>
                                 </motion.div>
                               )}

                               {cloudProvider === 'system' ? (
                                 <div className="space-y-2">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
                                       <span>Uso de Unidades Mensais</span>
                                       <span>128 / 400 units</span>
                                    </div>
                                    <div className="h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
                                       <motion.div initial={{ width: 0 }} animate={{ width: '32%' }} className="h-full bg-blue-500 rounded-full" />
                                    </div>
                                 </div>
                               ) : (
                                 <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                                    <Cpu className="w-4 h-4 text-indigo-600" />
                                    <div>
                                       <p className="text-[10px] font-black text-indigo-900 uppercase leading-none">Modo Turbo Ativo</p>
                                       <p className="text-[8px] font-medium text-indigo-600 mt-1 uppercase">Sincronismo prioritário e IA ativada via sua GCP.</p>
                                    </div>
                                 </div>
                               )}
                            </div>

                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className={cn("p-3 rounded-xl", blockOnZeroStock ? "bg-rose-500 text-white" : "bg-white text-slate-400 border border-slate-200")}>
                                        <Database className="w-4 h-4" />
                                     </div>
                                     <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase italic">Trava de Estoque</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{blockOnZeroStock ? 'Bloquear venda em 0' : 'Permitir estoque negativo'}</p>
                                     </div>
                                  </div>
                                  <button 
                                    onClick={handleToggleStockBlock}
                                    className={cn("w-12 h-6 rounded-full transition-all relative flex items-center px-1", blockOnZeroStock ? "bg-rose-500" : "bg-slate-300")}
                                  >
                                     <motion.div animate={{ x: blockOnZeroStock ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                  </button>
                               </div>
                               <div className="p-3 bg-white/60 rounded-xl border border-slate-100">
                                  <p className="text-[8px] text-slate-400 font-medium leading-relaxed uppercase tracking-tighter">
                                     Se desativado, o estoque pode ficar negativo para indicar falhas na reconciliação ou permitir vendas urgentes sem saldo no sistema.
                                  </p>
                               </div>
                            </div>
                         </div>
                       )}

                       {canAdmin && (
                         <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Financeiro</span>
                            <button 
                              onClick={() => { setIsPayoutsOpen(true); setIsOpen(false); }}
                              className="w-full flex items-center justify-between p-5 bg-emerald-50 rounded-[1.5rem] border border-emerald-100 hover:bg-white hover:border-emerald-200 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg">
                                    <Wallet className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="font-black text-slate-800 text-sm">Aprovação de Diárias</h4>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Gerenciar pagamentos de freelancers</p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-emerald-300" />
                            </button>
                         </div>
                       )}

                       {canAdmin && (
                         <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Infraestrutura Local</span>
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className={cn("p-3 rounded-xl", deviceRole !== 'none' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-200 text-slate-400")}>
                                        <Server className="w-4 h-4" />
                                     </div>
                                     <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase italic">Papel do Dispositivo</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Define a hierarquia na rede local</p>
                                     </div>
                                  </div>
                               </div>

                              <div className="flex gap-1 bg-white p-1 rounded-full border border-slate-200">
                                 <button 
                                   onClick={() => handleSetDeviceRole('host')}
                                   className={cn("flex-1 py-2 rounded-full text-[8px] font-black uppercase transition-all", deviceRole === 'host' ? "bg-blue-600 text-white shadow-md" : "text-slate-400")}
                                 >
                                   Host Principal
                                 </button>
                                 <button 
                                   onClick={() => handleSetDeviceRole('co-host')}
                                   className={cn("flex-1 py-2 rounded-full text-[8px] font-black uppercase transition-all", deviceRole === 'co-host' ? "bg-indigo-500 text-white shadow-md" : "text-slate-400")}
                                 >
                                   Co-Host
                                 </button>
                                 <button 
                                   onClick={() => handleSetDeviceRole('none')}
                                   className={cn("flex-1 py-2 rounded-full text-[8px] font-black uppercase transition-all", deviceRole === 'none' ? "bg-slate-900 text-white shadow-md" : "text-slate-400")}
                                 >
                                   Terminal
                                 </button>
                              </div>
                               
                               {deviceRole !== 'none' && (
                                 <button 
                                   onClick={handleManualSync}
                                   className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                                 >
                                    <Wifi className="w-3 h-3" /> Forçar Sincronismo Cloud
                                 </button>
                               )}
                            </div>
                            
                            <div className="p-6 bg-slate-900 rounded-[2rem] border border-white/5 space-y-4 shadow-2xl">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className={cn("p-3 rounded-xl", googleBackupEnabled ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-500")}>
                                        <CloudUpload className="w-4 h-4" />
                                     </div>
                                     <div>
                                        <h4 className="text-xs font-black text-white uppercase italic">Backup G-Drive</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">Cópia redundante de segurança</p>
                                     </div>
                                  </div>
                              <div className="flex items-center gap-4">
                                 {googleBackupEnabled && (
                                   <div className="flex flex-col items-end">
                                      <span className="text-[8px] font-black text-blue-400 uppercase">A cada {backupInterval}min</span>
                                      <input 
                                        type="range" min="1" max="60" step="1" 
                                        value={backupInterval} 
                                        onChange={(e) => handleUpdateBackup(true, parseInt(e.target.value))}
                                        className="w-20 h-1 bg-slate-700 rounded-lg appearance-none accent-blue-500"
                                      />
                                   </div>
                                 )}
                                 <button 
                                   onClick={() => handleUpdateBackup(!googleBackupEnabled, backupInterval)}
                                   className={cn("w-12 h-6 rounded-full transition-all relative flex items-center px-1", googleBackupEnabled ? "bg-emerald-500" : "bg-slate-700")}
                                 >
                                    <motion.div animate={{ x: googleBackupEnabled ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                 </button>
                              </div>
                               </div>
                               <button 
                                 onClick={() => { setIsRestoreOpen(true); setIsOpen(false); }}
                                 className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                               >
                                  <RefreshCw className="w-3 h-3" /> Restaurar via Snapshot Drive
                               </button>
                               <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                  <p className="text-[8px] text-slate-400 font-medium leading-relaxed uppercase tracking-tighter">
                                     <span className="text-amber-500 font-black">RECOMENDADO:</span> Exporta mensalmente um espelho dos dados operacionais para sua conta pessoal do Google Drive.
                                  </p>
                               </div>
                            </div>
                         </div>
                       )}
                       
                       {canAdmin && (
                         <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Personalização</span>
                            <button 
                              onClick={() => { /* Navegar para SettingsCustomizationView */ setIsOpen(false); }}
                              className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-slate-900 text-white rounded-xl shadow-lg">
                                    <Settings className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <h4 className="font-black text-slate-800 text-sm">Recursos Opcionais</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Ativar/Desativar features da unidade</p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                            </button>
                         </div>
                       )}

                       {user?.role === 'dev' && (
                         <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Configuração Global (DEV)</span>
                            <button 
                              onClick={() => { setIsModulesOpen(true); setIsOpen(false); }}
                              className="w-full flex items-center gap-4 p-5 bg-indigo-50 rounded-[1.5rem] border border-indigo-100 hover:bg-white hover:border-indigo-200 transition-all group"
                            >
                                <div className="p-3 bg-white border border-indigo-200 rounded-xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                  <LayoutGrid className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-black text-slate-800 text-sm">Gerenciar Módulos</h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Ativar restaurante, mercado, etc</p>
                                </div>
                            </button>
                         </div>
                       )}

                    <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Sessão</span>
                        <div className="grid grid-cols-1 gap-3">
                          <button 
                            onClick={() => { localStorage.removeItem('pos_business_mode'); window.location.reload(); }}
                            className="w-full flex items-center gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group"
                          >
                              <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                                <LayoutGrid className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h4 className="font-black text-slate-800 text-sm">Alternar Módulo</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Trocar entre Restaurante, Mercado, etc</p>
                              </div>
                          </button>

                          <button 
                            onClick={() => accountService.logout()}
                            className="w-full flex items-center gap-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group"
                          >
                              <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 group-hover:text-blue-500 group-hover:border-blue-100 transition-colors">
                                <LogOut className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h4 className="font-black text-slate-800 text-sm">Trocar Usuário</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Sair do login atual</p>
                              </div>
                          </button>

                          {canAdmin && (
                            <button 
                              onClick={handleLogout}
                              className="w-full flex items-center gap-4 p-5 bg-rose-50 rounded-[1.5rem] border border-rose-100 hover:bg-rose-100/50 transition-all group"
                            >
                                <div className="p-3 bg-white border border-rose-100 rounded-xl text-rose-500 transition-colors">
                                  <Globe className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                  <h4 className="font-black text-rose-800 text-sm">Desconectar Unidade</h4>
                                  <p className="text-[10px] text-rose-400 font-bold uppercase">Remover empresa deste terminal</p>
                                </div>
                            </button>
                          )}
                        </div>
                    </div>

                    {canAdmin && (
                      <div className="space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Ações Críticas</span>
                          <button 
                            onClick={() => setStep('confirm')}
                            className={cn(
                              "w-full flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all group",
                              isPaused 
                                ? "bg-emerald-50 border-emerald-500 text-emerald-900" 
                                : "bg-rose-50 border-rose-500/20 text-rose-900 hover:border-rose-500"
                            )}
                          >
                            <div className={cn(
                              "p-4 rounded-2xl shadow-sm",
                              isPaused ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            )}>
                                {isPaused ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-6 h-6" />}
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-lg tracking-tight uppercase italic">{isPaused ? 'Retomar Sistema' : 'Pausa de Emergência'}</h4>
                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                                  {isPaused ? 'Reativar todas as operações' : 'Bloquear vendas instantaneamente'}
                                </p>
                            </div>
                          </button>
                      </div>
                    )}

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4">
                        <Info className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-[10px] text-slate-600 font-bold leading-relaxed uppercase tracking-tighter italic">
                              Empresa: <span className="text-blue-600 font-black tracking-normal not-italic">{companyName}</span>
                          </p>
                        </div>
                    </div>
                  </div>
                </>
              )}

              {step === 'confirm' && (
                <div className="p-12 text-center space-y-8">
                  <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Confirmação de Segurança</h3>
                    <p className="text-slate-400 text-xs font-bold leading-relaxed mt-2 uppercase tracking-widest">
                      Você deseja realmente {isPaused ? 'reativar' : 'pausar'} todas as operações da empresa?
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setStep('pin')}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                    >
                      Sim, tenho certeza
                    </button>
                    <button 
                      onClick={() => setStep('menu')}
                      className="w-full py-5 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {step === 'pin' && (
                <div className="p-12 space-y-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Autenticação Requerida</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 leading-loose">
                      {isPaused ? 'REATIVAÇÃO' : 'SUSPENSÃO'} DO SISTEMA
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <label htmlFor="admin-pin" className="sr-only">PIN Administrativo</label>
                      <input 
                        id="admin-pin"
                        type="password"
                        required
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="PIN ADMIN" 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 focus:bg-white rounded-[1.5rem] py-6 pl-14 pr-6 font-mono font-black text-3xl tracking-[0.5em] outline-none transition-all text-center"
                        title="PIN Administrativo"
                      />
                    </div>
                    {error && <p className="text-[10px] text-rose-500 font-black text-center animate-bounce uppercase">{error}</p>}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      disabled={pin.length < 4}
                      onClick={handlePause}
                      className="w-full py-6 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all disabled:opacity-50"
                    >
                      Processar Autorização
                    </button>
                    <button 
                      onClick={() => { setStep('confirm'); setError(null); }}
                      className="w-full py-5 text-slate-400 font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence>
        {isModulesOpen && user && (
          <ModuleManagement enterpriseId={user.companyId} onClose={() => setIsModulesOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInboxOpen && user && (
          <UserInboxView 
            enterpriseId={user.companyId} 
            userId={user.id} 
            userName={user.name} // Passa o nome do usuário para a view
            messages={inboxMessages} 
            onClose={() => setIsInboxOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPayoutsOpen && user && (
          <PayoutApprovalDashboard />
        )}
      </AnimatePresence>
      <div className="p-8 text-center border-t border-slate-100 bg-slate-50/50">
                 <button className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 mx-auto">
                    <HelpCircle className="w-3 h-3" /> Grid OS Security Cluster
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
