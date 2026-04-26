import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { Printer } from '../../types';

/**
 * PrinterEngine - Motor de Orquestração de Impressão e Failover.
 * Gerencia o envio de jobs para hardware e a lógica de Impressão em Cascata.
 */
export class PrinterEngine {
  /**
   * Envia um trabalho de impressão para a impressora alvo.
   * Implementa a lógica de cascata: Kitchen -> Bar -> Receipt.
   */
  static async sendToPrinter(
    enterpriseId: string, 
    shopId: string, 
    targetType: 'kitchen' | 'bar' | 'receipt', 
    content: string,
    existingPrinters?: Printer[] // Auditoria: Evita re-leitura do banco em cascata
  ): Promise<boolean> {
    try {
      const printers = existingPrinters || await firebaseService.getDocsByQuery('printers', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'shopId', op: '==', value: shopId }
      ]) as Printer[];

      // 1. Localiza a impressora principal do tipo solicitado
      let printer = printers.find(p => p.type === targetType && p.isDefault && p.status === 'online');
      
      if (!printer) {
        // Fallback: Tenta qualquer uma online do mesmo tipo antes de mudar a rota
        printer = printers.find(p => p.type === targetType && p.status === 'online');
      }

      if (printer) {
        const success = await this.executePhysicalPrint(printer, content);
        if (success) return true;

        // Se falhou fisicamente, marca como erro para o dashboard e segue para cascata
        await firebaseService.updateItem('printers', printer.id, { status: 'error', updatedAt: Date.now() });
        logger.error('printer', `Falha física na impressora ${printer.name}. Iniciando cascata.`);
      }

      // 2. Aciona Lógica de Cascata (Failover)
      return await this.handleCascadeFailover(enterpriseId, shopId, targetType, content, printers);
    } catch (error) {
      logger.error('printer', 'Falha crítica no motor de impressão', { error });
      return false;
    }
  }

  /**
   * Define a rota de fuga caso a impressora principal falhe.
   */
  private static async handleCascadeFailover(
    enterpriseId: string, 
    shopId: string, 
    failedType: string, 
    content: string, 
    allPrinters: Printer[]
  ): Promise<boolean> {
    // Rota: Kitchen -> Bar -> Receipt (Caixa)
    let nextFallback: 'kitchen' | 'bar' | 'receipt' | null = null;
    if (failedType === 'kitchen') nextFallback = 'bar';
    else if (failedType === 'bar') nextFallback = 'receipt';

    if (!nextFallback) {
      logger.error('printer', 'Fim da linha: Nenhuma impressora disponível na cascata.');
      return false;
    }

    logger.warn('printer', `CASCATA ATIVA: Redirecionando ${failedType} para ${nextFallback}`);
    
    // Adiciona cabeçalho de aviso no papel para a equipe humana
    const failoverNotice = `\n================================\n*** AVISO: FALHA NA IMPRESSORA ***\nESTE PEDIDO EH DA ${failedType.toUpperCase()}\n================================\n\n`;
    const augmentedContent = failoverNotice + content;

    // Recursão: tenta imprimir no próximo nível da cascata
    return await this.sendToPrinter(enterpriseId, shopId, nextFallback, augmentedContent);
  }

  /**
   * Simula a execução do protocolo ESC/POS via rede ou USB.
   */
  private static async executePhysicalPrint(printer: Printer, content: string): Promise<boolean> {
    try {
      // Simulação de latência de hardware
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('HW_TIMEOUT')), 5000);
        // 15% de chance de falha para testar a resiliência do sistema
        const isSuccess = Math.random() > 0.15; 
        setTimeout(() => { clearTimeout(timeout); isSuccess ? resolve(true) : reject(); }, 800);
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}