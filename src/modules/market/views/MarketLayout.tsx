import React from 'react';
import { 
  Store, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Scale, 
  Users, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Truck, 
  FileText, 
  Settings, 
  Database,
  Monitor
} from 'lucide-react';
import { MarketDashboard } from './MarketDashboard';
import { MarketPOS } from './MarketPOS';
import { MarketScales } from './MarketScales';
import { MarketSectionView } from './MarketSectionView';
import { InventoryManagementView } from '../../../core/views/InventoryManagementView';
import { StaffScheduleView } from '../../../core/views/StaffScheduleView';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { SupplierManagementView } from '../../../core/views/SupplierManagementView';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { BaseModuleLayout } from '../../../core/components/BaseModuleLayout';
import { accountService } from '../../../core/services/accountService';

export const MarketLayout: React.FC = () => {
  const selectedShopId = accountService.getSelectedShopId();

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard />, label: 'Dashboard', roles: ['owner', 'manager', 'dev'] },
    { id: 'pos', icon: <ShoppingCart />, label: 'Frente de Caixa', roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
    { id: 'inventory', icon: <Package />, label: 'Gôndola & Estoque', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'scales', icon: <Scale />, label: 'Balanças & PLU', roles: ['owner', 'manager', 'dev'] },
    { id: 'sections', icon: <Store />, label: 'Setores / Ilhas', roles: ['owner', 'manager', 'dev'] },
    { id: 'staff', icon: <Users />, label: 'RH Central', roles: ['owner', 'manager', 'dev'] },
    { id: 'schedule', icon: <CalendarIcon />, label: 'Escala Staff', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'finance', icon: <DollarSign />, label: 'Fluxo de Caixa', roles: ['owner', 'manager', 'dev'] },
    { id: 'suppliers', icon: <Truck />, label: 'Fornecedores', roles: ['owner', 'manager', 'dev'] },
    { id: 'reports', icon: <FileText />, label: 'Relatórios', roles: ['owner', 'manager', 'dev'] },
    { id: 'settings', icon: <Settings />, label: 'Configuração', roles: ['owner', 'dev'] },
    { id: 'management', icon: <Database />, label: 'Gestão da Unidade', roles: ['owner', 'dev'] },
  ];

  const setupOptions = [
    { id: 'market_cashier', label: 'Modo Caixa', desc: 'Interface de frente de caixa com balança.', icon: <ShoppingCart />, color: 'bg-emerald-500' },
    { id: 'market_inventory', label: 'Repositor', desc: 'Conferência de validade e estoque.', icon: <Package />, color: 'bg-indigo-500' },
    { id: 'admin', label: 'Gestão / Backoffice', desc: 'Visão total da operação.', icon: <LayoutDashboard />, color: 'bg-blue-500' },
  ];

  const renderContent = (currentView: string) => {
    switch (currentView) {
      case 'dashboard': return <MarketDashboard />;
      case 'inventory': return <InventoryManagementView module="market" />;
      case 'pos': return <MarketPOS />;
      case 'scales': return <MarketScales />;
      case 'sections': return <MarketSectionView />;
      case 'staff': return <GeneralStaffView module="market" />;
      case 'schedule': return <StaffScheduleView module="market" />;
      case 'finance': return <FinanceManagementView module="market" shopId={selectedShopId} />;
      case 'suppliers': return <SupplierManagementView module="market" />;
      case 'management': return <CompanyManagement />;
      default: return <MarketDashboard />;
    }
  };

  return (
    <BaseModuleLayout 
      moduleName="MarketPOS"
      moduleIcon={<Store />}
      navItems={navItems as any}
      renderContent={renderContent}
      accentColor="blue"
      setupOptions={setupOptions}
    />
  );
};
