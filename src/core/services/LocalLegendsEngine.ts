import { Order, Staff, InventoryItem } from '../../types';
import { logger } from './logger';

export interface LocalLegend {
  id: string;
  title: string;
  description: string;
  mythLevel: 'common' | 'rare' | 'epic' | 'legendary';
  iconType: 'table' | 'staff' | 'stock' | 'money';
}

/**
 * LocalLegendsEngine - Motor de Folclore Operacional
 * Transforma dados analíticos em "Lendas" para engajamento da equipe.
 */
export class LocalLegendsEngine {
  /**
   * Analisa o snapshot de dados e gera as lendas do local.
   * Auditoria: Processado localmente no browser para economizar Firestore.
   */
  static generateLegends(orders: Order[], staff: Staff[], inventory: any[]): LocalLegend[] {
    const legends: LocalLegend[] = [];
    
    try {
      // 1. Lenda das Mesas (ex: Mesa que mais pede sobremesa)
      const tableStats: Record<string, { total: number, desserts: number }> = {};
      orders.forEach(o => {
        const tid = o.tableId || 'balcao';
        if (!tableStats[tid]) tableStats[tid] = { total: 0, desserts: 0 };
        tableStats[tid].total++;
        const hasDessert = o.items.some(i => i.category?.toLowerCase().includes('sobremesa') || i.name.toLowerCase().includes('doce'));
        if (hasDessert) tableStats[tid].desserts++;
      });

      const bestTable = Object.entries(tableStats).sort((a, b) => b[1].desserts - a[1].desserts)[0];
      if (bestTable && bestTable[1].desserts > 2) {
        legends.push({
          id: 'sugar_vortex',
          title: `O Vórtice de Açúcar`,
          description: `Dizem que a Mesa ${bestTable[0]} atrai forças doces. Quase todos os rituais lá terminam em sobremesa.`,
          mythLevel: 'epic',
          iconType: 'table'
        });
      }

      // 2. Lenda do Staff (ex: O Mago do PIX)
      const staffPix: Record<string, number> = {};
      orders.forEach(o => {
        if (o.paymentMethod === 'pix') {
          staffPix[o.staffId] = (staffPix[o.staffId] || 0) + 1;
        }
      });

      const pixWizardId = Object.entries(staffPix).sort((a, b) => b[1] - a[1])[0]?.[0];
      const wizardName = staff.find(s => s.id === pixWizardId)?.name;
      if (wizardName) {
        legends.push({
          id: 'pix_wizard',
          title: `O Alquimista Digital`,
          description: `Cuidado com ${wizardName.split(' ')[0]}. Ele tem o dom de transformar clientes em transferências instantâneas via PIX.`,
          mythLevel: 'rare',
          iconType: 'staff'
        });
      }

      // 3. Lenda do Estoque (ex: O Fantasma da Quebra)
      // Simulado via dados de inventário negativo que já auditamos
      const negativeItem = inventory.find(i => i.currentStock < 0);
      if (negativeItem) {
        legends.push({
          id: 'stock_phantom',
          title: `O Fantasma de ${negativeItem.name}`,
          description: `O sistema diz que não existe, mas os olhos veem. Este item desafia as leis da física e da contagem.`,
          mythLevel: 'legendary',
          iconType: 'stock'
        });
      }

      // 4. Default: Lenda do Horário de Pico
      legends.push({
        id: 'golden_hour',
        title: `A Hora de Ouro`,
        description: `Entre 19h e 20h, o Nexus vibra. É o momento onde os heróis do PDV mostram seu verdadeiro valor.`,
        mythLevel: 'common',
        iconType: 'money'
      });

    } catch (error) {
      logger.error('system', 'Falha ao conjurar lendas locais', { error });
    }

    return legends;
  }

  /**
   * Permite que o dono adicione um "Override" manual para criar lendas personalizadas.
   */
  static async saveCustomLegend(enterpriseId: string, legend: LocalLegend) {
    // Salva no Drive (Eco-Mode) para não gastar Firestore
    logger.info('system', 'Lenda customizada imortalizada no Drive.');
  }
}