import { firebaseService } from '../../services/firebaseService';
import { Staff, Product, Order } from '../../types';
import { logger } from './logger';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  route: string;
}

/**
 * OnboardingEngine - Motor de Rastreamento de Missões Iniciais
 * Audita o progresso do proprietário na configuração da unidade.
 */
export class OnboardingEngine {
  /**
   * Calcula o status de cada missão do tutorial inicial.
   */
  static async getOnboardingProgress(enterpriseId: string, shopId: string): Promise<OnboardingStep[]> {
    try {
      // 1. Busca dados para auditoria de progresso
      const [staff, products, orders] = await Promise.all([
        firebaseService.getDocsByQuery('staff', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]),
        firebaseService.getDocsByQuery('products', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]),
        firebaseService.getDocsByQuery('orders', [{ field: 'enterpriseId', op: '==', value: enterpriseId }])
      ]);

      const hasRealStaff = (staff as Staff[]).some(s => !s.id.startsWith('mock-'));
      const hasMockData = (staff as Staff[]).some(s => s.id.startsWith('mock-'));
      const hasProducts = products.length > 0;
      const hasOrders = orders.length > 0;

      const steps: OnboardingStep[] = [
        {
          id: 'provisioning',
          label: 'Infraestrutura Nexus',
          description: 'Empresa registrada e módulos Core ativados.',
          completed: true, // Se ele está vendo isso, já provisionou
          actionLabel: 'Concluído',
          route: '/holding'
        },
        {
          id: 'staff_hiring',
          label: 'Formação de Equipe',
          description: 'Contrate seu primeiro colaborador e defina cargos.',
          completed: hasRealStaff,
          actionLabel: 'Contratar Agora',
          route: '/staff'
        },
        {
          id: 'catalog_setup',
          label: 'Catálogo de Operação',
          description: 'Cadastre seus produtos ou importe um mix técnico.',
          completed: hasProducts,
          actionLabel: 'Configurar Itens',
          route: '/inventory'
        },
        {
          id: 'game_mode',
          label: 'Treinamento (Modo Jogo)',
          description: 'Ative a simulação viva para treinar seu staff.',
          completed: hasMockData,
          actionLabel: 'Iniciar Simulação',
          route: '/dashboard'
        }
      ];

      return steps;
    } catch (error) {
      logger.error('system', 'Falha ao calcular progresso de onboarding', { error });
      return [];
    }
  }
}