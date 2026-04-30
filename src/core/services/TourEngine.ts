export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetId: string;
}

export class TourEngine {
  private static steps: Record<string, TourStep[]> = {
    owner: [
      { id: '1', title: 'Visão Estratégica', content: 'Bem-vindo, Proprietário! Este painel consolida faturamento e rentabilidade de toda a sua rede em tempo real.', targetId: 'dashboard-title' },
      { id: '2', title: 'Sincronização Cloud', content: 'Fique de olho neste indicador. Ele garante que seus dados locais estão seguros e espelhados na nuvem.', targetId: 'sync-status-btn' },
      { id: '3', title: 'Saúde Operacional', content: 'Aqui você vê rapidamente se há incidentes críticos ou rupturas de estoque que exigem sua atenção.', targetId: 'stat-cards-grid' }
    ],
    manager: [
      { id: '1', title: 'Monitor de Operação', content: 'Olá, Gerente! Aqui você acompanha o status das mesas, pedidos em preparo e a produtividade da equipe.', targetId: 'dashboard-title' },
      { id: '2', title: 'Alertas de Atenção', content: 'Incidentes operacionais e fechamentos pendentes aparecem aqui para sua ação imediata.', targetId: 'critical-alerts-box' },
      { id: '3', title: 'Time em Operação', content: 'Veja quem está trabalhando agora e o tempo de expediente acumulado de cada colaborador.', targetId: 'staff-active-list' }
    ],
    staff: [
      { id: '1', title: 'Seu Painel de Bordo', content: 'Bem-vindo ao time! Este é o seu espaço para gerenciar sua jornada e acompanhar suas metas.', targetId: 'staff-header-profile' },
      { id: '2', title: 'Tempo de Expediente', content: 'Não esqueça de iniciar seu trabalho aqui para registrar seu tempo e garantir sua produtividade.', targetId: 'clock-timer-box' },
      { id: '3', title: 'Minhas Metas', content: 'Acompanhe seu score de atendimento e as comissões acumuladas no seu turno atual.', targetId: 'performance-score-card' }
    ]
  };

  static getStepsForRole(role: string): TourStep[] {
    return this.steps[role] || this.steps.staff;
  }

  static isTourPending(): boolean {
    return localStorage.getItem('pos_tour_pending') === 'true';
  }

  static consumeTour(): string | null {
    const role = localStorage.getItem('pos_tour_role');
    localStorage.removeItem('pos_tour_pending');
    localStorage.removeItem('pos_tour_role');
    return role;
  }

  static markRoleSimulated(role: string) {
    const simulated = JSON.parse(localStorage.getItem('pos_simulated_roles') || '[]');
    if (!simulated.includes(role)) {
      simulated.push(role);
      localStorage.setItem('pos_simulated_roles', JSON.stringify(simulated));
      localStorage.setItem('pos_tour_pending', 'true');
      localStorage.setItem('pos_tour_role', role);
    }
  }
}