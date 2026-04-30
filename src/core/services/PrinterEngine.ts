import { t, LocaleEngine } from './LocaleEngine';
import { logger } from './logger';

export interface PrintJob {
  id: string;
  type: 'receipt' | 'order' | 'label' | 'report';
  content: string;
  timestamp: number;
}

export class PrinterEngine {
  private static queue: PrintJob[] = [];

  /**
   * Formata um recibo de venda padrão
   */
  static async printReceipt(orderData: any): Promise<boolean> {
    const { items, total, paymentMethod, shopName } = orderData;
    
    let receipt = `\n[C]${shopName.toUpperCase()}\n`;
    receipt += `[C]--------------------------------\n`;
    receipt += `[L]${t('checkout.total').toUpperCase()}: [R]${LocaleEngine.formatCurrency(total)}\n`;
    receipt += `[L]PAGAMENTO: [R]${paymentMethod.toUpperCase()}\n`;
    receipt += `[C]--------------------------------\n`;
    
    items.forEach((item: any) => {
      receipt += `[L]${item.quantity}x ${item.name.slice(0, 18)} [R]${LocaleEngine.formatCurrency(item.price * item.quantity)}\n`;
    });
    
    receipt += `[C]--------------------------------\n`;
    receipt += `[C]${new Date().toLocaleString()}\n`;
    receipt += `[C]OBRIGADO PELA PREFERENCIA\n\n\n\n`;

    return this.sendToQueue({
      id: `print-${Date.now()}`,
      type: 'receipt',
      content: receipt,
      timestamp: Date.now()
    });
  }

  /**
   * Formata etiqueta de gôndola (Uso em Mercado/Varejo)
   */
  static async printProductLabel(product: any): Promise<boolean> {
    let label = `\n[L]${product.name.toUpperCase()}\n`;
    label += `[L]PRECO: [R]${LocaleEngine.formatCurrency(product.price)}\n`;
    label += `[C][BARCODE]${product.barcode}\n\n`;
    
    return this.sendToQueue({
      id: `label-${product.id}`,
      type: 'label',
      content: label,
      timestamp: Date.now()
    });
  }

  private static async sendToQueue(job: PrintJob): Promise<boolean> {
    try {
      this.queue.push(job);
      logger.info('printer', 'Tarefa enviada para fila de impressão', { type: job.type, id: job.id });
      
      // Simula envio para driver nativo (ou via Web Serial API/Bluetooth)
      console.log('%c PRINTING START ', 'background: #000; color: #fff; font-weight: bold;');
      console.log(job.content);
      console.log('%c PRINTING END ', 'background: #000; color: #fff; font-weight: bold;');
      
      return true;
    } catch (error) {
      logger.error('printer', 'Falha ao processar impressão', { error });
      return false;
    }
  }

  static getPendingJobsCount(): number {
    return this.queue.length;
  }
}