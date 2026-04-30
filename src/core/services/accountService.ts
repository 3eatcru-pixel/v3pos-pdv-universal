import { Company, SupportMessage, User, BusinessMode, Shop, Staff } from '../types';
export type { Company, SupportMessage, User, BusinessMode, Shop };
import { Order } from '../../types';
import { meshNetwork } from '../../services/p2pSync';
import { format } from 'date-fns';
import { authService } from '../../auth/authService'; // Moved up for consistency
import { localeEngine, CountryCode } from './LocaleEngine';
import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { ShopCloneEngine, CloneOptions } from './ShopCloneEngine';
import { StockTransferEngine, TransferItem } from './StockTransferEngine';
import { CommunicationEngine } from './CommunicationEngine';
import { HREngine, ROLE_HIERARCHY } from './HREngine';
import { EndOfDayEngine } from './EndOfDayEngine';
import { SimulationEngine } from './SimulationEngine';
import { BackupEngine } from './BackupEngine';
import { CloudConfig, cloudLatencyMonitor } from './CloudLatencyMonitor';
import { TourEngine } from './TourEngine';

class AccountService {
  private mapRoleForLegacy(role: string): User['role'] {
    if (role === 'staff') return 'staff';
    if (role === 'manager') return 'manager';
    if (role === 'owner') return 'owner';
    if (role === 'dev') return 'dev';
    return 'staff';
  }

  private toLegacyUser(): User | null {
    const authUser = authService.getCurrentUser();
    if (!authUser) return null;

    return {
      id: authUser.id,
      name: authUser.name,
      role: this.mapRoleForLegacy(authUser.role),
      email: authUser.email,
      pin: authUser.pin,
      companyId: authUser.tenantId || 'global',
    };
  }

  public getCurrentCompanyId(): string | null {
    const session = authService.getCurrentSession();
    return session?.tenantId || null;
  }

  public getSelectedShopId(): string | null {
    return localStorage.getItem('rm_selected_shop_id');
  }

  public setSelectedShopId(shopId: string | null): void {
    if (shopId) localStorage.setItem('rm_selected_shop_id', shopId);
    else localStorage.removeItem('rm_selected_shop_id');
  }

  public getCurrentTenant() {
    return authService.getCurrentTenant();
  }

  public async getEODSession() {
    const user = this.getCurrentUser();
    const shopId = this.getSelectedShopId();
    const companyId = this.getCurrentCompanyId();
    if (!user || !shopId || !companyId) return null;

    return EndOfDayEngine.startSession(companyId, shopId, user.id, user.name);
  }

  public async registerCompany(
    name: string,
    ownerEmail: string,
    businessType: BusinessMode,
    ownerName?: string,
    ownerPhone?: string,
    enabledModules: string[] = [], // Default to empty array, will add core modules
    templateSource?: { enterpriseId: string; shopId: string } // Permite puxar mix de outra loja
  ): Promise<Company & { credentials: { password: string; pin: string } }> {
    const currentUser = this.getCurrentUser();
    
    const isSolo = businessType === 'solo_service' || businessType === 'solo_retail' || businessType === 'convenience';

    // Auditoria: Garante que o usuário escolheu pelo menos um módulo de negócio (não-core)
    const businessModules = enabledModules.filter(m => !['hr_core', 'store_mgmt_core', 'settings_custom_core'].includes(m) && m !== businessType);
    if (businessModules.length === 0 && !isSolo) {
      throw new Error('Fluxo de Instalação interrompido: Você deve selecionar pelo menos um módulo operacional para sua empresa.');
    }

    // Auditoria: Somente Dev, Suporte (manager) ou Donos podem registrar novas empresas
    const hasPower = currentUser && ['dev', 'owner', 'manager'].includes(currentUser.role);
    if (currentUser && !hasPower) {
      throw new Error('Acesso negado: Você não tem permissão para provisionar novas empresas.');
    }

    // Fase 11: Geração criptograficamente segura de credenciais
    const generateSecureString = (len: number) => {
      const array = new Uint8Array(len);
      crypto.getRandomValues(array);
      return Array.from(array, (b) => b.toString(36).charAt(0)).join('');
    };

    const ownerPassword = generateSecureString(8);
    const ownerPin = (1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000)).toString();

    // Se for um dono criando outra empresa, mantemos o vínculo de ownerId
    const targetOwnerId = currentUser?.role === 'owner' ? currentUser.id : undefined;

    const created = await authService.createOwner(
      {
        name,
        businessType,
        ownerEmail,
        ownerName: ownerName || 'Proprietário',
        ownerPhone,
        // Auditoria: Garante a injeção dos pilares de gestão
        enabledModules: Array.from(new Set(([
          ...enabledModules, 
          businessType, 
          'hr_core', 
          'store_mgmt_core', 
          'settings_custom_core',
          'customer_core',
          isSolo ? 'solo_assistant_core' : ''
        ]).filter(Boolean))),
        // Disponibiliza todos os módulos como "unlocked" para o dono gerenciar no futuro, ou herda do dev
        availableModules: ['restaurant', 'market', 'construction', 'retail', 'service', 'pharmacy', 'autoparts', 'solo_service', 'solo_retail', 'convenience', 'google_business_pro'], 
      },
      {
        password: ownerPassword,
        pin: ownerPin,
      }
    );

