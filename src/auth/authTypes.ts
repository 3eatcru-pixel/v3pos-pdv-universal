import type { BusinessMode } from '../types';

export type AuthRole = 'dev' | 'owner' | 'manager' | 'staff';

export type AuthPermission =
  | 'tenant.create_owner'
  | 'tenant.manage_modules'
  | 'staff.create'
  | 'staff.update'
  | 'staff.assign_role'
  | 'sales.read'
  | 'sales.write'
  | 'inventory.read'
  | 'inventory.write'
  | 'reports.read'
  | 'settings.read'
  | 'settings.write'
  | 'dev.global_admin';

export interface AuthTenant {
  id: string;
  name: string;
  businessType: BusinessMode;
  ownerId: string;
  ownerEmail: string;
  ownerName?: string;
  ownerPhone?: string;
  accessCode: string;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: number;
  lockedModules?: string[];
  enabledModules?: string[];
  isPaused?: boolean;
}

export interface AuthUser {
  id: string;
  tenantId: string | null;
  role: AuthRole;
  name: string;
  email?: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  pin?: string;
  pinHash?: string;
  pinSalt?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AuthSession {
  userId: string;
  tenantId: string | null;
  role: AuthRole;
  createdAt: number;
  lastSeenAt: number;
}

export interface AuthState {
  tenants: AuthTenant[];
  users: AuthUser[];
}

export interface CreateOwnerTenantInput {
  name: string;
  businessType: BusinessMode;
  ownerEmail: string;
  ownerName: string;
  ownerPhone?: string;
  enabledModules?: string[];
}

export interface CreateOwnerUserInput {
  password: string;
  pin?: string;
}

export interface CreateStaffInput {
  tenantId: string;
  name: string;
  email?: string;
  password?: string;
  pin?: string;
  role: Exclude<AuthRole, 'dev' | 'owner'>;
}

