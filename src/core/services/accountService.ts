import { Company, SupportMessage, User, BusinessMode, Shop } from '../types';
export type { Company, SupportMessage, User, BusinessMode, Shop };
import { Order } from '../../types';
import { meshNetwork } from '../../services/p2pSync';
import { format } from 'date-fns';
import { authService } from '../../auth/authService'; // Moved up for consistency
import { localeEngine, CountryCode } from './LocaleEngine';
import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

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

  public async registerCompany(
    name: string,
    ownerEmail: string,
    businessType: BusinessMode,
    ownerName?: string,
    ownerPhone?: string,
    enabledModules?: string[]
  ): Promise<Company & { credentials: { password: string; pin: string } }> {
    const ownerPassword = Math.random().toString(36).slice(2, 10);
    const ownerPin = Math.floor(1000 + Math.random() * 9000).toString();

    const created = await authService.createOwner(
      {
        name,
        businessType,
        ownerEmail,
        ownerName: ownerName || 'Proprietário',
        ownerPhone,
        enabledModules: enabledModules || [businessType],
      },
      {
        password: ownerPassword,
        pin: ownerPin,
      }
    );

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

    const tempPin = Math.floor(1000 + Math.random() * 9000).toString();
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
    return authService.loginAsDev(email, password);
  }

  public async loginWithDevBootstrap(code: string): Promise<boolean> {
    return authService.loginWithDevBootstrap(code);
  }

  public async loginAsMasterDev(): Promise<boolean> {
    return false;
  }

  public async loginAsServer(accessCode: string): Promise<boolean> {
    const tenants = await authService.listTenants();
    const tenant = tenants.find((t) => t.accessCode === accessCode && t.status === 'active');
    if (!tenant) return false;

    const success = await authService.loginAsServerNode(tenant.id, tenant.name);
    if (!success) return false;

    localStorage.setItem('pos_device_role', 'host');
    localStorage.setItem('pos_device_mode', 'central_server');
    localStorage.setItem('pos_business_mode', tenant.businessType);
    localStorage.setItem('rm_enterprise_id', tenant.id);
    return true;
  }

  public logout() {
    authService.logout();
    localStorage.removeItem('pos_business_mode');
    localStorage.removeItem('pos_device_role');
    localStorage.removeItem('pos_device_mode');
    localStorage.removeItem('rm_selected_shop_id');
    window.location.reload();
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
      owners: t.owners || [t.ownerId],
    }));
  }

  public async getShopsByCompany(companyId: string): Promise<Shop[]> {
    const shops = await firebaseService.getAllDocs('shops');
    return (shops as Shop[]).filter(s => s.enterpriseId === companyId);
  }

  public async getCompanyMetrics(companyId: string) {
    // Otimização: No futuro, substituir por queries indexadas no banco
    const companyOrders = (await firebaseService.getAllDocs('orders', companyId)) as Order[];
    const staffDocs = await firebaseService.getAllDocs('staff', companyId);
    
    const companyStaffCount = staffDocs.length;
    
    const dailyRevenue = companyOrders.reduce((acc, o) => acc + (o.status === 'delivered' ? o.total : 0), 0);
    const activeOrders = companyOrders.filter(o => o.status === 'preparing' || o.status === 'pending').length;
    const healthScore = 100; 
    
    return {
      dailyRevenue,
      activeOrders,
      healthScore,
      staffCount: companyStaffCount,
      lastSync: new Date().toISOString()
    };
  }

  public async getCompanyById(id: string): Promise<Company | null> {
    const tenant = await authService.getTenantById(id);
    if (!tenant) return null;

    // Regionalização: Define o país no motor de localização baseado no cadastro da empresa
    const countryCode = (tenant as any).countryCode as CountryCode || 'BR';
    localeEngine.setCountry(countryCode);

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

    await firebaseService.addItem('dev_alerts', {
      companyId,
      type,
      details,
      timestamp,
      status: 'pending_review',
      priority: 'high'
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

  public async toggleModuleLock(companyId: string, moduleId: string, locked: boolean) {
    const company = await this.getCompanyById(companyId);
    if (!company) return;
    const currentLocked = company.lockedModules || [];
    const nextLocked = locked
      ? Array.from(new Set([...currentLocked, moduleId]))
      : currentLocked.filter((m) => m !== moduleId);
    await authService.updateTenant(companyId, { lockedModules: nextLocked });
  }

  public async setEnabledModules(companyId: string, modules: string[]) {
    await authService.updateTenant(companyId, { enabledModules: modules });
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
