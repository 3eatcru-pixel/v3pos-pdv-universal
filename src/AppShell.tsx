import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './core/components/ThemeContext';
import { accountService } from './core/services/accountService';
import { ensureFirebaseSession } from './services/authSession';
import { LoginView } from './core/views/LoginView';
import { HoldingDashboard } from './core/views/HoldingDashboard';
import { AppContent } from './AppContent';

/**
 * AppShell - Nexus 7.0 Standard
 * Centraliza Auth, Router e Bootstrap antes de liberar o layout operacional.
 */
export default function AppShell() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser] = useState(() => accountService.getCurrentUser());
  
  const [holdingActive, setHoldingActive] = useState(() => {
    const user = accountService.getCurrentUser();
    const hasEnterprise = !!accountService.getCurrentCompanyId();
    return !!user && !hasEnterprise;
  });

  useEffect(() => {
    ensureFirebaseSession().then(() => setAuthReady(true));
  }, []);

  if (!authReady) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-widest animate-pulse italic">Nexus Cloud Initiating...</div>;
  if (!currentUser) return <LoginView />;
  
  const handleSelectEnterprise = (id: string) => {
    localStorage.setItem('rm_enterprise_id', id);
    setHoldingActive(false);
  };

  if (holdingActive) return <HoldingDashboard onSelectEnterprise={handleSelectEnterprise} onLogout={() => accountService.logout()} />;

  return (
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}