import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';
import { BusinessMode, Staff, Product, Order, InventoryItem, PerformanceEvent } from '../../types';
import { HREngine } from './HREngine';
import { coreSalesService } from './coreServices';

/**
 * SimulationEngine - Motor de Geração de Dados Fictícios
 * Utilizado para demonstrações (Demo Mode) e testes de performance.
 */
export class SimulationEngine {
  
  private static MOCK_NAMES = ['Bruno Silva', 'Ana Oliveira', 'Carlos Souza', 'Mariana Costa', 'Ricardo Alves', 'Julia Pereira'];
  
  /**
   * Simula uma única venda em tempo real.
   * Essencial para o "Modo Jogo" onde as vendas aparecem no dashboard conforme acontecem.
   */
  static async simulateLiveOrder(enterpriseId: string, shopId: string) {
    const staff = await firebaseService.getDocsByQuery('staff', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]) as Staff[];
    const products = await firebaseService.getDocsByQuery('products', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]) as Product[];

    if (staff.length === 0 || products.length === 0) return;

    const randomStaff = staff[Math.floor(Math.random() * staff.length)];
    const itemsCount = 1 + Math.floor(Math.random() * 2);
    const orderItems = [];
    let total = 0;

    for (let i = 0; i < itemsCount; i++) {
      const p = products[Math.floor(Math.random() * products.length)];
      const qty = 1;
      orderItems.push({
        productId: p.id,
        name: p.name,
        quantity: qty,
        price: p.price,
        totalPrice: p.price * qty,
        status: 'delivered'
      });
      total += p.price * qty;
    }

    const orderId = generateSafeId('live-ord');
    const saleData = {
      id: orderId,
      enterpriseId,
      shopId,
      staffId: randomStaff.id,
      staffName: randomStaff.name,
      total,
      status: 'delivered' as const,
      paymentMethod: 'pix' as const,
      createdAt: Date.now(),
      closedAt: Date.now(),
      items: orderItems
    };

    // Processa via CoreSalesService para disparar baixas de estoque e eventos reais
    await (coreSalesService as any).processSale(saleData, orderItems);
    logger.info('system', '💰 Venda simulada em tempo real', { total, staff: randomStaff.name });
  }

  /**
   * Popula uma unidade completa com staff, produtos e histórico de vendas.
   */
  static async bootstrapFullSimulation(enterpriseId: string, shopId: string, mode: BusinessMode) {
    logger.info('system', 'Iniciando bootstrap de simulação', { mode, shopId });
    
    try {
      // 1. Gerar Staff Fictício
      const staffIds = await this.generateMockStaff(enterpriseId, shopId, mode);
      
      // 2. Gerar Catálogo Base (Produtos/Insumos)
      const productIds = await this.generateMockCatalog(enterpriseId, shopId, mode);
      
      // 3. Simular Histórico de Vendas (Últimos 7 dias)
      const isSolo = mode.startsWith('solo_');
      await this.generateMockOrders(enterpriseId, shopId, staffIds, productIds, isSolo ? 15 : 50);
      
      logger.info('system', 'Simulação concluída com sucesso');
    } catch (error) {
      logger.error('system', 'Falha ao gerar simulação', { error });
    }
  }

  /**
   * Dispara um incidente aleatório (Game Event).
   * Pode ser um elogio, uma falha técnica ou uma advertência.
   */
  static async triggerRandomIncident(enterpriseId: string) {
    const staff = await firebaseService.getDocsByQuery('staff', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]) as Staff[];
    if (staff.length === 0) return;

    const randomStaff = staff[Math.floor(Math.random() * staff.length)];
    const incidents = [
      { title: 'Feedback Positivo', type: 'praise', msg: 'Cliente elogiou a rapidez no atendimento.', pts: 10 },
      { title: 'Erro de Pedido', type: 'error', msg: 'Troca de itens no pedido final.', pts: -5 },
      { title: 'Atraso detectado', type: 'reprimand', msg: 'Colaborador chegou após o início do turno.', pts: -15 },
      { title: 'Treinamento Concluído', type: 'training', msg: 'Finalizou o módulo de Higiene ANVISA.', pts: 20 }
    ];

    const incident = incidents[Math.floor(Math.random() * incidents.length)];

    await HREngine.recordPerformance(enterpriseId, {
      staffId: randomStaff.id,
      type: incident.type as any,
      title: incident.title,
      description: incident.msg,
      points: incident.pts,
      createdBy: 'Simulação Automática'
    });
  }

  private static async generateMockStaff(enterpriseId: string, shopId: string, mode: BusinessMode): Promise<string[]> {
    const roles = {
      restaurant: ['waiter', 'chef', 'manager'],
      retail: ['salesperson', 'manager'],
      market: ['cashier', 'stockist'],
      service: ['specialist', 'receptionist'],
      construction: ['engineer', 'foreman'],
      autoparts: ['technician', 'salesperson'],
      pharmacy: ['pharmacist', 'clerk'],
      solo_service: ['owner'],
      solo_retail: ['owner']
    };

    const isSolo = mode.startsWith('solo_');
    const ids: string[] = [];
    const selectedRoles = roles[mode] || ['staff'];

    const count = isSolo ? 1 : 4;

    for (let i = 0; i < count; i++) {
      const id = generateSafeId('mock-staff');
      const staff: Partial<Staff> = {
        id,
        enterpriseId,
        name: this.MOCK_NAMES[i % this.MOCK_NAMES.length],
        role: selectedRoles[i % selectedRoles.length] as any,
        active: true,
        assignedShopIds: [shopId],
        salary: 2000 + (Math.random() * 3000),
        performanceScore: 80 + (Math.random() * 20)
      };
      await firebaseService.saveItem('staff', id, staff);
      ids.push(id);
    }
    return ids;
  }

  private static async generateMockCatalog(enterpriseId: string, shopId: string, mode: BusinessMode): Promise<string[]> {
    const items = {
      restaurant: [{ name: 'Hambúrguer Gourmet', price: 45 }, { name: 'Cerveja Artesanal', price: 18 }, { name: 'Batata Rústica', price: 25 }],
      autoparts: [{ name: 'Amortecedor Dianteiro', price: 450, code: 'OEM-992' }, { name: 'Pastilha de Freio', price: 120, code: 'BP-44' }],
      retail: [{ name: 'Smartphone X1', price: 2500 }, { name: 'Fone Bluetooth', price: 199 }],
      service: [{ name: 'Sessão de Tattoo (H)', price: 300 }, { name: 'Consultoria Técnica', price: 500 }],
      solo_service: [{ name: 'Consultoria Individual', price: 150 }, { name: 'Mentoria Pro', price: 450 }],
      solo_retail: [{ name: 'Produto Artesanal A', price: 89 }, { name: 'Kit Personalizado', price: 120 }]
    };

    const ids: string[] = [];
    const catalog = items[mode as keyof typeof items] || items.restaurant;

    for (const baseItem of catalog) {
      const id = generateSafeId('mock-prod');
      const product: Partial<Product> = {
        id,
        enterpriseId,
        shopId,
        name: baseItem.name,
        price: baseItem.price,
        stock: 50,
        category: 'Simulação',
        active: true
      };
      await firebaseService.saveItem('products', id, product);
      ids.push(id);
    }
    return ids;
  }

  private static async generateMockOrders(
    enterpriseId: string, 
    shopId: string, 
    staffIds: string[], 
    productIds: string[], 
    count: number
  ) {
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      await firebaseService.runTransaction(async (tx) => {
        const id = generateSafeId('mock-ord');
        const staffId = staffIds[Math.floor(Math.random() * staffIds.length)];
        const itemsCount = 1 + Math.floor(Math.random() * 3);
        const orderItems = [];
        let total = 0;

        for (let j = 0; j < itemsCount; j++) {
          const prodId = productIds[Math.floor(Math.random() * productIds.length)];
          const qty = 1 + Math.floor(Math.random() * 2);
          const price = 20 + (Math.random() * 100);
          orderItems.push({
            productId: prodId,
            name: `Item Simulado ${j+1}`,
            quantity: qty,
            price: price,
            totalPrice: qty * price
          });
          total += qty * price;
        }

        const orderRef = firebaseService.getDocRef('orders', id);
        const orderTimestamp = now - (Math.random() * 7 * 24 * 60 * 60 * 1000);
        
        tx.set(orderRef, {
          id, enterpriseId, shopId, staffId,
          status: 'delivered', items: orderItems, total,
          paymentMethod: Math.random() > 0.5 ? 'card' : 'pix',
          createdAt: orderTimestamp, closedAt: orderTimestamp
        });

        const transId = generateSafeId('mock-tr');
        tx.set(firebaseService.getDocRef('transactions', transId), {
          id: transId, enterpriseId, shopId, type: 'income',
          amount: total, category: 'Venda de Produtos',
          description: `Venda Simulação #${id.slice(-4)}`,
          timestamp: orderTimestamp
        });
      });
    }
  }

  /**
   * Remove todos os dados gerados pela simulação (staff, produtos e pedidos mock).
   * Essencial para transição do "Modo Jogo" para a "Operação Real".
   */
  static async clearSimulationData(enterpriseId: string) {
    logger.warn('system', '🧹 Iniciando purga de dados de simulação', { enterpriseId });
    
    try {
      const collections = [
        'staff', 'products', 'orders', 'transactions', 
        'performance_events', 'resource_bookings', 'eod_sessions'
      ];
      
      for (const col of collections) {
        const mocks = await firebaseService.getDocsByQuery(col, [
          { field: 'enterpriseId', op: '==', value: enterpriseId },
          // Busca IDs que começam com 'mock' ou 'live-ord'
          { field: 'id', op: '>=', value: 'mock' },
          { field: 'id', op: '<=', value: 'mock' + '\uf8ff' }
        ]);

        // Auditoria: Processa deleção em chunks para evitar sobrecarga de socket
        for (let i = 0; i < mocks.length; i += 400) {
          const chunk = mocks.slice(i, i + 400);
          await firebaseService.runTransaction(async (tx) => {
            chunk.forEach(m => tx.delete(firebaseService.getDocRef(col, m.id)));
          });
        }
        logger.info('system', `Removidos ${mocks.length} registros de ${col}`);
      }

      // Reseta o contador de unidades usadas para dar um "fresh start" ao cliente real
      await firebaseService.updateItem('enterprises', enterpriseId, { monthlyUnitsUsed: 0 });
      
    } catch (error) {
      logger.error('system', 'Falha ao limpar dados de simulação', { error });
    }
  }
}