import React from 'react';
import { 
  ShoppingBag, 
  LayoutDashboard, 
  CreditCard, 
  Box, 
  Target, 
  Users, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Truck, 
  Gift, 
  FileText, 
  Settings, 
  Database,
  ShoppingCart,
  Package
} from 'lucide-react';
import { RetailDashboard } from './RetailDashboard';
import { RetailPOS } from './RetailPOS';
import { RetailCRM } from './RetailCRM';
import { InventoryManagementView } from '../../../core/views/InventoryManagementView';
import { StaffScheduleView } from '../../../core/views/StaffScheduleView';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { SupplierManagementView } from '../../../core/views/SupplierManagementView';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { BaseModuleLayout } from '../../../core/components/BaseModuleLayout';

export const RetailLayout: React.FC = () => {
  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard />, label: 'Dashboard', roles: ['owner', 'manager', 'dev'] },
    { id: 'pos', icon: <CreditCard />, label: 'Vendas / PDV', roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
    { id: 'inventory', icon: <Box />, label: 'Produtos & Estoque', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'crm', icon: <Target />, label: 'Clientes & CRM', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'staff', icon: <Users />, label: 'RH Central', roles: ['owner', 'manager', 'dev'] },
    { id: 'schedule', icon: <CalendarIcon />, label: 'Escala Staff', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'finance', icon: <DollarSign />, label: 'Fluxo de Caixa', roles: ['owner', 'manager', 'dev'] },
    { id: 'suppliers', icon: <Truck />, label: 'Fornecedores', roles: ['owner', 'manager', 'dev'] },
    { id: 'promotions', icon: <Gift />, label: 'Promoções', roles: ['owner', 'manager', 'dev'] },
    { id: 'reports', icon: <FileText />, label: 'Relatórios', roles: ['owner', 'manager', 'dev'] },
    { id: 'settings', icon: <Settings />, label: 'Configuração', roles: ['owner', 'dev'] },
    { id: 'management', icon: <Database />, label: 'Gestão da Unidade', roles: ['owner', 'dev'] },
  ];

  const setupOptions = [
    { id: 'retail_cashier', label: 'Modo PDV', desc: 'Interface de caixa rápida e intuitiva.', icon: <ShoppingCart />, color: 'bg-emerald-500' },
    { id: 'retail_sales', label: 'Atendimento', desc: 'Consulta de estoque e CRM.', icon: <Users />, color: 'bg-indigo-500' },
    { id: 'admin', label: 'Gestão/Dashboard', desc: 'Visão 360 do negócio.', icon: <Package />, color: 'bg-blue-500' },
  ];

  const renderContent = (currentView: string) => {
    switch (currentView) {
      case 'dashboard': return <RetailDashboard />;
      case 'inventory': return <InventoryManagementView module="retail" />;
      case 'pos': return <RetailPOS />;
      case 'crm': return <RetailCRM />;
      case 'staff': return <GeneralStaffView module="retail" />;
      case 'schedule': return <StaffScheduleView module="retail" />;
      case 'finance': return <FinanceManagementView module="retail" />;
      case 'suppliers': return <SupplierManagementView module="retail" />;
      case 'management': return <CompanyManagement />;
      default: return <RetailDashboard />;
    }
  };

  return (
    <BaseModuleLayout 
      moduleName="RetailGrid"
      moduleIcon={<ShoppingBag />}
      navItems={navItems as any}
      renderContent={renderContent}
      accentColor="indigo"
      setupOptions={setupOptions}
    />
  );
};
