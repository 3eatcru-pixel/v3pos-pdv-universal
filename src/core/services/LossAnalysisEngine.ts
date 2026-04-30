import { firebaseService } from '../../services/firebaseService';
import { StockTransfer } from './StockTransferEngine';
import { RecountRequest } from '../../types';
import { logger } from './logger';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface LossAuditReport {
  period: string;
  enterpriseId: string;
  totalLossValue: number;
  divergencesCount: number;
  recountsCount: number;
  details: {
    transfers: any[];
    recounts: any[];
  };
}

/**
 * Motor de Análise de Perdas e Quebras (Audit Engine)
 * Consolida dados de divergências de transporte e ajustes manuais de estoque.
 */
export class LossAnalysisEngine {
  /**
   * Gera um relatório consolidado de perdas para um mês específico.
   */
  static async getMonthlyLossReport(enterpriseId: string, month: number, year: number): Promise<LossAuditReport> {
    const date = new Date(year, month);
    const startDate = startOfMonth(date).getTime();
    const endDate = endOfMonth(date).getTime();

    try {
      // 1. Buscar Transferências com Divergência no período
      const transfers = await firebaseService.getDocsByQuery('stock_transfers', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'hasDivergence', op: '==', value: true },
        { field: 'receivedAt', op: '>=', value: startDate },
        { field: 'receivedAt', op: '<=', value: endDate }
      ]) as StockTransfer[];

      // 2. Buscar Reconciliações Manuais (Recounts) com perda no período
      const recounts = await firebaseService.getDocsByQuery('recountRequests', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'date', op: '>=', value: startDate },
        { field: 'date', op: '<=', value: endDate },
        // Filtra por varianceValue < 0 para pegar apenas perdas
        // Nota: Firebase não suporta query range em campos diferentes, então o filtro (varianceValue < 0)
        // ainda pode precisar ser feito em memória se o Firebase não permitir.
        // Para otimização, considere um campo 'isLoss' no RecountRequest.
      ]) as RecountRequest[];
      // Filtragem final em memória para varianceValue < 0, se a query do Firebase não suportar
      const filteredRecounts = recounts.filter(r => (r.varianceValue || 0) < 0);

      // 3. Calcular valor total de perdas (Monetário)
      const totalManualLoss = filteredRecounts.reduce((acc, r) => acc + Math.abs(r.varianceValue || 0), 0);
      
      // Cálculo das perdas em transporte (Divergências)
      const transportLossValue = transfers.reduce((acc, t) => {
        const itemsLoss = t.items.reduce((itemAcc, item) => {
          const sent = item.quantity;
          const received = t.receivedQuantities?.[item.id] ?? sent;
          const diff = sent - received;
          // Correção: Utiliza o custo unitário real do item registrado na transferência
          return itemAcc + (diff > 0 ? diff * (Number((item as any).unitCost || 0)) : 0); 
        }, 0);
        return acc + itemsLoss;
      }, 0);

      const report: LossAuditReport = {
        period: format(date, 'MMMM yyyy', { locale: ptBR }),
        enterpriseId,
        totalLossValue: totalManualLoss + transportLossValue, // Agora inclui perdas de transporte
        divergencesCount: transfers.length,
        recountsCount: filteredRecounts.length,
        details: {
          transfers: transfers.map(t => ({
            id: t.id,
            guide: t.digitalGuideId,
            from: t.sourceShopId,
            to: t.destinationShopId,
            date: t.receivedAt,
            receivedBy: t.receivedBy
          })),
          recounts: filteredRecounts.map(r => ({
            item: r.itemName,
            variance: r.newStock - r.previousStock,
            value: r.varianceValue,
            reason: r.comment,
            staff: r.staffName
          }))
        }
      };

      logger.info('inventory', 'Relatório de auditoria de perdas gerado', { period: report.period });
      return report;
    } catch (error) {
      logger.error('inventory', 'Erro ao consolidar análise de perdas', { error });
      throw error;
    }
  }

  /**
   * Gera o layout de auditoria e dispara a visualização do PDF (Placeholder).
   */
  static generateLossAuditPDF(report: LossAuditReport) {
    logger.info('inventory', 'Exportando PDF de auditoria de perdas', { report });
    
    // Simulação de geração de PDF estruturado
    const header = `AUDITORIA DE PERDAS E QUEBRAS - ${report.period.toUpperCase()}`;
    const summary = `Total de Perdas: R$ ${report.totalLossValue.toFixed(2)}\nDivergências em Carga: ${report.divergencesCount}\nAjustes de Inventário: ${report.recountsCount}`;
    
    alert(`${header}\n\n${summary}\n\nDocumento gerado para auditoria interna da empresa.`);
  }
}
