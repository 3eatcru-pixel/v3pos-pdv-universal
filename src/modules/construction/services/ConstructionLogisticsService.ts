import { logger } from '../../../core/services/logger';
import { firebaseService } from '../../../services/firebaseService';

export interface LogisticsData {
  type: 'scheduled_delivery' | 'immediate_pickup';
  status: 'pending_logistics' | 'loading' | 'in_transit' | 'delivered' | 'cancelled';
  scheduledFor?: string;
  address?: string;
}

class ConstructionLogisticsService {
  /**
   * Valida se os dados de logística estão corretos para o modo selecionado
   */
  public validateLogistics(isDeliveryMode: boolean, deliveryDate: string, address: string): { isValid: boolean; error?: string } {
    if (isDeliveryMode) {
      if (!deliveryDate || !address) {
        return { isValid: false, error: 'Preencha a data e endereço de entrega.' };
      }
      
      const selectedDate = new Date(deliveryDate).getTime();
      const today = new Date().setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        return { isValid: false, error: 'A data de entrega não pode ser anterior a hoje.' };
      }
    }
    return { isValid: true };
  }

  /**
   * Constrói o objeto de logística baseado no modo de entrega
   */
  public prepareLogistics(isDeliveryMode: boolean, deliveryDate: string, address: string): LogisticsData {
    if (isDeliveryMode) {
      return {
        type: 'scheduled_delivery',
        status: 'pending_logistics',
        scheduledFor: deliveryDate,
        address: address
      };
    }
    
    return { 
      type: 'immediate_pickup', 
      status: 'delivered' 
    };
  }

  /**
   * Notifica a expedição sobre um novo agendamento (Simulação de integração)
   */
  public async notifyExpedition(saleId: string, logistics: LogisticsData) {
    if (logistics.type === 'scheduled_delivery') {
      logger.info('construction', 'Romaneio de carga enviado para expedição', { 
        saleId, 
        scheduledFor: logistics.scheduledFor 
      });
      // Lógica futura: disparar evento via coreEventBus ou salvar em fila de expedição
    }
  }

  /**
   * Atualiza o status de uma entrega com log de auditoria
   */
  public async updateDeliveryStatus(saleId: string, newStatus: LogisticsData['status'], items?: any[]) {
    try {
      await firebaseService.updateItem('sales', saleId, { 'logistics.status': newStatus });
      
      // Se a entrega foi concluída, realizar a baixa definitiva da reserva
      if (newStatus === 'delivered' && items) {
        await firebaseService.finalizeDeliveryStockAtomic(saleId, items);
        logger.info('construction', 'Baixa de estoque confirmada após entrega', { saleId });
      }

      const statusLabels: Record<string, string> = {
        loading: 'Carga Iniciada',
        in_transit: 'Saiu para Entrega',
        delivered: 'Confirmado no Lote',
        cancelled: 'Entrega Abortada'
      };

      logger.info('construction', `Logística: ${statusLabels[newStatus] || newStatus}`, { saleId });
    } catch (error) {
      logger.error('construction', 'Erro ao atualizar status de logística', { saleId, error });
    }
  }

  /**
   * Calcula se há entregas atrasadas para o dashboard
   */
  public getLogisticsHealth(deliveries: any[]) {
    const now = Date.now();
    const delayed = deliveries.filter(d => 
      d.logistics?.status === 'pending_logistics' && 
      new Date(d.logistics.scheduledFor).getTime() < now
    );
    return { delayedCount: delayed.length, totalPending: deliveries.length };
  }
}

export const constructionLogisticsService = new ConstructionLogisticsService();