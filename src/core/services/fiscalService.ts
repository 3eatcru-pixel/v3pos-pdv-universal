import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';

export interface NFCeData {
  saleId: string;
  items: any[];
  total: number;
  payments: any[];
  customer?: {
    document: string; // CPF/CNPJ
    name?: string;
  };
}

class FiscalService {
  /**
   * Emite NFC-e (Nota Fiscal de Consumidor Eletrônica)
   * Integração com MOC 7.0
   */
  async emitNFCe(data: NFCeData): Promise<{ success: boolean; protocol?: string; error?: string }> {
    logger.info('fiscal', 'Iniciando emissão de NFC-e', { saleId: data.saleId });

    try {
      // Simulação de chamada ao WebService da SEFAZ ou integrador fiscal (ex: FocusNFe, PlugNotas)
      // Em ambiente real, aqui enviamos o XML assinado
      const isOnline = navigator.onLine;

      if (!isOnline) {
        return this.handleContingency(data);
      }

      const protocol = `SEFAZ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      await firebaseService.saveItem('fiscal_events', `nfce_${data.saleId}`, {
        ...data,
        protocol,
        status: 'authorized',
        emittedAt: Date.now()
      });

      logger.info('fiscal', 'NFC-e autorizada com sucesso', { protocol });
      return { success: true, protocol };
    } catch (error) {
      logger.error('fiscal', 'Erro na emissão fiscal', { error });
      return this.handleContingency(data);
    }
  }

  private async handleContingency(data: NFCeData) {
    logger.warn('fiscal', 'Entrando em modo de contingência offline', { saleId: data.saleId });
    // Salva para transmissão posterior (regra das 24h)
    await firebaseService.saveItem('fiscal_contingency', data.saleId, {
      ...data,
      status: 'pending_transmission',
      offlineAt: Date.now()
    });
    return { success: true, error: 'OFFLINE_CONTINGENCY' };
  }
}

export const fiscalService = new FiscalService();