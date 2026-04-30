import { ServiceClient } from '../types';

class ClientService {
  private clients: ServiceClient[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
       this.clients = JSON.parse(localStorage.getItem('pos_service_clients') || '[]');
       if (this.clients.length === 0) {
         this.seedDemoData();
       }
    } catch {
       this.clients = [];
       this.seedDemoData();
    }
  }

  private seedDemoData() {
    const companyStr = localStorage.getItem('pos_companies');
    let entId = 'demo-enterprise';
    if (companyStr) {
      const companies = JSON.parse(companyStr);
      if (companies.length > 0) entId = companies[0].id;
    }

    this.clients = [
      { id: 'cli-1', enterpriseId: entId, name: 'Lucas VIP', phone: '11999999999', email: 'lucas@vip.com', history: ['app-1'], createdAt: Date.now() - 5000000 },
      { id: 'cli-2', enterpriseId: entId, name: 'Maria Silva', phone: '11888888888', history: ['app-2'], createdAt: Date.now() - 3000000 }
    ];

    this.saveData();
  }

  private saveData() {
    localStorage.setItem('pos_service_clients', JSON.stringify(this.clients));
  }

  public getClients(enterpriseId: string, shopId?: string): ServiceClient[] {
    return this.clients.filter(c => c.enterpriseId === enterpriseId && (!shopId || !c.shopId || c.shopId === shopId));
  }

  public getClientById(id: string): ServiceClient | null {
     return this.clients.find(c => c.id === id) || null;
  }

  public addClient(data: Omit<ServiceClient, 'id' | 'createdAt' | 'history'>) {
    const c: ServiceClient = { 
       ...data, 
       id: `cli-${Date.now()}`,
       history: [],
       createdAt: Date.now()
    };
    this.clients.push(c);
    this.saveData();
    return c;
  }

  public addAppointmentToHistory(clientId: string, appointmentId: string) {
     const client = this.clients.find(c => c.id === clientId);
     if (client) {
        if (!client.history.includes(appointmentId)) {
           client.history.push(appointmentId);
           this.saveData();
        }
     }
  }
}

export const clientService = new ClientService();
