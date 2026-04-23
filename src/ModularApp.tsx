import { useState, useEffect } from 'react';
import { RefreshCw, Settings, Lock, ShieldAlert } from 'lucide-react';
import { BusinessMode } from './core/types';
import { moduleManager } from './moduleManager';
import { ModeSelector } from './core/components/ModeSelector';
import { ConstructionLayout } from './modules/construction/views/ConstructionLayout';
import { RetailLayout } from './modules/retail/views/RetailLayout';
import { MarketLayout } from './modules/market/views/MarketLayout';
import { logger } from './core/services/logger';
import { accountService, Company } from './core/services/accountService';
import { LoginView } from './core/views/LoginView';
import { DevDashboard } from './core/views/DevDashboard';
import { CentralServerView } from './core/views/CentralServerView';
import { serverEngine } from './services/serverEngine';
import { GlobalSettings } from './core/components/GlobalSettings';
import { ServiceLayout } from './modules/service/views/ServiceLayout';
import { ModuleManagement } from './core/views/ModuleManagement';
import { BusinessConfig } from './types';
import { firebaseService } from './services/firebaseService';
import { motion, AnimatePresence } from 'motion/react';
import { coreSyncService } from './core/services/CoreSyncService';

// We'll import the legacy App (Restaurant) for now to keep functionality
import { RestaurantLayout } from './modules/restaurant/views/RestaurantLayout';

import { UniversalPaymentModal } from './core/components/UniversalPaymentModal';

