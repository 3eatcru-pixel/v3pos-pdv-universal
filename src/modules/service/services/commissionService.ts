import { Order, ServiceProvider, ServiceDefinition } from '../types'; // ItemModifier não é usado diretamente aqui

class CommissionService {
  /**
   * Calcula a comissão ganha por um provedor com base em pedidos (Orders) pagos.
   * Agora olha para os itens da venda para identificar taxas customizadas.
   */
  public calculateProviderCommissions(
    provider: ServiceProvider,
    orders: Order[],
    services: ServiceDefinition[]
  ): number {
    let totalCommission = 0;

    // Otimização: Transforma lista de serviços em Map para busca O(1)
    const serviceMap = new Map(services.map(s => [s.id, s]));

    for (const order of orders) {
      // Apenas computa ordens pagas ou concluídas
      if (order.status !== 'paid' && order.status !== 'completed') continue;
      if (order.total <= 0) continue;
      
      for (const item of order.items) {
        // Tenta encontrar a definição do serviço para verificar taxas específicas
        const serviceDef = serviceMap.get(item.productId);
        
        // Ordem de precedência: Taxa do Serviço > Taxa do Profissional
        const activeRate = serviceDef?.customCommissionRate ?? provider.commissionRate; // customCommissionRate deve ser adicionado ao tipo ServiceDefinition

        totalCommission += (item.price * item.quantity * activeRate) / 100;
      }
    }

    return totalCommission;
  }

  /**
   * Gera o relatório consolidado da empresa agrupando ordens por profissional.
   */
  public generateEnterpriseReport(
    providers: ServiceProvider[],
    orders: Order[],
    services: ServiceDefinition[]
  ) {
    // Agrupamento O(n) usando staffId presente na Order
    const ordersByProvider = orders.reduce((acc, order) => {
      const providerId = order.staffId || 'unassigned';
      if (!acc[providerId]) acc[providerId] = [];
      acc[providerId].push(order);
      return acc;
    }, {} as Record<string, Order[]>);

    return providers.map(p => {
      const pOrders = ordersByProvider[p.id] || [];
      const commission = this.calculateProviderCommissions(p, pOrders, services);
      const totalSales = pOrders.reduce((sum, o) => sum + o.total, 0);

      return {
        providerId: p.id,
        providerName: p.name,
        ordersHandled: pOrders.length,
        totalSales,
        commissionEarned: commission
      };
    });
  }
}

export const commissionService = new CommissionService();
