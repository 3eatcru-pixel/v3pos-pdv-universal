import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';

export interface PhysicalResource {
  id: string;
  enterpriseId: string;
  shopId: string;
  name: string;
  type: 'chair' | 'room' | 'booth' | 'equipment';
  status: 'active' | 'maintenance' | 'inactive';
  capacity: number; // Geralmente 1 para cadeiras/salas
}

export interface ResourceBooking {
  id: string;
  enterpriseId: string;
  shopId: string;
  resourceId: string;
  staffId: string;
  customerId?: string;
  startTime: number;
  endTime: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  updatedAt?: number;
}

/**
 * ResourceSchedulerEngine - Motor de Gestão de Ativos Físicos
 * Centraliza a inteligência de ocupação de cadeiras (tattoo/hair) e salas, 
 * garantindo que dois profissionais não tentem usar o mesmo espaço simultaneamente.
 */
export class ResourceSchedulerEngine {
  /**
   * Valida se um recurso físico está livre para um determinado intervalo de tempo.
   * Utiliza a lógica de colisão de intervalos para detecção de conflitos.
   */
  static async isResourceAvailable(
    enterpriseId: string,
    shopId: string,
    resourceId: string,
    start: number,
    end: number,
    excludeBookingId?: string
  ): Promise<boolean> {
    try {
      // Busca reservas confirmadas para o ativo no período
      const bookings = await firebaseService.getDocsByQuery('resource_bookings', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'shopId', op: '==', value: shopId },
        { field: 'resourceId', op: '==', value: resourceId },
        { field: 'status', op: '==', value: 'confirmed' }
      ]) as ResourceBooking[];

      // Detecção de colisão: (StartA < EndB) && (EndA > StartB)
      const hasConflict = bookings.some(b => 
        b.id !== excludeBookingId &&
        (start < b.endTime && end > b.startTime)
      );

      if (hasConflict) {
        logger.warn('service', 'Conflito de ocupação detectado', { resourceId, interval: [start, end] });
      }

      return !hasConflict;
    } catch (error) {
      logger.error('service', 'Erro ao validar disponibilidade de recurso', { error });
      return false;
    }
  }

  /**
   * Realiza a reserva de um ativo para um atendimento.
   */
  static async bookResource(params: Omit<ResourceBooking, 'id' | 'status'>): Promise<string> {
    const available = await this.isResourceAvailable(
      params.enterpriseId,
      params.shopId,
      params.resourceId,
      params.startTime,
      params.endTime
    );

    if (!available) {
      throw new Error('recurso_atualmente_ocupado');
    }

    const bookingId = generateSafeId('book');
    const booking: ResourceBooking = {
      ...params,
      id: bookingId,
      status: 'confirmed',
      updatedAt: Date.now()
    };

    await firebaseService.saveItem('resource_bookings', bookingId, booking);
    
    await firebaseService.addAuditLog({
      enterpriseId: params.enterpriseId,
      shopId: params.shopId,
      staffId: params.staffId,
      staffName: 'System',
      action: 'RESOURCE_BOOKED',
      details: `Recurso ${params.resourceId} reservado para o período ${new Date(params.startTime).toLocaleTimeString()}`
    });

    logger.info('service', 'Ocupação de recurso agendada', { bookingId, resourceId: params.resourceId });
    return bookingId;
  }

  /**
   * Libera um recurso físico após a conclusão do serviço.
   */
  static async releaseResource(bookingId: string) {
    await firebaseService.updateItem('resource_bookings', bookingId, { 
      status: 'completed',
      updatedAt: Date.now() 
    });
    logger.info('service', 'Recurso liberado com sucesso', { bookingId });
  }
}