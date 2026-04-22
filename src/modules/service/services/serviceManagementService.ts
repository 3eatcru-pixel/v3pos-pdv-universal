import { ServiceDefinition, ServiceProvider, ServiceResource } from '../types';

class ServiceManagementService {
  private services: ServiceDefinition[] = [];
  private providers: ServiceProvider[] = [];
  private resources: ServiceResource[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      this.services = JSON.parse(localStorage.getItem('pos_service_defs') || '[]');
      this.providers = JSON.parse(localStorage.getItem('pos_service_providers') || '[]');
      this.resources = JSON.parse(localStorage.getItem('pos_service_resources') || '[]');
      
      // Auto seed if empty
      if (this.services.length === 0 && this.providers.length === 0) {
        this.seedDemoData();
      }
    } catch {
      this.services = [];
      this.providers = [];
      this.resources = [];
      this.seedDemoData();
    }
  }

  private seedDemoData() {
    // We don't have a specific enterpriseId here, so we pick the first one from accountService
    // Since accountService might not be fully initialized or we depend on it, 
    // let's assign a generic demo company or fetch it.
    const companyStr = localStorage.getItem('pos_companies');
    let entId = 'demo-enterprise';
    if (companyStr) {
      const companies = JSON.parse(companyStr);
      if (companies.length > 0) entId = companies[0].id;
    }

    this.services = [
      { id: 'srv-1', enterpriseId: entId, name: 'Corte de Cabelo', durationMinutes: 45, price: 60, category: 'Cabelo', active: true, colorCode: '#3b82f6' },
      { id: 'srv-2', enterpriseId: entId, name: 'Barba Terapia', durationMinutes: 30, price: 40, category: 'Barba', active: true, colorCode: '#10b981' },
      { id: 'srv-3', enterpriseId: entId, name: 'Massagem Relaxante', durationMinutes: 60, price: 150, category: 'Spa', active: true, colorCode: '#8b5cf6' }
    ];

    this.providers = [
      { id: 'prov-1', enterpriseId: entId, name: 'Carlos Barbeiro', role: 'Barbeiro Sênior', skills: ['srv-1', 'srv-2'], active: true, commissionRate: 40, colorCode: '#3b82f6' },
      { id: 'prov-2', enterpriseId: entId, name: 'Ana Estética', role: 'Esteticista', skills: ['srv-3'], active: true, commissionRate: 50, colorCode: '#ec4899' }
    ];

    this.resources = [
      { id: 'res-1', enterpriseId: entId, name: 'Cadeira 1', type: 'Cadeira de Barbeiro', active: true },
      { id: 'res-2', enterpriseId: entId, name: 'Cadeira 2', type: 'Cadeira de Barbeiro', active: true },
      { id: 'res-3', enterpriseId: entId, name: 'Sala de Massagem', type: 'Sala', active: true }
    ];

    this.saveData();
  }

  private saveData() {
    localStorage.setItem('pos_service_defs', JSON.stringify(this.services));
    localStorage.setItem('pos_service_providers', JSON.stringify(this.providers));
    localStorage.setItem('pos_service_resources', JSON.stringify(this.resources));
  }

  // --- Services ---
  public getServices(enterpriseId: string): ServiceDefinition[] {
    return this.services.filter(s => s.enterpriseId === enterpriseId);
  }

  public addService(data: Omit<ServiceDefinition, 'id'>) {
    const s: ServiceDefinition = { ...data, id: `srv-${Date.now()}` };
    this.services.push(s);
    this.saveData();
    return s;
  }

  // --- Providers ---
  public getProviders(enterpriseId: string): ServiceProvider[] {
    return this.providers.filter(p => p.enterpriseId === enterpriseId);
  }

  public addProvider(data: Omit<ServiceProvider, 'id'>) {
    const p: ServiceProvider = { ...data, id: `prov-${Date.now()}` };
    this.providers.push(p);
    this.saveData();
    return p;
  }

  // --- Resources ---
  public getResources(enterpriseId: string): ServiceResource[] {
    return this.resources.filter(r => r.enterpriseId === enterpriseId);
  }

  public addResource(data: Omit<ServiceResource, 'id'>) {
    const r: ServiceResource = { ...data, id: `res-${Date.now()}` };
    this.resources.push(r);
    this.saveData();
    return r;
  }
}

export const serviceManagementService = new ServiceManagementService();
