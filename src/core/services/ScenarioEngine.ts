import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';
import { BusinessMode } from '../types';
import { SimulationEngine } from './SimulationEngine';
import { AuditEngine } from './AuditEngine';
import { InventoryEngine } from './InventoryEngine';
import { meshNetwork } from '../../services/p2pSync';

/**
 * ScenarioEngine - Motor Unificado de Experiências e Testes
 * Consolida SimulationEngine e RetailSimulationEngine.
 */
export class ScenarioEngine {
  /**
   * Realiza o setup completo de uma empresa para demonstração.
   */
  static async bootstrapDemo(enterpriseId: string, shopId: string, mode: BusinessMode) {
    logger.info('system', '🚀 Iniciando cenário de demonstração unificado', { mode });
    return SimulationEngine.bootstrapFullSimulation(enterpriseId, shopId, mode);
  }

  /**
   * Executa missões de treinamento (Tutorial Game).
   */
  static async startTutorial(enterpriseId: string, shopId: string) {
    logger.info('system', '🎮 Iniciando sequência de tutorial');
    
    // Vendas rápidas para popular dashboard
    await this.runStressTest(enterpriseId, shopId, 5);
    
    // Simula erro para o usuário aprender a auditar
    setTimeout(() => this.simulateDivergence(enterpriseId, shopId), 5000);
  }

  /**
   * Teste de Estresse: Rajada de vendas rápidas.
   */
  static async runStressTest(enterpriseId: string, shopId: string, count: number = 10) {
    logger.warn('system', `🔥 Executando teste de estresse: ${count} vendas`);
    
    const [inventory, products] = await Promise.all([
      firebaseService.getAllDocs('inventory', enterpriseId),
      firebaseService.getAllDocs('products', enterpriseId)
    ]) as [any[], any[]];

    for (let i = 0; i < count; i++) {
      const saleId = `stress_${Date.now()}_${i}`;
      const mockSale = {
        id: saleId,
        enterpriseId,
        shopId,
        total: Math.random() * 200,
        status: 'delivered',
        closedAt: Date.now(),
        items: [{ id: 'prod_test', quantity: 1, price: 10 }]
      };
      
      // Nexus Standard: Sincronismo Mesh + Inventário Atômico em Transação
      await firebaseService.runTransaction(async (tx) => {
        await InventoryEngine.adjustStockRecursive(
          [{ id: 'prod_test', quantity: 1, transactionId: saleId }],
          1,
          enterpriseId,
          shopId,
          inventory,
          products,
          tx
        );
        tx.set(firebaseService.getDocRef('orders', saleId), mockSale);
      });
      meshNetwork.broadcast('SALE_CREATED', mockSale);
    }
  }

  /**
   * Simula cenários de erro para validar o AuditEngine.
   */
  static async simulateDivergence(enterpriseId: string, shopId: string) {
    const productId = 'ghost_item_' + Date.now();
    
    // 1. Estoque Negativo
    await firebaseService.saveItem('products', productId, {
      id: productId,
      enterpriseId,
      shopId,
      name: 'Item com Divergência Simulado',
      stock: -10,
      updatedAt: Date.now()
    });

    // 2. Venda Órfã (Venda sem transação financeira)
    const saleId = `orphan_${Date.now()}`;
    await firebaseService.saveItem('orders', saleId, {
      id: saleId,
      enterpriseId,
      shopId,
      total: 99.90,
      status: 'delivered',
      closedAt: Date.now(),
      items: []
    });

    logger.error('system', '⚠️ Cenários de divergência criados para auditoria.');
    
    // Verifica se o AuditEngine detecta
    setTimeout(async () => {
      const integrity = await AuditEngine.verifyDatabaseIntegrity(enterpriseId);
      const orphans = await AuditEngine.detectOrphanSales(enterpriseId);
      logger.info('system', '🔍 Auditoria Automática Pós-Simulação:', { 
        stockErrors: integrity.length, 
        orphans: orphans.length 
      });
    }, 2000);
  }

  /**
   * Limpa todos os vestígios de simulação.
   */
  static async purge(enterpriseId: string) {
    logger.warn('system', '🧹 Purgando todos os dados de simulação/teste');
    await SimulationEngine.clearSimulationData(enterpriseId);
    
    // Limpa também logs de auditoria gerados por testes
    const logs = await firebaseService.getDocsByQuery('audit_logs', [
      { field: 'enterpriseId', op: '==', value: enterpriseId }
    ]);
    // ... lógica de deleção de logs de teste ...
  }
}