    const newCompanyId = created.tenant.id;

    // Auditoria Solo: Configura automaticamente o proprietário como o Staff principal
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
      logger.info('auth', 'Perfil Solo configurado com auto-gestão ativada.');
    }

    // Lógica de "Pull": Se houver template, clonamos produtos e categorias com estoque ZERADO
    if (templateSource) {
      logger.info('auth', 'Puxando catálogo de template para nova empresa', { templateSource, newCompanyId });
      await ShopCloneEngine.cloneShop(newCompanyId, templateSource.enterpriseId, templateSource.shopId, {
        name: 'Unidade Matriz',
        location: 'Principal'
      } as any, {
        cloneProducts: true,
        cloneCategories: true,
        syncMenuChanges: false,
        resetStock: true // Sempre zerado para nova reconciliação
      });
    }

    return {
      id: created.tenant.id,
      name: created.tenant.name,
      ownerId: created.tenant.ownerId,
      businessType: created.tenant.businessType,
      ownerEmail: created.tenant.ownerEmail,
      ownerName: created.tenant.ownerName,
      ownerPhone: created.tenant.ownerPhone,
      accessCode: created.tenant.accessCode,
      status: created.tenant.status,
      createdAt: created.tenant.createdAt,
      enabledModules: created.tenant.enabledModules,
      lockedModules: created.tenant.lockedModules,
      isPaused: created.tenant.isPaused,
      owners: [created.owner.id],
      credentials: { password: ownerPassword, pin: ownerPin }
    };
  }

  public async createOwner(
    tenantData: {
      name: string;
      businessType: BusinessMode;
      ownerEmail: string;
      ownerName: string;
      ownerPhone?: string;
      enabledModules?: string[];
    },
    ownerData: { password: string; pin?: string }
  ) {
    const currentUser = this.getCurrentUser();
    // Auditoria: Apenas desenvolvedores ou contas de suporte podem criar contas de donos do zero
    const canCreateOwner = currentUser?.role === 'dev' || currentUser?.role === 'manager';
    if (!canCreateOwner) {
      throw new Error('Apenas o suporte técnico pode provisionar novos proprietários no sistema.');
    }

    return authService.createOwner(tenantData, ownerData);
  }

  public async loginWithCredentials(email: string, password: string, tenantId?: string): Promise<boolean> {
    return authService.loginWithCredentials(email, password, tenantId);
  }

  public async loginWithPIN(pin: string, tenantId: string): Promise<boolean> {
    return authService.loginWithPIN(pin, tenantId);
  }

  public async createStaff(input: {
    tenantId: string;
    name: string;
    email?: string;
    password?: string;
    pin?: string;
    role: 'manager' | 'staff';
  }) {
    return authService.createStaff(input);
  }

  public async updateStaff(
    userId: string,
    patch: Partial<{ name: string; email: string; pin: string; password: string; active: boolean }>
  ) {
    return authService.updateStaff(userId, patch);
  }

  public async assignRole(userId: string, role: 'manager' | 'staff') {
    return authService.assignRole(userId, role);
  }

  public async loginAsOwner(company: Company): Promise<boolean> {
    const user = this.getCurrentUser();
    if (user?.role === 'dev') {
      logger.warn('auth', 'Desenvolvedor iniciando impersonação de proprietário', { companyId: company.id });
      void firebaseService.addAuditLog({ enterpriseId: company.id, shopId: 'global', staffId: user.id, staffName: user.name, action: 'DEV_IMPERSONATION_START', details: `Acesso de manutenção iniciado por ${user.email}` });
    }
    return authService.impersonateTenant(company.id);
  }

  public async joinAsEmployee(accessCode: string, name: string): Promise<boolean> {
    const tenants = await authService.listTenants();
    const tenant = tenants.find((t) => t.accessCode === accessCode && (t.status === 'active' || t.status === 'maintenance'));
    if (!tenant) return false;

    const tempPin = (1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000)).toString();
    const created = await authService.createStaff({
      tenantId: tenant.id,
      name,
      pin: tempPin,
      role: 'staff',
    });
    return authService.loginWithPIN(created.pin || tempPin, tenant.id);
  }

  public async loginAsDev(email: string, password?: string): Promise<boolean> {
    logger.info('auth', 'Tentativa de login de desenvolvedor', { email });
    const success = await authService.loginAsDev(email, password);
    if (success) logger.info('auth', 'Login de desenvolvedor bem-sucedido', { email });
    return success;
  }

  public async loginWithDevBootstrap(code: string): Promise<boolean> {
    return authService.loginWithDevBootstrap(code);
  }

  /**
   * Retorna os templates de demonstração disponíveis no Drive/Global
   */
  public async getAvailableDemoTemplates() {
    // Simula busca de metadados de demos oficiais no Google Drive ou Firestore Global
    return [
      { id: 'template-res-01', name: 'Restaurante Premium', type: 'restaurant', description: 'Menu completo com KDS e Mesas configuradas.' },
      { id: 'template-ret-01', name: 'Varejo Moda', type: 'retail', description: 'Estoque de roupas, grades de tamanhos e CRM.' },
      { id: 'template-mkt-01', name: 'Mercado Express', type: 'market', description: 'Frente de caixa rápido com 2000 SKUs.' },
      { id: 'template-srv-01', name: 'Estúdio de Tattoo/Beauty', type: 'service', description: 'Agenda de serviços e controle de comissões.' }
    ];
  }

  /**
   * Cria um ambiente de teste (Sandbox) para uma empresa existente ou novo usuário.
   * Salva localmente e espelha no Drive para modo Curso.
   */
  public async createTrainingEnvironment(name: string, templateId: string) {
    const templates = await this.getAvailableDemoTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) throw new Error('Template não encontrado');

    logger.info('auth', 'Provisionando ambiente de curso/treinamento', { templateId });

    // Provisiona uma empresa com flags de treinamento
    const company = await this.registerCompany(
      `[TREINO] ${name}`,
      `training_${Date.now()}@gridos.com`,
      template.type as BusinessMode,
      'Instrutor Virtual',
      '',
      ['hr_core', 'store_mgmt_core', 'solo_assistant_core']
    );

    // Ativa o modo live no Drive para este nó
    await authService.updateTenant(company.id, { 
      isDemo: true, 
      trainingModeEnabled: true,
      storageStrategy: 'drive_only' 
    });

    // Popula dados base do template
    await SimulationEngine.bootstrapFullSimulation(company.id, 'main-shop', template.type as any);
    
    return company;
  }

  /**
   * Realiza login instantâneo em uma empresa demo com um cargo específico para simulação.
   * Permite que qualquer usuário teste a interface sob diferentes perspectivas.
   */
  public async simulateRoleAccess(companyId: string, role: 'owner' | 'manager' | 'staff') {
    logger.info('auth', `Simulando acesso como ${role} na empresa ${companyId}`);
    
    // Busca o primeiro staff que corresponda ao cargo na empresa demo (via SimulationEngine)
    const staffDocs = await firebaseService.getDocsByQuery('staff', [
      { field: 'enterpriseId', op: '==', value: companyId },
      { field: 'role', op: '==', value: role === 'staff' ? 'waiter' : role } 
    ]) as Staff[];

    if (staffDocs.length > 0) {
      // Fase 11: Registra necessidade de tour educativo para o primeiro acesso à simulação
      TourEngine.markRoleSimulated(role);

      // Se encontrou o cargo mocado, entra com o PIN padrão de simulação (1234)
      return authService.loginWithPIN('1234', companyId);
    }

    // Fallback: Se não houver staff mocado, tenta entrar no modo Manager/Owner direto
    TourEngine.markRoleSimulated(role);
    return authService.impersonateTenant(companyId);
  }

  /**
   * Sobe todas as empresas marcadas como DEMO para o Drive e registra links globais.
   */
  public async publishDemosToGlobalStore(): Promise<void> {
    const companies = await this.getAllCompanies();
    const demoCompanies = companies.filter(c => c.isDemo);

    logger.info('auth', `Iniciando publicação de ${demoCompanies.length} pacotes demo no Drive...`);

    for (const company of demoCompanies) {
      // Garante que o sistema trate este nó como Host para permitir o backup
      localStorage.setItem('pos_device_role', 'host');
      localStorage.setItem(`pos_is_demo_${company.id}`, 'true');

      const result = await BackupEngine.runEnterpriseBackup(company.id);
      
      if (result.success && result.driveFileId) {
        await firebaseService.saveItem('global_demo_templates', company.businessType, {
          templateName: company.name,
          businessType: company.businessType,
          driveFileId: result.driveFileId,
          lastUpdated: Date.now(),
          description: `Template oficial Nexus para ${company.businessType}`
        });
      }
    }
    logger.info('auth', '✅ Loja de Demos atualizada com sucesso no Drive e Firestore.');
  }

  /**
   * Provisionamento da primeira conta DEV via backdoor de segurança.
   */
  public async provisionInitialDev(email: string, password: string): Promise<boolean> {
    try {
      logger.warn('auth', 'Provisionamento inicial de DEV e Ambiente de Demonstração solicitado via backdoor');
      
      // Cria a conta dev e vincula o tenant padrão de infraestrutura
      const success = await authService.loginAsDev(email, password); 
      if (!success) return false;

      // Definição dos cenários de demonstração (Tutorial/Training)
      const demoScenarios = [
        { name: 'Nexus Gourmet (Restaurante)', type: 'restaurant' as const, modules: ['restaurant', 'hr_core', 'store_mgmt_core'] },
        { name: 'Nexus Concept Store (Varejo)', type: 'retail' as const, modules: ['retail', 'customer_core', 'store_mgmt_core'] },
        { name: 'Nexus Professional Services', type: 'service' as const, modules: ['service', 'customer_core', 'hr_core'] },
        { name: 'Ink & Art Studio (Tattoo)', type: 'service' as const, modules: ['service', 'settings_custom_core', 'hr_core'] },
        { name: 'Glow & Style (BeautyShop)', type: 'service' as const, modules: ['service', 'customer_core', 'hr_core'] },
        { name: 'Nexus Logística (Distribuidora)', type: 'market' as const, modules: ['market', 'retail', 'store_mgmt_core'] }
      ];

      // Provisionamento em lote para o Dev Dashboard
      for (const scenario of demoScenarios) {
        logger.info('auth', `Provisionando ambiente de teste: ${scenario.name}`);
        
        const company = await this.registerCompany(
          scenario.name,
          `demo_${scenario.type}_${Math.random().toString(36).slice(2, 5)}@gridos.com`,
          scenario.type,
          'Instrutor Nexus',
          '11900000000',
          scenario.modules
        );

        // Popula com Menu, Staff trabalhando e Estoque Mocado
        await SimulationEngine.bootstrapFullSimulation(company.id, 'main-shop', scenario.type);
        
        // Configura metadados de Treinamento
        await authService.updateTenant(company.id, { 
          status: 'active',
          isDemo: true, // Tag para filtro no dashboard dev
          trainingModeEnabled: true 
        });
      }

      return true;
    } catch (error) {
      logger.error('auth', 'Falha no provisionamento inicial', { error });
      return false;
    }
  }

  public async loginAsMasterDev(): Promise<boolean> {
    return false;
  }

  public async loginAsServer(accessCode: string): Promise<boolean> {
    // Auditoria: Limpa resíduos de sessões anteriores para garantir boot nativo limpo
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_device_mode');
    localStorage.removeItem('pos_failover_active');

    const tenants = await authService.listTenants();
    const tenant = tenants.find((t) => t.accessCode === accessCode && t.status === 'active');
    if (!tenant) return false;

    const success = await authService.loginAsServerNode(tenant.id, tenant.name);
    if (!success) return false;

    localStorage.setItem('pos_device_role', 'host');
    localStorage.setItem('pos_device_mode', 'central_server');
    localStorage.setItem('pos_business_mode', tenant.businessType);
    localStorage.setItem('rm_enterprise_id', tenant.id);

    // Auditoria: Passa configurações explicitamente para evitar circularidade
    const cloudConfig = tenant.cloudConfig || { provider: 'system', tier: 'free' };
    meshNetwork.startCloudSync(tenant.id, cloudConfig, tenant.autoCloudSwitchingEnabled); 
    meshNetwork.requestCloudSync(tenant.id, true); // Request an immediate, forced sync
    return true;
  }

  public logout() {
    authService.logout();
    localStorage.removeItem('pos_business_mode');
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_device_mode');
    localStorage.removeItem('pos_sync_mode');
    localStorage.removeItem('pos_notifications');
    localStorage.removeItem('rm_selected_shop_id');
    localStorage.removeItem('rm_enterprise_id');
    window.location.reload();
  }

  /**
   * Vincula a conta atual do usuário a uma conta Google para Logins futuros.
   */
  public async linkGoogleAccount(): Promise<boolean> {
    return authService.linkGoogleProvider();
  }

  /**
   * Realiza login direto via Google OAuth.
   */
  public async loginWithGoogle(): Promise<boolean> {
    const success = await authService.signInWithGoogle();
    if (success) {
      const authUser = authService.getCurrentUser();
      if (authUser && !authUser.tenantId) {
        // Requisito 2: Criação automática da empresa no primeiro login
        logger.info('auth', 'Primeiro acesso Google detectado. Provisionando Nexus Solo...');
        
        const newCompany = await this.registerCompany(
          `${authUser.name} Studio`,
          authUser.email!,
          'solo_service', // Tipo padrão para autônomos
          authUser.name,
          '',
          ['hr_core', 'store_mgmt_core', 'solo_assistant_core']
        );

        // Requisito 3: Usuário suporte automático (ReadOnly para configurações)
        await HREngine.saveStaff(newCompany.id, {
          id: `support-${generateSafeId('')}`,
          name: 'Grid Support (Virtual)',
          role: 'manager',
          active: true,
          email: 'support@gridos.com',
          isVirtualSupport: true // Flag para restringir acesso a dados operacionais
        }, undefined, 'dev');

        // Requisito 7: Define que esta empresa opera no modo "Drive-First"
        await authService.updateTenant(newCompany.id, { 
          storageStrategy: 'drive_only',
          googleDriveBackupEnabled: true 
        });
      }

      localStorage.removeItem('pos_business_mode');
      window.location.reload();
    }
    return success;
  }

  public async loginAsDemo() {
    const tenants = await authService.listTenants();
    let tenant = tenants[0];

    if (!tenant) {
      const created = await authService.createOwner(
        {
          name: 'Sistema Modular Demo',
          ownerEmail: 'demo@modular.com',
          businessType: 'restaurant',
          ownerName: 'Admin Demo',
          ownerPhone: '11999999999',
          enabledModules: ['restaurant', 'retail', 'market', 'service'],
        },
        {
          password: 'demo123',
          pin: '1234',
        }
      );
      tenant = created.tenant;

      // Puxa simulação inicial para a demo não nascer vazia
      await SimulationEngine.bootstrapFullSimulation(tenant.id, 'main-shop', 'restaurant');
    }

    const demoEmail = tenant.ownerEmail || 'demo@modular.com';
    const ok = await authService.loginWithCredentials(demoEmail, 'demo123', tenant.id);
    if (!ok) return;
    localStorage.removeItem('pos_business_mode');
    window.location.reload();
  }

  public getCurrentUser(): User | null {
    return this.toLegacyUser();
  }

  public async getAllCompanies(): Promise<Company[]> {
    const enterprises = await firebaseService.getAllDocs('enterprises');
    return (enterprises as any[]).map((t) => ({
      id: t.id,
      name: t.name,
      ownerId: t.ownerId || 'unknown',
      businessType: t.businessType || 'restaurant',
      ownerEmail: t.ownerEmail || '',
      ownerName: t.ownerName || '',
      ownerPhone: t.ownerPhone || '',
      accessCode: t.accessCode || '',
      status: t.status || 'active',
      createdAt: t.createdAt || Date.now(),
      lockedModules: t.lockedModules || [],
      enabledModules: t.enabledModules || [],
      isPaused: t.isPaused || false,
      isDemo: t.isDemo || false,
      owners: t.owners || [t.ownerId],
    }));
  }

  public async resetDemoData(companyId: string, mode: BusinessMode) {
    logger.warn('auth', 'Iniciando reset de dados demo', { companyId });
    await SimulationEngine.clearSimulationData(companyId);
    await SimulationEngine.bootstrapFullSimulation(companyId, 'main-shop', mode);
  }

  public async cloneExistingShop(
    enterpriseId: string, 
    sourceShopId: string, 
    name: string, 
    location: string,
    options?: CloneOptions
  ) {
    return ShopCloneEngine.cloneShop(enterpriseId, sourceShopId, { name, location } as any, options);
  }

  public async initiateStockTransfer(
    sourceShopId: string, 
    destinationShopId: string, 
    items: TransferItem[],
    notes?: string
  ) {
    const user = this.getCurrentUser();
    const companyId = this.getCurrentCompanyId();
    if (!user || !companyId) throw new Error('Sessão inválida');
    
    return StockTransferEngine.initiateTransfer({
      enterpriseId: companyId,
      sourceShopId,
      destinationShopId,
      items,
      userId: user.id,
      userName: user.name,
      notes
    });
  }

  public async getShopsByCompany(companyId: string): Promise<Shop[]> {
    const shops = await firebaseService.getAllDocs('shops');
    return (shops as Shop[]).filter(s => s.enterpriseId === companyId);
  }

  public async getCompanyMetrics(companyId: string) {
    // Otimização: Busca apenas pedidos concluídos de hoje para métricas de performance
    const startOfToday = new Date().setHours(0,0,0,0);
    const companyOrders = await firebaseService.getDocsByQuery('orders', [
      { field: 'enterpriseId', op: '==', value: companyId },
      { field: 'status', op: '==', value: 'delivered' },
      { field: 'closedAt', op: '>=', value: startOfToday }
    ]) as Order[];

    // Busca o staff filtrando apenas por enterpriseId (Global HR)
    const staffDocs = await firebaseService.getAllDocs('staff', companyId, null);
    
    const companyStaffCount = staffDocs.length;
    const totalPayroll = (staffDocs as Staff[]).reduce((acc, s) => acc + (s.salary || 0), 0);
    
    const dailyRevenue = companyOrders.reduce((acc, o) => acc + (o.status === 'delivered' ? o.total : 0), 0);
    const activeOrders = companyOrders.filter(o => o.status === 'preparing' || o.status === 'pending').length;
    const healthScore = 100; 
    
    return {
      dailyRevenue,
      activeOrders,
      healthScore,
      staffCount: companyStaffCount,
      totalPayroll,
      lastSync: new Date().toISOString()
    };
  }

  public async getCompanyById(id: string): Promise<Company | null> {
    const tenant = await authService.getTenantById(id);
    if (!tenant) return null;

    const countryCode = (tenant as any).countryCode as CountryCode || 'BR';
    localeEngine.setCountry(countryCode);

    // Configuração de Localização Dinâmica baseada na Web Audit
    const regionalProfiles: Record<string, any> = {
      'BR': { currency: 'BRL', taxLabel: 'Impostos', idLabel: 'CPF', dateFormat: 'dd/MM/yyyy' },
      'PT': { currency: 'EUR', taxLabel: 'IVA', idLabel: 'NIF', dateFormat: 'dd/MM/yyyy' },
      'US': { currency: 'USD', taxLabel: 'Sales Tax', idLabel: 'SSN', dateFormat: 'MM/dd/yyyy' },
      'UK': { currency: 'GBP', taxLabel: 'VAT', idLabel: 'NI Number', dateFormat: 'dd/MM/yyyy' }
    };

    const profile = regionalProfiles[countryCode] || regionalProfiles['BR'];
    
    // Atualiza o motor de localização com os novos rótulos
    localeEngine.settings = {
      ...localeEngine.settings,
      currencySymbol: profile.currency === 'EUR' ? '€' : profile.currency === 'GBP' ? '£' : '$',
      taxLabel: profile.taxLabel,
      identityLabel: profile.idLabel
    };

    return {
      id: tenant.id,
      name: tenant.name,
      ownerId: tenant.ownerId,
      businessType: tenant.businessType,
      ownerEmail: tenant.ownerEmail,
      ownerName: tenant.ownerName,
      ownerPhone: tenant.ownerPhone,
      accessCode: tenant.accessCode,
      status: tenant.status,
      createdAt: tenant.createdAt,
      lockedModules: tenant.lockedModules,
      enabledModules: tenant.enabledModules,
      isPaused: tenant.isPaused,
      owners: [tenant.ownerId],
      suspensionReason: (tenant as any).suspensionReason,
    };
  }

  /**
   * Bloqueio Administrativo por violação de termos (Revenda/Cópia)
   * Apenas acessível por contas de desenvolvedor master definidas nas regras.
   */
  public async suspendCompany(companyId: string, reason: string) {
    const user = this.getCurrentUser();
    if (user?.role !== 'dev') throw new Error('Acesso negado.');

    await authService.updateTenant(companyId, { 
      status: 'suspended',
      suspensionReason: reason,
      isPaused: true 
    });
    
    logger.error('auth', 'EMPRESA SUSPENSA POR VIOLAÇÃO', { companyId, reason });
  }

  /**
   * Reporta uma atividade suspeita ou violação para revisão do desenvolvedor.
   * NUNCA bloqueia a conta automaticamente.
   */
  public async reportViolationToDev(companyId: string, type: 'LICENSE_EXPIRED' | 'FRAUD_DETECTION' | 'UNAUTHORIZED_RESALE', details: string) {
    const timestamp = Date.now();
    logger.warn('auth', `ALERTA DE VIOLAÇÃO: ${type}`, { companyId, details });

    await CommunicationEngine.sendMessage({
      companyId,
      enterpriseId: companyId,
      userId: 'dev_team_id', // ID do usuário da equipe de desenvolvimento
      title: `ALERTA DE VIOLAÇÃO: ${type}`,
      content: details,
      type: 'critical'
    });
  }

  public async toggleMaintenance(companyId: string, enabled: boolean) {
    await authService.updateTenant(companyId, { status: enabled ? 'maintenance' : 'active' });
    if (enabled) {
      this.createDevNotification(
        companyId,
        'Manutenção Iniciada',
        'Sua conta está sob manutenção pelo desenvolvedor e será atualizada em breve.'
      );
    }
  }

  /**
   * Salva as permissões de um cargo validando regras de hierarquia de poder.
   */
  public async saveRolePermissions(roleData: RolePermissions) {
    // Regra de Segurança: canManageStaff (Gerenciar RH) exige nível Gerente ou Líder Autorizado
    if (roleData.actions.canManageStaff) {
      const rolePower = ROLE_HIERARCHY[roleData.role] || 1; // Default 1 (Staff)
      const isAuthorizedLeader = roleData.label.toLowerCase().includes('líder') || roleData.label.toLowerCase().includes('leader');

      if (rolePower < 2 && !isAuthorizedLeader) {
        logger.error('security', 'Tentativa de delegação de RH não autorizada', { role: roleData.role });
        throw new Error('Operação bloqueada: A permissão "Gerenciar RH" só pode ser delegada a cargos de nível Gerente ou superior, ou líderes explicitamente autorizados.');
      }
      
      logger.warn('security', 'Poder administrativo delegado com sucesso', { target: roleData.label });
    }

    return firebaseService.saveItem('rolePermissions', roleData.role, roleData);
  }

  public async toggleModuleLock(companyId: string, moduleId: string, locked: boolean) {
    const company = await this.getCompanyById(companyId);
    if (!company) return;
    const currentLocked = company.lockedModules || [];
    const nextLocked = locked
      ? Array.from(new Set([...currentLocked, moduleId]))
      : currentLocked.filter((m) => m !== moduleId);

    // Auditoria: Impede o bloqueio de módulos CORE
    if (['hr_core', 'store_mgmt_core', 'settings_custom_core'].includes(moduleId) && locked) {
      throw new Error('Módulos fundamentais de gestão não podem ser bloqueados.');
    }

    await authService.updateTenant(companyId, { lockedModules: nextLocked });
  }

  public async setEnabledModules(companyId: string, modules: string[]) {
    // Garante que módulos CORE permaneçam habilitados
    const finalModules = Array.from(new Set([...modules, 'hr_core', 'store_mgmt_core', 'settings_custom_core']));
    await authService.updateTenant(companyId, { enabledModules: finalModules });
  }

  /**
   * Retorna o papel de infraestrutura deste dispositivo na rede local.
   */
  public getDeviceRole(): 'host' | 'co-host' | 'none' {
    const role = localStorage.getItem('pos_device_role');
    if (role === 'host') return 'host';
    if (role === 'co-host') return 'co-host';
    return 'none';
  }

  /**
   * Verifica se este hardware específico é um Servidor (Host ou Co-Host)
   */
  public isLocalServer(): boolean {
    const role = this.getDeviceRole();
    return role === 'host' || role === 'co-host';
  }

  /**
   * Atualiza o papel de infraestrutura do dispositivo.
   * 'host' e 'co-host' mantêm a rede viva e sincronizam com a nuvem.
   */
  public async setDeviceInfrastructureRole(role: 'host' | 'co-host' | 'none'): Promise<void> {
    const companyId = this.getCurrentCompanyId();
    const tenant = await this.getCurrentTenant();

    if (role !== 'none' && companyId && tenant) {
      localStorage.setItem('pos_device_role', role);
      localStorage.setItem('pos_device_mode', 'central_server');
      localStorage.setItem('pos_business_mode', tenant.businessType);
      
      // Ativa o motor de sincronismo Cloud no mesh local
      meshNetwork.stopCloudSync(); // Garante que qualquer sync anterior seja parado
      
      const cloudConfig = tenant.cloudConfig || { provider: 'system', tier: 'free' };
      meshNetwork.startCloudSync(companyId, cloudConfig, tenant.autoCloudSwitchingEnabled); 
      meshNetwork.requestCloudSync(companyId, true); // Request an immediate, forced sync
    } else {
      localStorage.removeItem('pos_device_role');
      localStorage.removeItem('pos_device_mode');
      meshNetwork.stopCloudSync();
    }
  }

  /**
   * Atualiza as preferências de Backup em Nuvem da empresa.
   */
  public async updateBackupSettings(companyId: string, enabled: boolean, intervalMinutes: number = 10) {
    await authService.updateTenant(companyId, { 
      googleDriveBackupEnabled: enabled,
      backupIntervalMinutes: intervalMinutes 
    });
    logger.info('auth', `Backup G-Drive: ${enabled ? 'ON' : 'OFF'} | Intervalo: ${intervalMinutes}min`);
  }

  /**
   * Promove o dispositivo atual de Co-Host para Host (Failover)
   */
  public async promoteToTemporaryHost() {
    localStorage.setItem('pos_device_role', 'host');
    localStorage.setItem('pos_failover_active', 'true');
    logger.warn('system', 'Dispositivo promovido a HOST temporário por falha de redundância.');
  }

  /**
   * Reverte o dispositivo de Host temporário de volta para Co-Host (Protocolo de Reversão)
   */
  public async revertToCoHost() {
    localStorage.setItem('pos_device_role', 'co-host');
    localStorage.removeItem('pos_failover_active');
    logger.info('system', 'Protocolo de Reversão: Retornando ao papel de Co-Host.');
  }

  /**
   * Atualiza a identidade visual da empresa (White-label).
   */
  public async updateCompanyBranding(companyId: string, branding: { 
    logo?: string, 
    customName?: string,
    dailyNotice?: string, // Requisito 1: Recado do Dia
    themeMode?: 'standard' | 'festive' | 'dark_neon', // Requisito 2: Modo Festivo
    receiptPhrases?: string[] // Requisito 4: Frases na Nota
  }) {
    const tenant = await this.getCurrentTenant();
    await authService.updateTenant(companyId, { branding: { ...(tenant?.branding || {}), ...branding } });
    logger.info('settings', 'Identidade visual da empresa atualizada');
  }

  /**
   * Altera a política de venda com estoque zero.
   */
  public async updateStockPolicy(companyId: string, blockOnZero: boolean) {
    await authService.updateTenant(companyId, { blockOnZeroStock: blockOnZero });
    logger.info('inventory', `Política de estoque atualizada: Bloquear em Zero = ${blockOnZero}`);
  }

  public getCloudConfig(): CloudConfig {
    const tenant = authService.getCurrentTenant();
    return tenant?.cloudConfig || { provider: 'system', tier: 'free' };
  }

  public getAutoCloudSwitchingPreference(): boolean {
    const tenant = authService.getCurrentTenant();
    return tenant?.autoCloudSwitchingEnabled || false;
  }

  /**
   * Atualiza as chaves de infraestrutura de nuvem privada.
   */
  public async updateCloudInfrastructure(companyId: string, config: {
    provider: 'system' | 'custom_firestore';
    tier: 'free' | 'turbo';
    customConfig?: { projectId: string; apiKey: string };
    autoSwitchEnabled?: boolean; // Nova opção
  }) {
    await authService.updateTenant(companyId, { 
      cloudConfig: config,
      // Se mudar para Turbo ou Custom, resetamos ou ignoramos a contagem de unidades mensais
      monthlyUnitsLimit: config.provider === 'system' ? 400 : 999999,
      autoCloudSwitchingEnabled: config.autoSwitchEnabled ?? this.getAutoCloudSwitchingPreference()
    });
    
    logger.info('system', 'Configuração de infraestrutura de nuvem atualizada', { provider: config.provider });
  }

  /**
   * Reverte forçadamente para a nuvem padrão do sistema em caso de emergência.
   */
  public async revertToDefaultCloud(companyId: string) {
    await authService.updateTenant(companyId, { 
      cloudConfig: { provider: 'system', tier: 'free' },
      monthlyUnitsLimit: 400
    });
    
    logger.error('system', 'REVERT_TO_DEFAULT_CLOUD: Infraestrutura restaurada para o padrão do sistema.');
    // Força o reinício do motor P2P com as novas credenciais
    meshNetwork.stopCloudSync(); // Para e reinicia para pegar a nova config
    meshNetwork.startCloudSync(companyId);
  }

  /**
   * Orquestra a restauração do sistema a partir de um JSON bruto.
   */
  public async performSystemRestore(fileContent: string): Promise<boolean> {
    const companyId = this.getCurrentCompanyId();
    if (!companyId) throw new Error('Empresa não identificada.');

    const data = JSON.parse(fileContent);
    const success = await BackupEngine.restoreFromCloud(companyId, data);
    if (success) window.location.reload(); // Força recarga para atualizar estados locais
    return success;
  }

  private createDevNotification(companyId: string, title: string, message: string) {
    const notifications = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      type: 'maintenance',
      companyId,
    };
    notifications.push(newNotif);
    localStorage.setItem('pos_notifications', JSON.stringify(notifications));
  }

  public getNotifications(companyId: string) {
    const all = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    return all.filter((n: any) => n.companyId === companyId);
  }

  public async loginAsManager(companyId: string) {
    const user = this.getCurrentUser();

    // Fase 10: Hardening - Impede impersonação se o usuário logado não for DEV ou OWNER
    if (!user || (user.role !== 'dev' && user.role !== 'owner')) {
      logger.error('auth', 'Tentativa de impersonação não autorizada detectada', { userId: user?.id });
      throw new Error('Ação não permitida para o seu nível de acesso.');
    }

    const ok = await authService.impersonateTenant(companyId);
    if (!ok) {
      logger.error('auth', 'Falha na impersonação de gerente', { companyId });
      throw new Error('Falha ao abrir sessão de impersonação para esta empresa.');
    }
    
    const tenant = await authService.getTenantById(companyId);
    if (user?.role === 'dev') {
       logger.warn('auth', 'Acesso de manutenção (Manager Mode)', { companyId });
       void firebaseService.addAuditLog({ enterpriseId: companyId, shopId: 'global', staffId: user.id, staffName: user.name, action: 'DEV_MAINTENANCE_ACCESS', details: `Manutenção ativa via Manager Mode` });
    }

    localStorage.setItem('pos_business_mode', tenant?.businessType || 'restaurant');
    window.location.reload();
  }

  public async sendSupportMessage(message: string) {
    const user = this.getCurrentUser();
    if (!user) return;
    const msg = {
      companyId: user.companyId || '',
      message,
      timestamp: Date.now(),
      status: 'open',
      userName: user.name,
      userEmail: user.email
    };
    await firebaseService.addItem('support_messages', msg);
  }

  public async replyToSupportMessage(messageId: string, reply: string) {
    const user = this.getCurrentUser();
    if (user?.role !== 'dev') throw new Error('Acesso negado.');

    await firebaseService.updateItem('support_messages', messageId, {
      reply,
      repliedAt: Date.now(),
      repliedBy: user.name,
      status: 'resolved'
    });
  }

  public async getAllSupportMessages() {
    // Como dev, buscamos da coleção centralizada no Firebase em vez do localStorage
    return firebaseService.getAllDocs('support_messages');
  }

  public getSupportMessages(): SupportMessage[] {
    return JSON.parse(localStorage.getItem('pos_support_messages') || '[]');
  }

  public async pauseSystem(companyId: string, pin: string): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user || (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'dev')) return false;

    const company = await this.getCompanyById(companyId);
    if (!company) return false;

    // Lógica: Valida o PIN contra o accessCode da empresa para autorizar pausa global
    if (pin !== company.accessCode) return false;

    const nextPaused = !Boolean(company.isPaused);
    await authService.updateTenant(companyId, { isPaused: nextPaused });
    meshNetwork.broadcast('system:pause_state', { companyId, isPaused: nextPaused });
    return true;
  }

  public async logoutCompany() {
    const user = this.getCurrentUser();
    if (!user || (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'dev')) {
      throw new Error('Apenas o Dono ou Gerente pode desconectar a empresa deste terminal.');
    }

    authService.logout();
    localStorage.removeItem('pos_device_mode');
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_business_mode');
    localStorage.removeItem('pos_sync_mode');
    localStorage.removeItem('rm_selected_shop_id');
    window.location.reload();
  }

  public async getCompanyPauseStatus(companyId: string): Promise<boolean> {
    const company = await this.getCompanyById(companyId);
    return Boolean(company?.isPaused);
  }

  public async migrateRestaurantUsers(
    tenantId: string,
    legacyStaff: Array<{ id: string; name: string; role?: string; pin?: string; email?: string }>
  ): Promise<number> {
    return authService.migrateRestaurantUsers(tenantId, legacyStaff);
  }
}

export const accountService = new AccountService();
