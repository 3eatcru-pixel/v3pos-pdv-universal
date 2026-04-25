import { firebaseService } from '../../services/firebaseService';
import { CoreSale } from '../types';
import { Order } from '../../types';
import { format } from 'date-fns';
import { logger } from './logger';
import { accountService } from './accountService';
import { CommunicationEngine } from './CommunicationEngine';

/**
 * Motor de Agregação Diária (BFF Pattern)
 * Consolida dados de vendas em documentos de resumo para otimizar a leitura do Dashboard.
 */
export class DailyAggregatorEngine {
  /**
   * Atualiza o resumo diário da unidade de forma atômica após uma venda.
   */
  static async updateSummary(sale: CoreSale, items: any[]) {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const docId = `summary_${sale.shopId}_${today}`;
      const hour = new Date().getHours();
      
      // Cálculo de custo total da venda para margem
      const saleCost = items.reduce((acc, item) => {
        const cost = Number(item.unitCost || item.cost || 0);
        return acc + (isNaN(cost) ? 0 : cost * (item.quantity || 1));
      }, 0);

      await firebaseService.updateDailySummaryAtomic(docId, {
        enterpriseId: sale.enterpriseId || (sale as any).companyId,
        shopId: sale.shopId,
        date: today,
        amount: sale.total,
        cost: saleCost,
        hour: hour
      });

      logger.debug('core', 'Resumo diário atualizado', { shopId: sale.shopId, total: sale.total });
    } catch (error: any) {
      logger.error('core', 'Falha ao atualizar agregador diário', { error });
      
      // Alerta o suporte sobre a falha crítica no agregador de dados (BFF)
      logger.error('core', `SYSTEM_FAULT no agregador: ${error?.message}`, { shopId: sale.shopId });
    }
  }

  /**
   * Valida se o resumo diário reflete fielmente a soma dos pedidos individuais.
   * Dispara um alerta se houver divergência entre o documento de resumo e os pedidos reais.
   */
  static async validateDailyIntegrity(enterpriseId: string, shopId: string, dateStr: string): Promise<boolean> {
    try {
      const docId = `summary_${shopId}_${dateStr}`;
      
      // Otimização: Busca direta pelo documento de resumo via query ou getDoc
      const summary = await firebaseService.getDoc('dailySummaries', docId) as any;

      if (!summary) {
        logger.warn('core', 'Validação de integridade abortada: Resumo não encontrado', { docId });
        return false;
      }

      // AUDITORIA: getAllDocs deve ser substituído por query com filtro de data (closedAt >= startDate)
      // conforme o sistema cresce para evitar download desnecessário de gigabytes de dados.
      // Otimização de Auditoria: Busca apenas pedidos do dia específico via query indexada (closedAt)
      const dailyOrders = (await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'shopId', op: '==', value: shopId },
        { field: 'status', op: '==', value: 'delivered' },
        { field: 'closedAt', op: '>=', value: new Date(dateStr).getTime() },
        { field: 'closedAt', op: '<', value: new Date(dateStr).getTime() + (24 * 60 * 60 * 1000) }
      ])) as Order[];

      const actualTotal = dailyOrders.reduce((acc, o) => acc + o.total, 0);
      const actualCount = dailyOrders.length;
      const actualCost = dailyOrders.reduce((acc, o) => {
        return acc + (o.items || []).reduce((itemAcc, item) => {
          const cost = Number((item as any).unitCost || (item as any).cost || 0);
          return itemAcc + (isNaN(cost) ? 0 : cost * (item.quantity || 1));
        }, 0);
      }, 0);

      const isDivergent = 
        Math.abs(actualTotal - (summary.totalSales || 0)) > 0.01 || 
        actualCount !== (summary.orderCount || 0) ||
        Math.abs(actualCost - (summary.totalCost || 0)) > 0.01;

      if (isDivergent) {
        const msg = `DIVERGÊNCIA BFF (${dateStr}): Vendas Real: R$ ${actualTotal.toFixed(2)} vs BFF: R$ ${summary.totalSales?.toFixed(2)}. Qtd: ${actualCount} vs ${summary.orderCount}.`;
        
        await CommunicationEngine.sendMessage({
          enterpriseId,
          userId: (await accountService.getCompanyById(enterpriseId))?.ownerId || '',
          title: '🚨 DIVERGÊNCIA FINANCEIRA (BFF)',
          content: msg,
          type: 'critical'
        });

        return false;
      } else {
        logger.info('core', 'Integridade do resumo diário validada com sucesso', { shopId, dateStr });
        return true;
      }

    } catch (error) {
      logger.error('core', 'Erro crítico ao validar integridade do agregador', { error });
      return false;
    }
  }

  /**
   * Sobrescreve o documento de resumo com valores recalculados a partir dos pedidos reais.
   * Usado para corrigir divergências detectadas na auditoria.
   */
  static async repairDailySummary(enterpriseId: string, shopId: string, dateStr: string) {
    const user = accountService.getCurrentUser();
    if (user?.role !== 'dev' && user?.role !== 'owner') {
      logger.error('security', 'Tentativa não autorizada de reparo financeiro', { user: user?.name });
      throw new Error('Acesso negado: Apenas administradores podem reparar resumos financeiros.');
    }

    try {
      const docId = `summary_${shopId}_${dateStr}`;
      logger.warn('core', 'Iniciando reparo de integridade do resumo diário', { docId });
      
      void firebaseService.addAuditLog({ enterpriseId, shopId, staffId: user.id, staffName: user.name, action: 'FINANCIAL_REPAIR', details: `Reparo manual do resumo diário para a data ${dateStr}` });

      // Otimização de Auditoria: Busca apenas pedidos do dia específico via query indexada (closedAt)
      const dailyOrders = (await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'shopId', op: '==', value: shopId },
        { field: 'status', op: '==', value: 'delivered' },
        { field: 'closedAt', op: '>=', value: new Date(dateStr).getTime() },
        { field: 'closedAt', op: '<', value: new Date(dateStr).getTime() + (24 * 60 * 60 * 1000) }
      ])) as Order[];

      const hourlySales: Record<number, number> = {};
      let totalSales = 0;
      let totalCost = 0;

      dailyOrders.forEach(o => {
        totalSales += o.total;
        const hour = new Date(o.closedAt!).getHours();
        hourlySales[hour] = (hourlySales[hour] || 0) + o.total;
        
        const orderCost = (o.items || []).reduce((itemAcc, item) => {
          const cost = Number((item as any).unitCost || (item as any).cost || 0);
          return itemAcc + (isNaN(cost) ? 0 : cost * (item.quantity || 1));
        }, 0);
        totalCost += orderCost;
      });

      const repairedData = {
        enterpriseId,
        shopId,
        date: dateStr,
        totalSales,
        totalCost,
        orderCount: dailyOrders.length,
        hourlySales,
        updatedAt: Date.now(),
        repairedAt: Date.now() // Flag de auditoria para identificar intervenções
      };

      await firebaseService.saveItem('dailySummaries', docId, repairedData);
      logger.info('core', 'Resumo diário reparado com sucesso', { docId, totalSales });
    } catch (error) {
      logger.error('core', 'Falha ao executar reparo no agregador diário', { error });
    }
  }
}