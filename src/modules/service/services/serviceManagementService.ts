import { ServiceDefinition, ServiceProvider, ServiceResource, Staff } from '../types'; // Adicionado Staff para tipagem correta
import { firebaseService } from '../../../services/firebaseService';
import { logger } from '../../../core/services/logger';
import { idGenerator } from '../../../core/utils/idGenerator';

class ServiceManagementService {
  private services: ServiceDefinition[] = [];
  private providers: ServiceProvider[] = [];
  private resources: ServiceResource[] = [];
  private unsubscribes: (() => void)[] = [];

  public async initialize(enterpriseId: string, shopId: string | null = null) {
    try {
      this.unsubscribes.forEach(unsub => unsub());
      this.unsubscribes = [];

      const u1 = firebaseService.subscribeCollection<ServiceDefinition>('services', enterpriseId, shopId, (data) => {
        this.services = data;
      });
      const u2 = firebaseService.subscribeCollection<ServiceProvider>('staff', enterpriseId, shopId, (data) => {
        this.providers = data;
      });
      const u3 = firebaseService.subscribeCollection<ServiceResource>('resources', enterpriseId, shopId, (data) => {
        this.resources = data;
      });

      this.unsubscribes = [u1, u2, u3];
      logger.info('service', 'Gerenciamento de serviços sincronizado via Firestore');
    } catch (err) {
      logger.error('service', 'Falha ao inicializar ServiceManagementService', { error: err });
    }
  }

  // --- Services ---
  public getServices(enterpriseId: string, shopId?: string): ServiceDefinition[] {
    return this.services.filter(s => s.enterpriseId === enterpriseId && (!shopId || !s.shopId || s.shopId === shopId));
  }

  public async addService(data: Omit<ServiceDefinition, 'id'>) {
    const id = idGenerator.generate('srv');
    const s: ServiceDefinition = { ...data, id };
    await firebaseService.saveItem('services', id, s);
    return s;
  }

  // --- Providers ---
  public getProviders(enterpriseId: string, shopId?: string): ServiceProvider[] {
    return this.providers.filter(p => p.enterpriseId === enterpriseId && (!shopId || !p.shopId || p.shopId === shopId));
  }

  public async addProvider(data: Omit<ServiceProvider, 'id'>) {
    const id = idGenerator.generate('prov'); // Auditoria: idGenerator já é usado
    const p: ServiceProvider = { ...data, id };
    await firebaseService.saveItem('staff', id, p);
    return p;
  }

  // --- Resources ---
  public getResources(enterpriseId: string, shopId?: string): ServiceResource[] {
    return this.resources.filter(r => r.enterpriseId === enterpriseId && (!shopId || !r.shopId || r.shopId === shopId));
  }

  public async addResource(data: Omit<ServiceResource, 'id'>) {
    const id = idGenerator.generate('res');
    const r: ServiceResource = { ...data, id };
    await firebaseService.saveItem('resources', id, r);
    return r;
  }
}

export const serviceManagementService = new ServiceManagementService();
