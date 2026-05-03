import { ServiceAppointment, AppointmentStatus } from '../types'; 
import { Order, OrderItem } from '../../../types';
import { integrationLayer } from '../../../integration/integrationLayer';
import { firebaseService } from '../../../services/firebaseService';
import { idGenerator } from '../../../core/utils/idGenerator';
import { logger } from '../../../core/services/logger';

interface AppointmentFilters {
  shopId?: string;
  startDate?: number;
  endDate?: number;
}

class SchedulingService {
  private appointments: ServiceAppointment[] = [];
  private unsubscribe: (() => void) | null = null;
  private listeners: Set<(data: ServiceAppointment[]) => void> = new Set();
  private readonly COLLECTION = 'appointments';

  public async initialize(enterpriseId: string, shopId: string | null = null) {
    try {
      if (this.unsubscribe) this.unsubscribe();

      this.unsubscribe = firebaseService.subscribeCollection<ServiceAppointment>(
        this.COLLECTION,
        enterpriseId,
        shopId,
        (data) => {
          this.appointments = data;
          this.notifyListeners();
          logger.debug('service', 'Agendamentos sincronizados via Firestore', { count: data.length });
        }
      );
    } catch (error) {
      logger.error('service', 'Falha ao inicializar sincronização de agendamentos', { error });
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.appointments]));
  }

  public subscribe(listener: (data: ServiceAppointment[]) => void) {
    this.listeners.add(listener);
    listener([...this.appointments]);
    return () => this.listeners.delete(listener);
  }

  public getAppointments(enterpriseId: string, filters: AppointmentFilters = {}): ServiceAppointment[] {
    const { shopId, startDate, endDate } = filters;
    
    let filtered = this.appointments.filter(a => a.enterpriseId === enterpriseId && (!shopId || !a.shopId || a.shopId === shopId));
    
    if (startDate && endDate) {
      filtered = filtered.filter(a => a.startTime >= startDate && a.startTime < endDate);
    }
    
    return filtered;
  }

  public checkConflicts(enterpriseId: string, providerId: string, resourceIds: string[], startTime: number, endTime: number, excludeId?: string, shopId?: string): boolean {
    const existing = this.getAppointments(enterpriseId, { shopId });
    
    return existing.some(app => {
      if (excludeId && app.id === excludeId) return false;
      if (app.status === 'cancelled' || app.status === 'no_show') return false;
      
      // Check time overlap
      const overlaps = (startTime < app.endTime && endTime > app.startTime);
      if (!overlaps) return false;

      // Check provider conflict
      if (app.providerId === providerId) return true;

      // Check resource conflict
      const resourceConflict = resourceIds.some(rId => app.resourceIds.includes(rId));
      if (resourceConflict) return true;

      return false;
    });
  }

  public async createAppointment(data: Omit<ServiceAppointment, 'id' | 'createdAt'>): Promise<ServiceAppointment> {
    const { enterpriseId, providerId, resourceIds, startTime, endTime, shopId } = data;

    if (this.checkConflicts(enterpriseId, providerId, resourceIds, startTime, endTime, undefined, shopId)) {
      logger.warn('service', 'Tentativa de agendamento com conflito', { providerId: data.providerId });
      throw new Error('Conflito de horário detectado. Profissional ou recurso já está em uso.');
    }

    const appointmentId = idGenerator.generate('app');
    const newAppointment: ServiceAppointment = {
      ...data,
      id: appointmentId,
      createdAt: Date.now()
    };

    await firebaseService.saveItem(this.COLLECTION, appointmentId, newAppointment);
    
    logger.info('service', 'Novo agendamento persistido no Firestore', { appointmentId: newAppointment.id });

    integrationLayer.publishSyncEvent('service:appointment_updated', newAppointment);

    return newAppointment;
  }

  public async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    const app = this.appointments.find(a => a.id === id);
    if (!app) {
      logger.error('service', 'Falha ao atualizar status: agendamento não encontrado', { appointmentId: id });
      throw new Error('Agendamento não encontrado');
    }

    await firebaseService.updateItem(this.COLLECTION, id, { 
      status,
      completedAt: status === 'completed' ? Date.now() : undefined
    });

    // Se o status for concluído, gerar um pedido (Order) automaticamente para o financeiro
    if (status === 'completed') {
      try {
        const orderId = idGenerator.generate('ord-srv');
        await firebaseService.saveItem('orders', orderId, {
          enterpriseId: app.enterpriseId,
          shopId: app.shopId,
          customerId: app.clientId,
          staffId: app.providerId,
          items: [{ 
            id: idGenerator.generate('item'),
            productId: app.serviceId,
            quantity: 1,
            price: app.totalPrice, 
            unitPrice: app.totalPrice, // Nexus standard field
            totalPrice: app.totalPrice,
            name: 'Serviço Executado',
            category: 'Serviços',
            cost: 0,
            status: 'delivered'
          } as OrderItem],
          subtotal: app.totalPrice,
          discount: 0,
          total: app.totalPrice,
          totalCost: 0,
          status: 'delivered', 
          createdAt: Date.now(),
          source: 'service_appointment',
          orderType: 'takeaway',
          referenceId: app.id
        } as Order);
        logger.info('service', 'Pedido de venda gerado a partir de agendamento concluído', { orderId });
      } catch (err) {
        logger.error('service', 'Erro ao gerar pedido financeiro para agendamento', { error: err });
      }
    }
    
    logger.info('service', `Status do agendamento atualizado para ${status}`, { appointmentId: id });
    integrationLayer.publishSyncEvent('service:appointment_updated', { ...app, status });
  }
}

export const schedulingService = new SchedulingService();
