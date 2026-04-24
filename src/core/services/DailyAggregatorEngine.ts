import { firebaseService } from '../../services/firebaseService';
import { CoreSale } from '../types';
import { Order } from '../../types';
import { format } from 'date-fns';
import { logger } from './logger';
import { accountService } from './accountService';

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
        return acc + (Number(item.unitCost || item.cost || 0) * (item.quantity || 1));
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
      void accountService.reportViolationToDev(sale.shopId, 'FRAUD_DETECTION', `Falha no agregador: ${error?.message}`);
    }
  }

  /**
   * Valida se o resumo diário reflete fielmente a soma dos pedidos individuais.
   * Dispara um alerta se houver divergência entre o documento de resumo e os pedidos reais.
   */
  static async validateDailyIntegrity(enterpriseId: string, shopId: string, dateStr: string): Promise<boolean> {
    try {
      const docId = `summary_${shopId}_${dateStr}`;
      const summaries = await firebaseService.getAllDocs('dailySummaries', enterpriseId, shopId);
      const summary = summaries.find(s => s.id === docId);

      if (!summary) {
        logger.warn('core', 'Validação de integridade abortada: Resumo não encontrado', { docId });
        return false;
      }

      const allOrders = (await firebaseService.getAllDocs('orders', enterpriseId, shopId)) as Order[];
      
      const dailyOrders = allOrders.filter(o => {
        if (!o.closedAt || o.status !== 'delivered') return false;
        return format(new Date(o.closedAt), 'yyyy-MM-dd') === dateStr;
      });

      const actualTotal = dailyOrders.reduce((acc, o) => acc + o.total, 0);
      const actualCount = dailyOrders.length;
      const actualCost = dailyOrders.reduce((acc, o) => {
        return acc + (o.items || []).reduce((itemAcc, item) => {
          return itemAcc + (Number((item as any).unitCost || (item as any).cost || 0) * (item.quantity || 1));
        }, 0);
      }, 0);

      const isDivergent = 
        Math.abs(actualTotal - (summary.totalSales || 0)) > 0.01 || 
        actualCount !== (summary.orderCount || 0) ||
        Math.abs(actualCost - (summary.totalCost || 0)) > 0.01;

      if (isDivergent) {
        const msg = `DIVERGÊNCIA BFF (${dateStr}): Vendas Real: R$ ${actualTotal.toFixed(2)} vs BFF: R$ ${summary.totalSales?.toFixed(2)}. Qtd: ${actualCount} vs ${summary.orderCount}.`;
        logger.error('core', 'Divergência de dados detectada no resumo diário', { shopId, dateStr, actualTotal, summaryTotal: summary.totalSales });
        void accountService.sendSupportMessage(msg);
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
    try {
      const docId = `summary_${shopId}_${dateStr}`;
      logger.warn('core', 'Iniciando reparo de integridade do resumo diário', { docId });

      const allOrders = (await firebaseService.getAllDocs('orders', enterpriseId, shopId)) as Order[];
      const dailyOrders = allOrders.filter(o => {
        if (!o.closedAt || o.status !== 'delivered') return false;
        return format(new Date(o.closedAt), 'yyyy-MM-dd') === dateStr;
      });

      const hourlySales: Record<number, number> = {};
      let totalSales = 0;
      let totalCost = 0;

      dailyOrders.forEach(o => {
        totalSales += o.total;
        const hour = new Date(o.closedAt!).getHours();
        hourlySales[hour] = (hourlySales[hour] || 0) + o.total;
        
        totalCost += (o.items || []).reduce((itemAcc, item) => {
          return itemAcc + (Number((item as any).unitCost || (item as any).cost || 0) * (item.quantity || 1));
        }, 0);
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