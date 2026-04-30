import React, { useState, useEffect } from 'react';
import { Utensils, ShoppingCart, Briefcase, Hammer, Tag, Check, X, Shield, Layout, AlertCircle, Zap, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BusinessConfig } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { cn } from '../../lib/utils';
import { logger } from '../services/logger';

// Interface para o tipo de notificação
interface ModuleManagementProps {
  enterpriseId: string;
  onClose: () => void;
}

export const ModuleManagement: React.FC<ModuleManagementProps> = ({ enterpriseId, onClose }) => {
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Efeito para limpar notificações após um tempo
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  useEffect(() => {
    let unsub = () => {};
    const loadConfig = async () => {
      try {
        unsub = firebaseService.subscribeCollection('businessConfigs', enterpriseId, null, (configs) => {
          if (configs.length > 0) {
            setConfig(configs[0] as BusinessConfig);
          } else {
            // Create default config if not exists
            const defaultConfig: BusinessConfig = {
              id: `cfg-${enterpriseId}`,
              enterpriseId,
              enabledModules: ['restaurant'],
              roles: [],
              workflows: {},
              customFields: [],
              updatedAt: Date.now()
            };
            firebaseService.saveItem('businessConfigs', defaultConfig.id, defaultConfig);
            setConfig(defaultConfig);
          }
          setLoading(false);
        });
      } catch (error) {
        logger.error('module_management', 'Error loading business config', { enterpriseId, error });
        setLoading(false);
      }
    };

    loadConfig();
    return () => unsub();
  }, [enterpriseId]);

  const toggleModule = async (moduleId: string) => {
    if (!config) return;
    setSaving(true);
    const isEnabled = config.enabledModules.includes(moduleId);
    const newModules = isEnabled 
      ? config.enabledModules.filter(m => m !== moduleId)
      : [...config.enabledModules, moduleId];

    // Mandatory: At least one module must be enabled? No, but good practice.
    if (newModules.length === 0) {
      setNotification({ type: 'error', message: 'Selecione pelo menos um módulo de negócio.' });
      setSaving(false);
      return;
    }

    try {
      await firebaseService.updateItem('businessConfigs', config.id, {
        enabledModules: newModules,
        updatedAt: Date.now()
      });
      setNotification({ type: 'success', message: `Módulo ${isEnabled ? 'desativado' : 'ativado'}!` });
    } catch (error: any) {
      logger.error('module_management', 'Error updating modules', { enterpriseId, moduleId, error: error.message });
      setNotification({ type: 'error', message: 'Erro ao atualizar módulos. Verifique suas permissões.' });
    } finally {
      setSaving(false);
    }
  };

  const modules = [
    { id: 'restaurant', label: 'Restaurante / Bar', icon: <Utensils />, desc: 'Gestão completa de mesas, cozinha e faturamento.' },
    { id: 'market', label: 'Mercado / PDV', icon: <ShoppingCart />, desc: 'Controle de estoque rápido e frente de caixa ágil.' },
    { id: 'service', label: 'Serviços Master', icon: <Briefcase />, desc: 'Agendamentos e gestão de profissionais liberais.' },
    { id: 'construction', label: 'Obras / Materiais', icon: <Hammer />, desc: 'Orçamentos complexos e logística de materiais.' },
    { id: 'retail', label: 'Varejo / Loja', icon: <Tag />, desc: 'Venda de produtos físicos com grade e serial.' },
    { id: 'solo_service', label: 'Autônomo (Serviços)', icon: <Briefcase />, desc: 'Agenda e cobranças simples para quem trabalha sozinho.' },
    { id: 'solo_retail', label: 'Autônomo (Vendas)', icon: <ShoppingCart />, desc: 'Vendas rápidas e estoque básico para micro-empreendedor.' },
    { id: 'convenience', label: 'Distribuidora / Conveniência', icon: <Zap />, desc: 'PDV focado em fardos, cigarros e controle de vasilhames.' },
    { id: 'google_business_pro', label: 'Marketing & Reviews', icon: <Globe />, desc: 'Gerencie seu Google Maps, avaliações e posts diretamente aqui.' },
    // Auditoria: HR, Store Management e Settings são módulos CORE, não devem ser listados como opcionais.
  ];

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
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
            {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ativação de Módulos</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure o ecossistema da sua empresa</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Carregando Configurações...</p>
            </div>
          ) : (
            <>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
                <div className="bg-white p-2 rounded-xl text-indigo-500 shadow-sm">
                   <Shield className="w-5 h-5" />
                </div>
                <div>
                   <h4 className="text-sm font-black text-indigo-900 uppercase">Configuração de Unidade</h4>
                   <p className="text-xs text-indigo-700/70 font-medium leading-relaxed mt-1">
                     Selecione quais módulos sua empresa utiliza. Os módulos ativados ficarão disponíveis para todos os seus terminais e funcionários vinculados a esta empresa.
                   </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((mod) => {
                  const isEnabled = config?.enabledModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      disabled={saving}
                      onClick={() => toggleModule(mod.id)}
                      className={cn(
                        "group p-6 rounded-[2rem] border-2 transition-all flex items-start gap-4 text-left relative overflow-hidden",
                        isEnabled ? "bg-white border-indigo-500 shadow-xl shadow-indigo-500/10" : "bg-slate-50 border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:border-slate-300"
                      )}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                        isEnabled ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                      )}>
                        {React.cloneElement(mod.icon as React.ReactElement, { className: "w-7 h-7" })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                           <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">{mod.label}</h3>
                           {isEnabled && (
                             <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                               <Check className="w-3 h-3 text-white" />
                             </div>
                           )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium leading-tight">
                          {mod.desc}
                        </p>
                      </div>

                      {isEnabled && (
                        <div className="absolute top-0 right-0 p-2 opacity-5">
                           <Layout className="w-20 h-20 -rotate-12" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <div className="w-2 h-2 rounded-full bg-indigo-400" />
             Sincronização em tempo real habilitada
           </div>
           <button 
             onClick={onClose}
             className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
           >
             Finalizar Configuração
           </button>
        </div>
      </motion.div>
    </div>
  );
};
