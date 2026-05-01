import { authService } from '../../auth/authService';
import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { SimulationEngine } from './SimulationEngine';
import { ShopCloneEngine } from './ShopCloneEngine';
import { HREngine } from './HREngine';
import { BusinessMode, Company, Staff } from '../types';
import { idGenerator } from '../utils/idGenerator';

export class TenantProvisioningEngine {
  /**
   * Provisiona uma nova empresa do zero com os pilares de gestão Nexus.
   */
  static async register(
    name: string,
    ownerEmail: string,
    businessType: BusinessMode,
    ownerName?: string,
    ownerPhone?: string,
    enabledModules: string[] = [],
    templateSource?: { enterpriseId: string; shopId: string }
  ) {
    const isSolo = businessType === 'solo_service' || businessType === 'solo_retail' || businessType === 'convenience';

    // Nexus Standard Security: Criptografia para credenciais operacionais
    const password = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map(b => b.toString(36)).join('').slice(0, 10);
    const pin = (1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000)).toString();

    const created = await authService.createOwner(
      {
        name,
        businessType,
        ownerEmail,
        ownerName: ownerName || 'Proprietário',
        ownerPhone,
        enabledModules: Array.from(new Set([
          ...enabledModules,
          businessType,
          'hr_core',
          'store_mgmt_core',
          'settings_custom_core',
          'customer_core',
          isSolo ? 'solo_assistant_core' : ''
        ].filter(Boolean))),
        availableModules: ['restaurant', 'market', 'construction', 'retail', 'service', 'pharmacy', 'autoparts'],
      },
      { password, pin }
    );

    const newCompanyId = created.tenant.id;

    if (isSolo) {
      await HREngine.saveStaff(newCompanyId, {
        id: created.owner.id,
        name: ownerName || 'Consultor Solo',
        role: 'owner',
        active: true,
        businessModel: 'freelancer',
        assignedShopIds: ['main-shop'],
        email: ownerEmail
      }, undefined, 'dev');
    }

    if (templateSource) {
      await ShopCloneEngine.cloneShop(newCompanyId, templateSource.enterpriseId, templateSource.shopId, {
        name: 'Unidade Matriz',
        location: 'Principal'
      } as any, {
        cloneProducts: true,
        cloneCategories: true,
        resetStock: true
      });
    }

    return { ...created.tenant, credentials: { password, pin } };
  }

  /**
   * Cria ambientes de Sandbox/Curso.
   */
  static async setupTraining(name: string, template: any) {
    const company = await this.register(
      `[TREINO] ${name}`,
      `training_${Date.now()}@gridos.com`,
      template.type as BusinessMode,
      'Instrutor Virtual',
      '',
      ['hr_core', 'store_mgmt_core', 'solo_assistant_core']
    );

    await authService.updateTenant(company.id, { 
      isDemo: true, 
      trainingModeEnabled: true,
      storageStrategy: 'drive_only' 
    });

    await SimulationEngine.bootstrapFullSimulation(company.id, 'main-shop', template.type as any);
    return company;
  }

  /**
   * Simula acesso de cargo para QA e Treinamento.
   */
  static async simulateRole(companyId: string, role: string) {
    const staffDocs = await firebaseService.getDocsByQuery('staff', [
      { field: 'enterpriseId', op: '==', value: companyId },
      { field: 'role', op: '==', value: role === 'staff' ? 'waiter' : role } 
    ]) as Staff[];

    if (staffDocs.length > 0) {
      return authService.loginWithPIN('1234', companyId);
    }
    return authService.impersonateTenant(companyId);
  }

  /**
   * Provisiona em lote os cenários padrão do Nexus para novos desenvolvedores.
   */
  static async provisionDefaultScenarios(enterpriseId: string) {
    const demoScenarios = [
      { name: 'Nexus Gourmet (Restaurante)', type: 'restaurant' as const, modules: ['restaurant', 'hr_core', 'store_mgmt_core'] },
      { name: 'Nexus Concept Store (Varejo)', type: 'retail' as const, modules: ['retail', 'customer_core', 'store_mgmt_core'] },
      { name: 'Nexus Professional Services', type: 'service' as const, modules: ['service', 'customer_core', 'hr_core'] },
      { name: 'Ink & Art Studio (Tattoo)', type: 'service' as const, modules: ['service', 'settings_custom_core', 'hr_core'] },
      { name: 'Nexus Logística (Distribuidora)', type: 'market' as const, modules: ['market', 'retail', 'store_mgmt_core'] }
    ];

    for (const scenario of demoScenarios) {
      logger.info('auth', `Provisionando ambiente de teste: ${scenario.name}`);
      
      const company = await this.register(
        scenario.name,
        `demo_${scenario.type}_${Math.random().toString(36).slice(2, 5)}@gridos.com`,
        scenario.type,
        'Instrutor Nexus',
        '11900000000',
        scenario.modules
      );

      // Popula dados base
      await SimulationEngine.bootstrapFullSimulation(company.id, 'main-shop', scenario.type);
      
      // Configura metadados de Treinamento
      await authService.updateTenant(company.id, { 
        status: 'active',
        isDemo: true, 
        trainingModeEnabled: true 
      });
    }
  }

  /**
   * Provisionamento automático para usuários Google (Nexus Solo).
   * Requisito 2, 3 e 7: Configura empresa, suporte e estratégia de Drive.
   */
  static async provisionSoloNexus(user: { name: string; email: string; id: string }) {
    logger.info('auth', 'Iniciando provisionamento automático Nexus Solo...');
    
    const company = await this.register(
      `${user.name} Studio`,
      user.email,
      'solo_service', 
      user.name,
      '',
      ['hr_core', 'store_mgmt_core', 'solo_assistant_core']
    );

    // Usuário suporte automático (Virtual)
    await HREngine.saveStaff(company.id, {
      id: idGenerator.generate('support'),
      name: 'Grid Support (Virtual)',
      role: 'manager',
      active: true,
      email: 'support@gridos.com',
      isVirtualSupport: true
    }, undefined, 'dev');

    // Define estratégia Drive-First
    await authService.updateTenant(company.id, { 
      storageStrategy: 'drive_only',
      googleDriveBackupEnabled: true 
    });

    return company;
  }
}