export default function ModularApp() {
  const currentUser = accountService.getCurrentUser();
  const [mode, setMode] = useState<BusinessMode>(() => {
    return localStorage.getItem('pos_business_mode') as BusinessMode || null;
  });
  const [businessConfigs, setBusinessConfigs] = useState<BusinessConfig[]>([]);
  const [isModuleConfigOpen, setIsModuleConfigOpen] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [isSystemPaused, setIsSystemPaused] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Initialize Core Services
  useEffect(() => {
    console.log('[Core] Sync Service Active');
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubConfigs = firebaseService.subscribeCollection('businessConfigs', currentUser.companyId, null, setBusinessConfigs);
    
    let mounted = true;
    const loadCompanyAndPause = async () => {
      const [comp, paused] = await Promise.all([
        accountService.getCompanyById(currentUser.companyId),
        accountService.getCompanyPauseStatus(currentUser.companyId)
      ]);
      if (mounted) {
        setCompany(comp);
        setIsSystemPaused(paused);
        setAuthReady(true);
      }
    };

    loadCompanyAndPause();

    return () => {
      unsubConfigs();
      mounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (mode) {
      moduleManager.initialize(mode);
    }
  }, [mode]);

  // Auth Guard
  if (!currentUser) {
    return <LoginView />;
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-12 h-12 animate-spin text-slate-100 opacity-20" />
      </div>
    );
  }

  // Prioritize developer-defined modules in the Company object (Infrastructure level)
  // Fallback to business config or default
  const enabledModules = (company as any)?.enabledModules || businessConfigs.find(c => c.enterpriseId === currentUser.companyId)?.enabledModules || ['restaurant'];

  const deviceMode = localStorage.getItem('pos_device_mode');

  useEffect(() => {
    if (deviceMode === 'central_server' && currentUser) {
      serverEngine.start(currentUser.companyId);
    }
    return () => {
      serverEngine.stop();
    };
  }, [deviceMode, currentUser]);

  if (deviceMode === 'central_server') {
    return <CentralServerView />;
  }

  const isMaintenance = company?.status === 'maintenance';
  const lockedModules = company?.lockedModules || [];

  // Developer Role View
  if (currentUser.role === 'dev') {
    return <DevDashboard />;
  }

  const handleModeSelect = (selectedMode: BusinessMode) => {
    if (lockedModules.includes(selectedMode)) {
      alert('Este módulo foi temporariamente travado pelo administrador do sistema para manutenção ou configuração.');
      return;
    }
    setMode(selectedMode);
    localStorage.setItem('pos_business_mode', selectedMode);
    logger.log('system', `User selected business mode: ${selectedMode}`);
  };

  const renderMaintenanceOverlay = () => {
    if (!isMaintenance) return null;
    return (
      <div className="fixed bottom-6 right-6 z-[100] max-w-xs bg-amber-500 text-white p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-right-10 duration-500 border-4 border-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-2 rounded-xl">
             <Settings className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h5 className="font-black uppercase text-[10px] tracking-widest mb-1">Conta em Manutenção</h5>
            <p className="text-xs font-bold leading-relaxed opacity-90">
              O desenvolvedor está trabalhando em sua conta. Algumas funções podem sofrer alterações em breve.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemPauseOverlay = () => (
    <AnimatePresence>
      {isSystemPaused && (
         <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center"
         >
            <div className="bg-rose-500 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-3xl shadow-rose-500/30">
               <ShieldAlert className="text-white w-16 h-16" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic uppercase">Sistema Pausado</h1>
            <p className="text-rose-200 text-xl font-medium max-w-lg leading-relaxed">
               Operações suspensas pelo administrador. Aguarde a liberação.
            </p>
            <div className="mt-12 p-8 bg-white/10 rounded-[2rem] border border-white/10 flex items-center gap-6">
               <Lock className="text-rose-400 w-8 h-8" />
               <p className="text-white font-black text-left">Protocolo de Emergência Ativo</p>
            </div>
         </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mode) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <GlobalSettings context="Painel Central" />
        {renderSystemPauseOverlay()}
        <div className={isSystemPaused ? 'pointer-events-none grayscale opacity-40 blur-sm transition-all duration-700' : 'transition-all duration-700'}>
          <ModeSelector onSelect={handleModeSelect} enabledModules={enabledModules} />
        </div>

        <AnimatePresence>
          {isModuleConfigOpen && (
            <ModuleManagement enterpriseId={currentUser.companyId} onClose={() => setIsModuleConfigOpen(false)} />
          )}
        </AnimatePresence>

        {renderMaintenanceOverlay()}
      </div>
    );
  }

  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const handler = (event: any) => {
      setPaymentRequest(event.detail);
      setIsPaymentModalOpen(true);
    };
    window.addEventListener('request-payment-ui', handler);
    return () => window.removeEventListener('request-payment-ui', handler);
  }, []);

  // Current Content
  let content = null;
  if (mode === 'restaurant' && !lockedModules.includes('restaurant')) {
    content = <RestaurantLayout />;
  } else if (mode === 'construction' && !lockedModules.includes('construction')) {
    content = <ConstructionLayout />;
  } else if (mode === 'retail' && !lockedModules.includes('retail')) {
    content = <RetailLayout />;
  } else if (mode === 'market' && !lockedModules.includes('market')) {
    content = <MarketLayout />;
  } else if (mode === 'service' && !lockedModules.includes('service')) {
    content = <ServiceLayout />;
  } else {
    content = <ModeSelector onSelect={handleModeSelect} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GlobalSettings context={mode === 'market' ? 'Mercado' : mode === 'retail' ? 'Varejo' : mode === 'restaurant' ? 'Restaurante' : mode === 'service' ? 'Serviços' : 'Obras'} />
      {renderSystemPauseOverlay()}
      
      <div className={isSystemPaused ? 'pointer-events-none grayscale opacity-40 blur-sm transition-all duration-700' : 'transition-all duration-700'}>
        {content}
      </div>
      
      {renderMaintenanceOverlay()}

      {paymentRequest && (
        <UniversalPaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          total={paymentRequest.total}
          title={paymentRequest.title}
          itemsSummary={paymentRequest.itemsSummary}
          orderId={paymentRequest.orderId}
          onSuccess={async (payments) => {
             if (paymentRequest.onSuccess) {
                await paymentRequest.onSuccess(payments);
             }
          }}
        />
      )}
    </div>
  );
}
