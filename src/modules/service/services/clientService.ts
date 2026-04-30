import { ServiceClient } from '../types';
import { firebaseService } from '../../../services/firebaseService';
import { logger } from '../../../core/services/logger';
import { idGenerator } from '../../../core/utils/idGenerator';

class ClientService {
  private clients: ServiceClient[] = [];
  private unsubscribe: (() => void) | null = null;
  private readonly COLLECTION = 'clients';

  public async initialize(enterpriseId: string, shopId: string | null = null) {
    try {
      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = firebaseService.subscribeCollection<ServiceClient>(
        this.COLLECTION,
        enterpriseId,
        shopId,
        (data) => {
          this.clients = data;
        }
      );
    } catch (error) {
      logger.error('service', 'Erro ao subscrever clientes', { error });
    }
  }

  public getClients(enterpriseId: string, shopId?: string): ServiceClient[] {
    return this.clients.filter(c => c.enterpriseId === enterpriseId && (!shopId || !c.shopId || c.shopId === shopId));
  }

  public getClientById(id: string): ServiceClient | null {
     return this.clients.find(c => c.id === id) || null;
  }

  public async addClient(data: Omit<ServiceClient, 'id' | 'createdAt' | 'history'>) {
    const timestamp = Date.now(); // Mantém timestamp para createdAt
    const clientId = idGenerator.generate('cli');
    
    const c: ServiceClient = { 
       ...data, 
       id: clientId,
       history: [],
       createdAt: timestamp
    };
    
    await firebaseService.saveItem(this.COLLECTION, clientId, c);
    return c;
  }

  public async addAppointmentToHistory(clientId: string, appointmentId: string) {
     const client = this.clients.find(c => c.id === clientId);
     if (client && !client.history.includes(appointmentId)) {
        const newHistory = [...client.history, appointmentId];
        await firebaseService.updateItem(this.COLLECTION, clientId, { history: newHistory });
     }
  }
}

export const clientService = new ClientService();
