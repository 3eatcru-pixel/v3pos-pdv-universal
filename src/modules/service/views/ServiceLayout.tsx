import React from 'react';
import { 
  Briefcase, 
  Calendar, 
  LayoutDashboard, 
  DollarSign, 
  Scissors, 
  Users, 
  UserCircle, 
  Database, 
  Building,
  Clock,
  UserPlus
} from 'lucide-react';
import { ServiceDashboard } from './ServiceDashboard';
import { ServiceCalendar } from './ServiceCalendar';
import { ServiceCatalogPage } from './ServiceCatalogPage';
import { ServiceClientsPage } from './ServiceClientsPage';
import { ServiceResourcesPage } from './ServiceResourcesPage';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { BaseModuleLayout } from '../../../core/components/BaseModuleLayout';
import { accountService } from '../../../core/services/accountService';

export const ServiceLayout: React.FC = () => {
  const selectedShopId = accountService.getSelectedShopId();

  const navItems = [
    { id: 'calendar', label: 'Agenda & Reservas', icon: <Calendar />, roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
    { id: 'dashboard', label: 'Performance', icon: <LayoutDashboard />, roles: ['owner', 'manager', 'dev'] },
    { id: 'finance', label: 'Financeiro & Caixa', icon: <DollarSign />, roles: ['owner', 'manager', 'dev'] },
    { id: 'services', label: 'Catálogo de Serviços', icon: <Scissors />, roles: ['owner', 'manager', 'dev'] },
    { id: 'employees', label: 'Profissionais', icon: <Users />, roles: ['owner', 'manager', 'dev'] },
    { id: 'clients', label: 'Clientes', icon: <UserCircle />, roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'resources', label: 'Recursos', icon: <Database />, roles: ['owner', 'manager', 'dev'] },
    { id: 'management', label: 'Gestão da Unidade', icon: <Building />, roles: ['owner', 'dev'] },
  ];

  const setupOptions = [
    { id: 'service_provider', label: 'Prestador', desc: 'Interface de agenda e execução.', icon: <Scissors />, color: 'bg-emerald-500' },
    { id: 'reception', label: 'Recepção', desc: 'Check-in e novos agendamentos.', icon: <UserPlus />, color: 'bg-indigo-500' },
    { id: 'admin', label: 'Gestão / Manager', desc: 'Controle de comissões e performance.', icon: <LayoutDashboard />, color: 'bg-blue-500' },
  ];

  const renderContent = (currentView: string) => {
    switch (currentView) {
      case 'dashboard': return <ServiceDashboard />;
      case 'calendar': return <ServiceCalendar />;
      case 'services': return <ServiceCatalogPage />;
      case 'employees': return <GeneralStaffView module="service" />;
      case 'clients': return <ServiceClientsPage />;
      case 'resources': return <ServiceResourcesPage />;
      case 'finance': return <FinanceManagementView module="service" shopId={selectedShopId} />;
      case 'management': return <CompanyManagement />;
      default: return <ServiceCalendar />;
    }
  };

  return (
    <BaseModuleLayout 
      moduleName="ServiceGrid"
      moduleIcon={<Briefcase />}
      navItems={navItems as any}
      renderContent={renderContent}
      accentColor="emerald"
      setupOptions={setupOptions}
      defaultView="calendar"
    />
  );
};
