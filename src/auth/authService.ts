import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, setDoc, query, where, getDoc, limit, deleteField } from 'firebase/firestore';
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
const CREDENTIAL_HASH_PREFIX = 'pbkdf2$';
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEY_LENGTH = 32;

function generateNumericId(length: number = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function removeUndefinedFields<T extends Record<string, any>>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as T;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(secret: string, saltBase64: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('crypto_subtle_unavailable');
  }

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: base64ToBytes(saltBase64),
      iterations: PBKDF2_ITERATIONS,
    },
    secretKey,
    PBKDF2_KEY_LENGTH * 8,
  );

  return `${CREDENTIAL_HASH_PREFIX}${bytesToBase64(new Uint8Array(bits))}`;
}

async function createCredentialHash(secret: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToBase64(saltBytes);
  const hash = await pbkdf2(secret, salt);
  return { hash, salt };
}

async function verifyCredential(secret: string, hash?: string, salt?: string, legacyPlain?: string): Promise<boolean> {
  if (hash && salt) {
    const computed = await pbkdf2(secret, salt);
    return computed === hash;
  }
  return !!legacyPlain && legacyPlain === secret;
}

class AuthService {
  constructor() {}

  private getBootstrapCode(): string {
    const envCode = (import.meta as any)?.env?.VITE_DEV_BOOTSTRAP_CODE;
    return String(envCode || 'code-22').trim();
  }

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
    const user = sessionManager.getUser();
    if (!user) return null;
    return user;
  }

  getCurrentTenant(): AuthTenant | null {
    const session = sessionManager.getSession();
    if (!session?.tenantId) return null;
    return {
      id: session.tenantId,
      name: localStorage.getItem('rm_company_name') || 'Tenant',
      businessType: (localStorage.getItem('pos_business_mode') as any) || 'generic',
      ownerId: session.userId,
      ownerEmail: '',
      accessCode: '',
      status: 'active',
      createdAt: Date.now(),
      enabledModules: [],
    };
  }

  logout(): void {
    sessionManager.clearSession();
  }

  async loginAsDev(email: string, password?: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (!password) return false;
    
    // Check Firestore for Devs
    const q = query(
      collection(db, 'staff'),
      where('role', '==', 'dev'),
      where('email', '==', normalized)
    );
    const snap = await getDocs(q);
    
    let userDoc = snap.docs[0];

    if (snap.empty) return false;
    const data = userDoc.data();
    const validPassword = await verifyCredential(password, data.passwordHash, data.passwordSalt, data.password);
    if (!validPassword) return false;
    if (!data.passwordHash && data.password) {
      const { hash, salt } = await createCredentialHash(password);
      await updateDoc(doc(db, 'staff', userDoc.id), {
        passwordHash: hash,
        passwordSalt: salt,
        password: deleteField(),
        updatedAt: Date.now(),
      });
    }

    this.startSession({
      id: userDoc.id,
      tenantId: null,
      role: 'dev',
      name: data.name,
      email: data.email,
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
        passwordHash: owner.passwordHash,
        passwordSalt: owner.passwordSalt,
        pinHash: owner.pinHash,
        pinSalt: owner.pinSalt,
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

  async loginAsServerNode(tenantId: string, tenantName?: string): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) return false;

    const now = Date.now();
    const serverUser: AuthUser = {
      id: `server_${tenantId}`,
      tenantId,
      role: 'manager',
      name: tenantName ? `Servidor ${tenantName}` : 'Servidor Local',
      email: undefined,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.startSession(serverUser);
    return true;
  }

  async loginWithDevBootstrap(code: string): Promise<boolean> {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) return false;
    if (normalizedCode !== this.getBootstrapCode()) return false;

    const now = Date.now();
    const bootstrapDev: AuthUser = {
      id: `dev_bootstrap_${now}`,
      tenantId: null,
      role: 'dev',
      name: 'Developer Bootstrap',
      email: 'bootstrap@local.device',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.startSession(bootstrapDev);
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
      let userDoc = null as (typeof snapshot.docs[number] | null);
      for (const d of snapshot.docs) {
        const data = d.data();
        if (tenantId && data.enterpriseId !== tenantId) continue;
        const isValid = await verifyCredential(password, data.passwordHash, data.passwordSalt, data.password);
        if (isValid) {
          userDoc = d;
          break;
        }
      }

      if (!userDoc) return false;
      
      const data = userDoc.data();
      if (!data.passwordHash && data.password) {
        const { hash, salt } = await createCredentialHash(password);
        await updateDoc(doc(db, 'staff', userDoc.id), {
          passwordHash: hash,
          passwordSalt: salt,
          password: deleteField(),
          updatedAt: Date.now(),
        });
      }

      const user: AuthUser = {
        id: userDoc.id,
        tenantId: data.enterpriseId || data.companyId || null,
        role: data.role,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        passwordSalt: data.passwordSalt,
        pinHash: data.pinHash,
        pinSalt: data.pinSalt,
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
    if (sanitized.length < 4 || sanitized.length > 6) return false;
    try {
      const q = query(
        collection(db, 'staff'),
        where('enterpriseId', '==', tenantId),
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return false;

      let userDoc = null as (typeof snapshot.docs[number] | null);
      for (const d of snapshot.docs) {
        const data = d.data();
        const isValid = await verifyCredential(sanitized, data.pinHash, data.pinSalt, data.pin);
        if (isValid) {
          userDoc = d;
          break;
        }
      }
      if (!userDoc) return false;

      const data = userDoc.data();
      if (!data.pinHash && data.pin) {
        const { hash, salt } = await createCredentialHash(sanitized);
        await updateDoc(doc(db, 'staff', userDoc.id), {
          pinHash: hash,
          pinSalt: salt,
          pin: deleteField(),
          updatedAt: Date.now(),
        });
      }

      const user: AuthUser = {
        id: userDoc.id,
        tenantId: data.enterpriseId || data.companyId || null,
        role: data.role,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        passwordSalt: data.passwordSalt,
        pinHash: data.pinHash,
        pinSalt: data.pinSalt,
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

    const passwordHash = await createCredentialHash(ownerData.password);
    const sanitizedPin = ownerData.pin?.replace(/\D/g, '');
    const pinHash = sanitizedPin ? await createCredentialHash(sanitizedPin) : null;

    const owner: AuthUser = {
      id: ownerId,
      tenantId,
      role: 'owner',
      name: tenantData.ownerName,
      email: tenantData.ownerEmail,
      passwordHash: passwordHash.hash,
      passwordSalt: passwordHash.salt,
      pinHash: pinHash?.hash,
      pinSalt: pinHash?.salt,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'enterprises', tenantId), tenant);
    await setDoc(doc(db, 'staff', ownerId), removeUndefinedFields({
      ...owner,
      enterpriseId: tenantId, // Map to firestore field
    }));
    
    return { tenant, owner };
  }

  async createStaff(input: CreateStaffInput): Promise<AuthUser> {
    const session = requirePermission('staff.create');
    if (session.role !== 'dev' && session.tenantId !== input.tenantId) {
      throw new Error('tenant_forbidden');
    }

    const now = Date.now();
    const id = `staff_${Date.now()}`;
    const sanitizedPin = input.pin?.replace(/\D/g, '');
    const passwordHash = input.password ? await createCredentialHash(input.password) : null;
    const pinHash = sanitizedPin ? await createCredentialHash(sanitizedPin) : null;
    const user: AuthUser = {
      id,
      tenantId: input.tenantId,
      role: input.role,
      name: input.name,
      email: input.email?.toLowerCase(),
      passwordHash: passwordHash?.hash,
      passwordSalt: passwordHash?.salt,
      pinHash: pinHash?.hash,
      pinSalt: pinHash?.salt,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(doc(db, 'staff', id), removeUndefinedFields({
      ...user,
      enterpriseId: input.tenantId
    }));
    
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

    const updates: any = { updatedAt: Date.now() };
    if (typeof patch.name === 'string') updates.name = patch.name;
    if (typeof patch.active === 'boolean') updates.active = patch.active;
    if (patch.email) updates.email = patch.email.toLowerCase();
    if (patch.password) {
      const { hash, salt } = await createCredentialHash(patch.password);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
      updates.password = deleteField();
    }
    if (patch.pin) {
      const sanitized = patch.pin.replace(/\D/g, '');
      const { hash, salt } = await createCredentialHash(sanitized);
      updates.pinHash = hash;
      updates.pinSalt = salt;
      updates.pin = deleteField();
    }
    
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
          passwordHash: data.passwordHash,
          passwordSalt: data.passwordSalt,
          pinHash: data.pinHash,
          pinSalt: data.pinSalt,
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
        pin: undefined,
        pinHash: undefined,
        pinSalt: undefined,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      if (legacy.pin) {
        const sanitized = legacy.pin.replace(/\D/g, '');
        const { hash, salt } = await createCredentialHash(sanitized);
        user.pinHash = hash;
        user.pinSalt = salt;
      }

      await setDoc(doc(db, 'staff', id), removeUndefinedFields({
        ...user,
        enterpriseId: tenantId
      }));
      migrated += 1;
    }

    return migrated;
  }

  async linkGoogleProvider(): Promise<boolean> {
    // Compatibility stub: OAuth linking flow is not wired in this checkout.
    return false;
  }

  async signInWithGoogle(): Promise<boolean> {
    // Compatibility stub: OAuth sign-in flow is not wired in this checkout.
    return false;
  }
}

export const authService = new AuthService();

