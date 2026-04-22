import { Company, SupportMessage, User, BusinessMode, Shop } from '../types';
export type { Company, SupportMessage, User, BusinessMode, Shop };
import { Order } from '../../types';
import { meshNetwork } from '../../services/p2pSync';
import { authService } from '../../auth/authService';
import { MOCK_SHOPS } from '../../mockData';
import { firebaseService } from '../../services/firebaseService';

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
    const users = await authService.getUsersByTenant(company.id);
    const owner = users.find((u) => u.role === 'owner' && (u.email || '').toLowerCase() === company.ownerEmail.toLowerCase());
    if (!owner || !owner.password || !owner.email) return false;
    return authService.loginWithCredentials(owner.email, owner.password, company.id);
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
    return authService.loginAsDev(email, password);
  }

  public async loginAsMasterDev(): Promise<boolean> {
    return authService.loginAsDev('admin@pos.com', 'dev123');
  }

  public async loginAsServer(accessCode: string): Promise<boolean> {
    const tenants = await authService.listTenants();
    const tenant = tenants.find((t) => t.accessCode === accessCode && t.status === 'active');
    if (!tenant) return false;

    const success = authService.loginAsDev('admin@pos.com', 'dev123');
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

    const tenantUsers = await authService.getUsersByTenant(tenant.id);
    const owner = tenantUsers.find((u) => u.role === 'owner');
    if (!owner || !owner.email || !owner.password) {
      return;
    }

    await authService.loginWithCredentials(owner.email, owner.password, tenant.id);
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
    // In a production app, this would be an aggregate query in Firestore
    // For now, let's fetch orders and staff for this company to give semi-real data
    const orders = await firebaseService.getAllDocs('orders');
    const staff = await firebaseService.getAllDocs('staff');
    
    const companyOrders = (orders as Order[]).filter(o => o.enterpriseId === companyId);
    const companyStaffCount = (staff as any[]).filter(s => s.enterpriseId === companyId).length;
    
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
    };
  }

  public async toggleMaintenance(companyId: string, enabled: boolean) {
    authService.updateTenant(companyId, { status: enabled ? 'maintenance' : 'active' });
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
    // For a dev, we can impersonate the owner role for full access testing
    const ok = await authService.impersonateTenant(companyId);
    if (!ok) {
      throw new Error('Falha ao abrir sessão de impersonação para esta empresa.');
    }
    const tenant = await authService.getTenantById(companyId);
    localStorage.setItem('pos_business_mode', tenant?.businessType || 'restaurant');
    window.location.reload();
  }

  public async sendSupportMessage(message: string) {
    const user = this.getCurrentUser();
    if (!user) return;
    const msg: SupportMessage = {
      id: `msg-${Date.now()}`,
      companyId: user.companyId,
      message,
      timestamp: Date.now(),
      status: 'open',
    };
    const messages = JSON.parse(localStorage.getItem('pos_support_messages') || '[]');
    messages.push(msg);
    localStorage.setItem('pos_support_messages', JSON.stringify(messages));
  }

  public getSupportMessages(): SupportMessage[] {
    return JSON.parse(localStorage.getItem('pos_support_messages') || '[]');
  }

  public async pauseSystem(companyId: string, pin: string): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user || (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'dev')) return false;
    if (pin !== '1234') return false;

    const company = await this.getCompanyById(companyId);
    if (!company) return false;

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
