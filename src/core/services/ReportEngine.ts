import { format } from 'date-fns';
import { localeEngine } from './LocaleEngine';
import { logger } from './logger';

// Interface para garantir que o ReportEngine receba os dados esperados do DashboardView
export interface DashboardStats {
  totalSalesToday: number;
  avgTicketToday: number;
  profitMargin: number;
  activeTablesCount: number;
  laborCostPercentage: number;
  avgTableTurnTime: number;
  preparingCount: number;
  totalHours: number;
  totalMinutes: number;
  stockAlerts: number;
  chartData: { name: string; sales: number }[];
  shopPerformance: { name: string; sales: number }[];
  orderCount: number; // Alterado de TodayCount para ser genérico ao período
  shiftsToday: any[]; // Assumindo Shift type
}

class ReportEngine {
  /**
   * Gera um relatório de vendas em formato CSV.
   * @param stats Dados estatísticos do Dashboard.
   * @param selectedPeriod Período selecionado ('today', '7d', '30d').
   * @param shopName Nome da loja ou 'Global' para visão regional.
   * @returns String contendo o conteúdo CSV.
   */
  generateSalesCSV(
    stats: DashboardStats,
    selectedPeriod: 'today' | '7d' | '30d',
    shopName: string = 'Global'
  ): string {
    const periodLabel = selectedPeriod === 'today' ? 'Hoje' : selectedPeriod === '7d' ? '7 Dias' : '30 Dias';
    const date = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

    let csvContent = `Relatório de Vendas - ${shopName},Período: ${periodLabel},Gerado em: ${date}\n`;
    csvContent += `Métrica,Valor\n`;
    csvContent += `Total de Vendas,${localeEngine.formatMoney(stats.totalSalesToday, false)}\n`;
    csvContent += `Ticket Médio,${localeEngine.formatMoney(stats.avgTicketToday, false)}\n`;
    csvContent += `Margem de Lucro,${stats.profitMargin.toFixed(2)}%\n`;
    csvContent += `Pedidos no Período,${stats.orderCount}\n`;
    csvContent += `Custo de Mão de Obra,${stats.laborCostPercentage.toFixed(2)}%\n`;
    csvContent += `Alertas de Estoque,${stats.stockAlerts}\n`;

    csvContent += `\nDetalhe de Vendas por ${selectedPeriod === 'today' ? 'Hora' : 'Dia'}\n`;
    csvContent += `${selectedPeriod === 'today' ? 'Hora' : 'Data'},Vendas\n`;
    stats.chartData.forEach(dataPoint => {
      csvContent += `${dataPoint.name},${dataPoint.sales.toFixed(2)}\n`;
    });

    if (stats.shopPerformance && stats.shopPerformance.length > 0) {
      csvContent += `\nPerformance por Unidade\n`;
      csvContent += `Unidade,Vendas\n`;
      stats.shopPerformance.forEach(perf => {
        csvContent += `${perf.name},${perf.sales.toFixed(2)}\n`;
      });
    }

    return csvContent;
  }

  /**
   * Gera um relatório de vendas em formato PDF (placeholder).
   * @param stats Dados estatísticos do Dashboard.
   * @param selectedPeriod Período selecionado.
   * @param shopName Nome da loja.
   */
  generateSalesPDF(
    stats: DashboardStats,
    selectedPeriod: 'today' | '7d' | '30d',
    shopName: string = 'Global'
  ): void {
    logger.info('report', 'Gerando PDF de vendas', { selectedPeriod, shopName, stats });
    alert(`PDF de vendas para ${shopName} (${selectedPeriod}) seria gerado aqui. (Funcionalidade em desenvolvimento)`);
  }
}

export const reportEngine = new ReportEngine();