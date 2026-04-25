import { firebaseService } from '../../services/firebaseService';
import { Order, Staff } from '../../types';
import { logger } from './logger';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface CommissionReport {
  staffId: string;
  staffName: string;
  period: string;
  totalSalesVolume: number;
  commissionEarned: number;
  materialCostTotal: number; // Total descontado em insumos
  rentalDeduction: number; // Aluguel de cadeira/espaço
  netPayout: number; // Valor líquido a receber
  eligibleOrdersCount: number;
  averageCommissionPerOrder: number;
  details: {
    orderId: string;
    orderDate: number;
    eligibleAmount: number;
    commissionAmount: number;
  }[];
}

/**
 * CommissionEngine - Motor de Cálculo de Comissões e Bônus
 * Baseia-se exclusivamente em pedidos entregues e itens não estornados.
 */
export class CommissionEngine {
  /**
   * Calcula a comissão detalhada de um colaborador para um período específico.
   */
  static async calculateStaffCommission(
    enterpriseId: string,
    staffId: string,
    month: number,
    year: number
  ): Promise<CommissionReport> {
    const date = new Date(year, month);
    const startDate = startOfMonth(date).getTime();
    const endDate = endOfMonth(date).getTime();

    try {
      logger.info('hr', 'Iniciando cálculo de comissão auditada', { staffId, month, year });

      // 1. Busca os dados do colaborador para obter a taxa de comissão
      const staff = await firebaseService.getDoc('staff', staffId) as Staff;
      
      // Configuração específica para serviços (Beleza/Tattoo)
      const config = (staff as any)?.serviceConfig || {
        serviceRate: (staff as any)?.commissionRate || 50, // Padrão 50% para serviço
        productRate: 10, // Padrão 10% para venda de produtos
        rentalFee: 0 // Valor fixo de aluguel
      };

      // 2. Busca pedidos entregues pelo staff no período
      const orders = await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'staffId', op: '==', value: staffId },
        { field: 'status', op: '==', value: 'delivered' },
        { field: 'closedAt', op: '>=', value: startDate },
        { field: 'closedAt', op: '<=', value: endDate }
      ]) as Order[];

      let totalSalesVolume = 0;
      let totalCommission = 0;
      let materialCostTotal = 0;
      const details: CommissionReport['details'] = [];

      // 3. Processamento de itens (Audit-Safe: Ignora itens estornados)
      orders.forEach(order => {
        let orderEligibleAmount = 0;
        let orderCommission = 0;

        order.items.forEach(item => {
          if (item.status === 'voided') return;

          const isService = (item as any).type === 'service';
          const rate = isService ? config.serviceRate : config.productRate;
          const materialCost = Number((item as any).unitCost || 0) * item.quantity;
          
          materialCostTotal += materialCost;
          orderEligibleAmount += (item.price * item.quantity);
          orderCommission += Math.max(0, ((item.price * item.quantity) - materialCost) * (rate / 100));
        });

        totalSalesVolume += orderEligibleAmount;
        totalCommission += orderCommission;

        details.push({
          orderId: order.id,
          orderDate: order.closedAt || 0,
          eligibleAmount: orderEligibleAmount,
          commissionAmount: orderCommission // CORREÇÃO: Valor individual do pedido
        });
      });

      const rentalDeduction = config.rentalFee || 0;
      const netPayout = Math.max(0, totalCommission - rentalDeduction);

      return {
        staffId,
        staffName: staff?.name || 'N/A',
        period: `${month + 1}/${year}`,
        totalSalesVolume,
        commissionEarned: totalCommission,
        materialCostTotal,
        rentalDeduction,
        netPayout,
        eligibleOrdersCount: orders.length,
        averageCommissionPerOrder: orders.length > 0 ? totalCommission / orders.length : 0,
        details
      };
    } catch (error) {
      logger.error('hr', 'Falha no motor de comissões', { staffId, error });
      throw error;
    }
  }
}