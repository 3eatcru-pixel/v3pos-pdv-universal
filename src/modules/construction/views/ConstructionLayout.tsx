import React from 'react';
import { 
  Building2, 
  LayoutDashboard, 
  Boxes, 
  Users, 
  FileText, 
  HardHat, 
  Truck, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Printer, 
  Settings, 
  Database,
  ShoppingCart,
  Package
} from 'lucide-react';
import { ConstructionDashboard } from './ConstructionDashboard';
import { InventoryManagementView } from '../../../core/views/InventoryManagementView';
import { ConstructionProjects } from './ConstructionProjects';
import { ConstructionLogistics } from './ConstructionLogistics';
import { ConstructionQuotes } from './ConstructionQuotes';
import { ConstructionCustomers } from './ConstructionCustomers';
import { ConstructionEmployees } from './ConstructionEmployees';
import { ConstructionSettings } from './ConstructionSettings';
import { StaffScheduleView } from '../../../core/views/StaffScheduleView';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { SupplierManagementView } from '../../../core/views/SupplierManagementView';
import { PrinterManagement } from '../../../core/views/PrinterManagement';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { BaseModuleLayout } from '../../../core/components/BaseModuleLayout';
import { accountService } from '../../../core/services/accountService';

export const ConstructionLayout: React.FC = () => {
  const selectedShopId = accountService.getSelectedShopId();

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard />, label: 'Painel Geral', roles: ['owner', 'manager', 'dev'] },
    { id: 'inventory', icon: <Boxes />, label: 'Loja / Estoque', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'customers', icon: <Users />, label: 'Clientes / Notas', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'quotes', icon: <FileText />, label: 'Caixa / Orçamentos', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'projects', icon: <HardHat />, label: 'Acompanhamento', roles: ['owner', 'manager', 'dev'] },
    { id: 'logistics', icon: <Truck />, label: 'Logística / Despacho', roles: ['owner', 'manager', 'dev'] },
    { id: 'staff', icon: <Users />, label: 'RH & Documentos', roles: ['owner', 'manager', 'dev'] },
    { id: 'schedule', icon: <CalendarIcon />, label: 'Escala da Obra', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'finance', icon: <DollarSign />, label: 'Financeiro', roles: ['owner', 'manager', 'dev'] },
    { id: 'suppliers', icon: <Truck />, label: 'Fornecedores', roles: ['owner', 'manager', 'dev'] },
    { id: 'printers', icon: <Printer />, label: 'Impressoras', roles: ['owner', 'dev'] },
    { id: 'settings', icon: <Settings />, label: 'Campos Customizados', roles: ['owner', 'dev'] },
    { id: 'management', icon: <Database />, label: 'Gestão da Unidade', roles: ['owner', 'dev'] },
  ];

  const setupOptions = [
    { id: 'cashier', label: 'Modo PDV', desc: 'Vendas rápidas e faturamento.', icon: <ShoppingCart />, color: 'bg-emerald-500' },
    { id: 'salesperson', label: 'Vendedor', desc: 'Orçamentos e canteiro.', icon: <Users />, color: 'bg-blue-500' },
    { id: 'stock', label: 'Almoxarifado', desc: 'Estoque e conferência.', icon: <Package />, color: 'bg-amber-500' },
  ];

  const renderContent = (currentView: string) => {
    switch (currentView) {
      case 'dashboard': return <ConstructionDashboard />;
      case 'inventory': return <InventoryManagementView module="construction" />;
      case 'projects': return <ConstructionProjects />;
      case 'logistics': return <ConstructionLogistics />;
      case 'quotes': return <ConstructionQuotes />;
      case 'customers': return <ConstructionCustomers />;
      case 'staff': return <GeneralStaffView module="construction" />;
      case 'schedule': return <StaffScheduleView module="construction" />;
      case 'finance': return <FinanceManagementView module="construction" shopId={selectedShopId} />;
      case 'suppliers': return <SupplierManagementView module="construction" />;
      case 'printers': return <PrinterManagement />;
      case 'settings': return <ConstructionSettings />;
      case 'management': return <CompanyManagement />;
      default: return <ConstructionDashboard />;
    }
  };

  return (
    <BaseModuleLayout 
      moduleName="ConstruPOS"
      moduleIcon={<Building2 />}
      navItems={navItems as any}
      renderContent={renderContent}
      accentColor="blue"
      setupOptions={setupOptions}
    />
  );
};
