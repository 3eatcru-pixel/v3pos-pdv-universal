import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, setDoc, query, where, getDoc, limit } from 'firebase/firestore';
import type {
  AuthRole,
  AuthSession,
  AuthState,
  AuthTenant,
  AuthUser,
  CreateOwnerTenantInput,
  CreateOwnerUserInput,
  CreateStaffInput,
} from './authTypes';
import { requirePermission, canAccessTenant } from './accessControl';
import { sessionManager } from './sessionManager';

const AUTH_STATE_KEY = 'pos_auth_state_v1';

function generateNumericId(length: number = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

class AuthService {
  constructor() {}

  private startSession(user: AuthUser): AuthSession {
    const session: AuthSession = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    sessionManager.setSession(session, user);
    return session;
  }

  getCurrentSession(): AuthSession | null {
    return sessionManager.touchSession() || sessionManager.getSession();
  }

  getCurrentUser(): AuthUser | null {
    const session = sessionManager.getSession();
    if (!session) return null;
    
    // Try to restore from legacy mirror which sessionManager maintains
    const raw = localStorage.getItem('pos_current_user');
    if (raw) {
      try {
        const legacy = JSON.parse(raw);
        return {
          id: legacy.id,
          tenantId: legacy.companyId,
          role: legacy.role,
          name: legacy.name,
          email: legacy.email,
          pin: legacy.pin,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as AuthUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async getCurrentTenant(): Promise<AuthTenant | null> {
    const session = sessionManager.getSession();
    if (!session?.tenantId) return null;
    return this.getTenantById(session.tenantId);
  }

  logout(): void {
    sessionManager.clearSession();
  }

  async loginAsDev(email: string, password?: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    
    // Check Firestore for Devs
    const q = query(
      collection(db, 'staff'),
      where('role', '==', 'dev'),
      where('email', '==', normalized)
    );
    const snap = await getDocs(q);
    
    let userDoc = snap.docs[0];
    
    // Hardcoded Dev bypass for master admin or if not found in db (for initial setup)
    if (normalized === 'admin@pos.com' && (!password || password === 'dev123')) {
       const user: AuthUser = {
         id: 'dev_master',
         tenantId: null,
         role: 'dev',
         name: 'Developer Global',
         email: 'admin@pos.com',
         active: true,
         createdAt: Date.now(),
         updatedAt: Date.now()
       };
       this.startSession(user);
       return true;
    }

    if (snap.empty) return false;
    const data = userDoc.data();
    if (data.password && password && data.password !== password) return false;

    this.startSession({
      id: userDoc.id,
      tenantId: null,
      role: 'dev',
      name: data.name,
      email: data.email,
      password: data.password,
      active: data.active,
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now()
    });
    return true;
  }

  async impersonateTenant(tenantId: string): Promise<boolean> {
    requirePermission('dev.global_admin');
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) return false;

    // Fetch from staff collection
    const q = query(
      collection(db, 'staff'),
      where('enterpriseId', '==', tenantId),
      where('role', '==', 'owner'),
      limit(1)
    );
    const snap = await getDocs(q);
    const owner = !snap.empty ? snap.docs[0].data() : null;

    if (owner) {
      this.startSession({
        id: snap.docs[0].id,
        tenantId,
        role: owner.role,
        name: owner.name,
        email: owner.email,
        password: owner.password,
        pin: owner.pin,
        active: owner.active,
        createdAt: owner.createdAt || Date.now(),
        updatedAt: owner.updatedAt || Date.now(),
      });
      return true;
    }

    // Fallback: Create a virtual session
    const virtualUser: AuthUser = {
      id: `virtual_${Date.now()}`,
      tenantId,
      role: 'owner',
      name: 'System Override (Dev)',
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.startSession(virtualUser);
    return true;
  }

  async loginWithCredentials(email: string, password: string, tenantId?: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    
    try {
      const q = query(
        collection(db, 'staff'),
        where('email', '==', normalized),
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      const userDoc = snapshot.docs.find(d => {
        const data = d.data();
        if (tenantId && data.enterpriseId !== tenantId) return false;
        return data.password === password;
      });

      if (!userDoc) return false;
      
      const data = userDoc.data();
      const user: AuthUser = {
        id: userDoc.id,
        tenantId: data.enterpriseId || data.companyId || null,
        role: data.role,
        name: data.name,
        email: data.email,
        password: data.password,
        pin: data.pin,
        active: data.active,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
      };

      this.startSession(user);
      return true;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  }

  async loginWithPIN(pin: string, tenantId: string): Promise<boolean> {
    const sanitized = pin.replace(/\D/g, '');
    try {
      const q = query(
        collection(db, 'staff'),
        where('enterpriseId', '==', tenantId),
        where('pin', '==', sanitized),
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return false;

      const userDoc = snapshot.docs[0];
      const data = userDoc.data();
      const user: AuthUser = {
        id: userDoc.id,
        tenantId: data.enterpriseId || data.companyId || null,
        role: data.role,
        name: data.name,
        email: data.email,
        password: data.password,
        pin: data.pin,
        active: data.active,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
      };

      this.startSession(user);
      return true;
    } catch (err) {
      console.error("PIN Login failed:", err);
      return false;
    }
  }

  async createOwner(tenantData: CreateOwnerTenantInput, ownerData: CreateOwnerUserInput): Promise<{ tenant: AuthTenant; owner: AuthUser }> {
    requirePermission('tenant.create_owner');

    const now = Date.now();
    const tenantId = generateNumericId(8); // Simple unique ID
    const ownerId = `owner_${Date.now()}`;

    const tenant: AuthTenant = {
      id: tenantId,
      name: tenantData.name,
      businessType: tenantData.businessType,
      ownerId,
      ownerEmail: tenantData.ownerEmail,
      ownerName: tenantData.ownerName,
      ownerPhone: tenantData.ownerPhone,
      accessCode: Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'active',
      createdAt: now,
      enabledModules: tenantData.enabledModules || [tenantData.businessType],
      lockedModules: [],
      isPaused: false,
    };

    const owner: AuthUser = {
      id: ownerId,
      tenantId,
      role: 'owner',
      name: tenantData.ownerName,
      email: tenantData.ownerEmail,
      password: ownerData.password,
      pin: ownerData.pin?.replace(/\D/g, ''),
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'enterprises', tenantId), tenant);
    await setDoc(doc(db, 'staff', ownerId), {
      ...owner,
      enterpriseId: tenantId, // Map to firestore field
    });
    
    return { tenant, owner };
  }

  async createStaff(input: CreateStaffInput): Promise<AuthUser> {
    const session = requirePermission('staff.create');
    if (session.role !== 'dev' && session.tenantId !== input.tenantId) {
      throw new Error('tenant_forbidden');
    }

    const now = Date.now();
    const id = `staff_${Date.now()}`;
    const user: AuthUser = {
      id,
      tenantId: input.tenantId,
      role: input.role,
      name: input.name,
      email: input.email?.toLowerCase(),
      password: input.password,
      pin: input.pin?.replace(/\D/g, ''),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(doc(db, 'staff', id), {
      ...user,
      enterpriseId: input.tenantId
    });
    
    return user;
  }

  async updateStaff(userId: string, patch: Partial<Pick<AuthUser, 'name' | 'email' | 'pin' | 'password' | 'active'>>): Promise<void> {
    requirePermission('staff.update');
    const docRef = doc(db, 'staff', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('staff_not_found');
    
    const data = snap.data();
    if (data.role === 'dev' || data.role === 'owner') {
      throw new Error('staff_update_forbidden');
    }

    const updates: any = { ...patch, updatedAt: Date.now() };
    if (patch.email) updates.email = patch.email.toLowerCase();
    if (patch.pin) updates.pin = patch.pin.replace(/\D/g, '');
    
    await updateDoc(docRef, updates);
  }

  async assignRole(userId: string, role: Exclude<AuthRole, 'dev' | 'owner'>): Promise<void> {
    requirePermission('staff.assign_role');
    const docRef = doc(db, 'staff', userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('staff_not_found');
    
    const data = snap.data();
    if (data.role === 'dev' || data.role === 'owner') {
      throw new Error('role_assignment_forbidden');
    }
    
    await updateDoc(docRef, { role, updatedAt: Date.now() });
  }

  async getTenantById(tenantId: string): Promise<AuthTenant | null> {
    try {
      const docRef = doc(db, 'enterprises', tenantId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data.name,
        businessType: data.businessType,
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail,
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        accessCode: data.accessCode,
        status: data.status,
        createdAt: data.createdAt,
        enabledModules: data.enabledModules,
        lockedModules: data.lockedModules,
        isPaused: data.isPaused,
      } as AuthTenant;
    } catch (err) {
      console.error("Error fetching tenant:", err);
      return null;
    }
  }

  async listTenants(): Promise<AuthTenant[]> {
    try {
      const snapshot = await getDocs(collection(db, 'enterprises'));
      return snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          businessType: data.businessType,
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          ownerName: data.ownerName,
          ownerPhone: data.ownerPhone,
          accessCode: data.accessCode,
          status: data.status,
          createdAt: data.createdAt,
          enabledModules: data.enabledModules,
          lockedModules: data.lockedModules,
          isPaused: data.isPaused,
        } as AuthTenant;
      });
    } catch (err) {
      console.error("Error listing tenants:", err);
      return [];
    }
  }

  async getUsersByTenant(tenantId: string): Promise<AuthUser[]> {
    try {
      const q = query(
        collection(db, 'staff'),
        where('enterpriseId', '==', tenantId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          tenantId: data.enterpriseId || data.companyId || null,
          role: data.role,
          name: data.name,
          email: data.email,
          password: data.password,
          pin: data.pin,
          active: data.active,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
        };
      });
    } catch (err) {
      console.error("Error fetching users by tenant:", err);
      return [];
    }
  }

  async updateTenant(tenantId: string, patch: Partial<AuthTenant>): Promise<void> {
    const session = requirePermission('tenant.manage_modules');
    if (session.role !== 'dev' && !canAccessTenant(tenantId)) {
      throw new Error('tenant_forbidden');
    }
    const docRef = doc(db, 'enterprises', tenantId);
    await updateDoc(docRef, patch as any);
  }

  async migrateRestaurantUsers(tenantId: string, legacyStaff: Array<{ id: string; name: string; role?: string; pin?: string; email?: string }>): Promise<number> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) return 0;

    let migrated = 0;
    const now = Date.now();
    for (const legacy of legacyStaff) {
      if (!legacy.email) continue;
      
      const q = query(
        collection(db, 'staff'),
        where('enterpriseId', '==', tenantId),
        where('email', '==', legacy.email.toLowerCase()),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) continue;

      const id = legacy.id || `staff_${Date.now()}_${migrated}`;
      const mappedRole: AuthRole = legacy.role === 'owner' ? 'owner' : legacy.role?.includes('manager') ? 'manager' : 'staff';
      
      const user: AuthUser = {
        id,
        tenantId,
        role: mappedRole,
        name: legacy.name || 'Staff',
        email: legacy.email.toLowerCase(),
        pin: legacy.pin?.replace(/\D/g, ''),
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'staff', id), {
        ...user,
        enterpriseId: tenantId
      });
      migrated += 1;
    }

    return migrated;
  }
}

export const authService = new AuthService();

