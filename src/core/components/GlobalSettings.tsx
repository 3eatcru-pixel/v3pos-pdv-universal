import React, { useState, useEffect } from 'react';
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
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { accountService } from '../services/accountService';
import { cn } from '../../lib/utils';
import { ModuleManagement } from '../views/ModuleManagement';

interface GlobalSettingsProps {
  context?: string;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [step, setStep] = useState<'menu' | 'confirm' | 'pin'>('menu');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [companyName, setCompanyName] = useState('...');

  const user = accountService.getCurrentUser();
  const companyId = user?.companyId || '';
  const canAdmin = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'dev';

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
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, [companyId]);

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
          className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl text-slate-600 hover:bg-white hover:text-blue-600 transition-all shadow-sm group active:scale-95"
        >
          <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform" />
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
                    >
                        <X className="w-5 h-5" />
                    </button>
                  </div>

                    <div className="p-10 space-y-8">
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
                            onClick={() => { localStorage.removeItem('pos_current_user'); window.location.reload(); }}
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
                      <input 
                        type="password"
                        required
                        maxLength={4}
                        autoFocus
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="PIN ADMIN" 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-500 focus:bg-white rounded-[1.5rem] py-6 pl-14 pr-6 font-mono font-black text-3xl tracking-[0.5em] outline-none transition-all text-center"
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
