import { logger } from './logger';
import { AuditEngine } from './AuditEngine';
import { meshNetwork } from './p2pSync';
import { firebaseService } from '../../services/firebaseService';

/**
 * RetailSimulationEngine - Simulador de estresse e erro para o varejo.
 * Permite testar a resiliência do sistema sem necessidade de hardware físico.
 */
export class RetailSimulationEngine {
  
  /**
   * Executa uma sequência de tutorial para testar o sistema de ponta a ponta.
   */
  static async startTutorialGame(enterpriseId: string, shopId: string) {
    logger.info('system', '🎮 Invocando Missão 1: O Primeiro PDV');
    
    // Passo 1: Simular venda normal
    await this.simulateSalesBurst(enterpriseId, shopId, 2);
    
    // Passo 2: Simular "Erro de Campo" (Venda Órfã)
    setTimeout(async () => {
      logger.info('system', '🎮 Missão 2: Detectando Fantasmas (Vendas sem Financeiro)');
      await this.simulateOrphanSaleScenario(enterpriseId, shopId);
    }, 5000);

    // Passo 3: Simular "Crise de Estoque" (Venda de item que não existe)
    setTimeout(async () => {
      logger.info('system', '🎮 Missão 3: O Desafio do Estoque Negativo');
      await this.simulateNegativeStockScenario(enterpriseId, shopId);
    }, 10000);
  }

  /**
   * Simula um cenário onde o estoque fica negativo para testar alertas do AuditEngine.
   */
  static async simulateNegativeStockScenario(enterpriseId: string, shopId: string) {
    const productId = 'ghost_item_' + Date.now();
    const mockProduct = {
      id: productId,
      enterpriseId,
      shopId,
      name: 'Produto Fantasma Teste',
      stock: -5, // Forçamos o erro
      updatedAt: Date.now()
    };

    await firebaseService.saveItem('products', productId, mockProduct);
    logger.warn('system', 'Simulação: Item com estoque negativo criado.');
    
    const divergences = await AuditEngine.verifyDatabaseIntegrity(enterpriseId);
    if (divergences.some(d => d.type === 'NEGATIVE_STOCK')) {
      logger.info('system', '✅ Sucesso: O AuditEngine capturou o estoque negativo.');
    }
  }

  /**
   * Simula uma rajada de vendas rápidas para testar concorrência e sincronização.
   */
  static async simulateSalesBurst(enterpriseId: string, shopId: string, count: number = 10) {
    logger.info('system', `Iniciando simulação de ${count} vendas rápidas...`);
    
    for (let i = 0; i < count; i++) {
      const saleId = `sim_sale_${Date.now()}_${i}`;
      const mockSale = {
        id: saleId,
        enterpriseId,
        shopId,
        total: Math.random() * 100,
        status: 'delivered',
        closedAt: Date.now(),
        items: [{ id: 'prod_test', quantity: 1, price: 10 }]
      };

      // Simula o evento P2P chegando antes ou durante a persistência
      meshNetwork.broadcast('SALE_CREATED', mockSale);
      
      // Persistência com pequeno delay aleatório para simular latência de rede
      setTimeout(async () => {
        try {
          await firebaseService.saveItem('orders', saleId, mockSale);
          logger.debug('system', `Simulação: Venda ${i+1} persistida.`);
        } catch (e) {
          logger.error('system', `Erro na persistência da venda simulada ${i+1}`);
        }
      }, Math.random() * 2000);
    }
  }

  /**
   * Simula uma "Venda Órfã" (venda sem financeiro) para testar o AuditEngine.
   */
  static async simulateOrphanSaleScenario(enterpriseId: string, shopId: string) {
    logger.warn('system', 'Simulando cenário de erro: Venda sem registro financeiro...');
    
    const saleId = `orphan_${Date.now()}`;
    const mockSale = {
      id: saleId,
      enterpriseId,
      shopId,
      total: 500.00,
      status: 'delivered',
      closedAt: Date.now(),
      items: []
    };

    // Salvamos a venda, mas NÃO salvamos o registro no payment_ledger
    await firebaseService.saveItem('orders', saleId, mockSale);
    
    logger.info('system', 'Venda órfã criada. Rodando auditoria para detecção...');
    
    // Executa o motor de auditoria para validar se ele pega o erro
    setTimeout(async () => {
      const divergences = await AuditEngine.detectOrphanSales(enterpriseId);
      const found = divergences.find(d => d.itemId === saleId);
      if (found) {
        logger.info('system', '✅ Sucesso: O AuditEngine detectou a venda órfã simulada.');
      } else {
        logger.error('system', '❌ Falha: O AuditEngine não detectou a venda órfã.');
      }
    }, 1000);
  }
}