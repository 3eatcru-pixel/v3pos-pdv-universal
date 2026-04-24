import { ServiceAppointment, AppointmentStatus } from '../types';
import { meshNetwork } from '../../../services/p2pSync';
import { logger } from '../../../core/services/logger';

class SchedulingService {
  private appointments: ServiceAppointment[] = [];

  constructor() {
    this.loadAppointments();
  }

  private loadAppointments() {
    try {
      this.appointments = JSON.parse(localStorage.getItem('pos_service_appointments') || '[]');
      if (this.appointments.length === 0) {
        this.seedDemoData();
      }
    } catch {
      this.appointments = [];
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

    const today = new Date();
    today.setHours(9, 0, 0, 0); // start at 9:00 AM

    const t1 = today.getTime();
    const t2 = today.getTime() + (45 * 60000); // 9:45 AM
    const t3 = today.getTime() + (60 * 60000); // 10:00 AM
    const t4 = today.getTime() + (120 * 60000); // 11:00 AM

    this.appointments = [
      {
        id: 'app-1',
        enterpriseId: entId,
        clientId: 'cli-1',
        providerId: 'prov-1',
        serviceId: 'srv-1',
        resourceIds: ['res-1'],
        startTime: t1,
        endTime: t2,
        status: 'completed',
        totalPrice: 60,
        createdAt: Date.now() - 86400000
      },
      {
        id: 'app-2',
        enterpriseId: entId,
        clientId: 'cli-2',
        providerId: 'prov-2',
        serviceId: 'srv-3',
        resourceIds: ['res-3'],
        startTime: t3,
        endTime: t4,
        status: 'scheduled',
        totalPrice: 150,
        createdAt: Date.now() - 3600000
      }
    ];

    this.saveAppointments();
  }

  private saveAppointments() {
    localStorage.setItem('pos_service_appointments', JSON.stringify(this.appointments));
  }

  public getAppointments(enterpriseId: string, startDate?: number, endDate?: number): ServiceAppointment[] {
    let filtered = this.appointments.filter(a => a.enterpriseId === enterpriseId);
    
    if (startDate && endDate) {
      filtered = filtered.filter(a => a.startTime >= startDate && a.startTime < endDate);
    }
    
    return filtered;
  }

  public checkConflicts(enterpriseId: string, providerId: string, resourceIds: string[], startTime: number, endTime: number, excludeId?: string): boolean {
    const existing = this.getAppointments(enterpriseId);
    
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

  public createAppointment(data: Omit<ServiceAppointment, 'id' | 'createdAt'>): ServiceAppointment {
    if (this.checkConflicts(data.enterpriseId, data.providerId, data.resourceIds, data.startTime, data.endTime)) {
      logger.warn('service', 'Tentativa de agendamento com conflito', { providerId: data.providerId });
      throw new Error('Conflito de horário detectado. Profissional ou recurso já está em uso.');
    }

    const newAppointment: ServiceAppointment = {
      ...data,
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    this.appointments.push(newAppointment);
    this.saveAppointments();
    logger.info('service', 'Novo agendamento criado', { appointmentId: newAppointment.id });

    meshNetwork.broadcast('service:appointment_updated', newAppointment);

    return newAppointment;
  }

  public updateAppointmentStatus(id: string, status: AppointmentStatus) {
    const app = this.appointments.find(a => a.id === id);
    if (!app) {
      logger.error('service', 'Falha ao atualizar status: agendamento não encontrado', { appointmentId: id });
      throw new Error('Agendamento não encontrado');
    }

    app.status = status;
    this.saveAppointments();
    logger.info('service', `Status do agendamento atualizado para ${status}`, { appointmentId: id });
    
    meshNetwork.broadcast('service:appointment_updated', app);
  }

  private handleAppointmentUpdate(app: ServiceAppointment) {
    const index = this.appointments.findIndex(a => a.id === app.id);
    if (index >= 0) {
      this.appointments[index] = app;
    } else {
      this.appointments.push(app);
    }
    this.saveAppointments();
  }
}

export const schedulingService = new SchedulingService();
