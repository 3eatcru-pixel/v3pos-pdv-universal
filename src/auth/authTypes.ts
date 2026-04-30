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
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  suspensionReason?: string;
  createdAt: number;
  lockedModules?: string[];
  enabledModules?: string[];
  availableModules?: string[];
  isPaused?: boolean;
  isDemo?: boolean;
  cloudConfig?: {
    provider: 'system' | 'custom_firestore';
    tier: 'free' | 'turbo';
    customConfig?: { projectId: string; apiKey: string };
  };
  autoCloudSwitchingEnabled?: boolean;
  googleDriveBackupEnabled?: boolean;
  backupIntervalMinutes?: number;
  monthlyUnitsLimit?: number;
  trainingModeEnabled?: boolean;
  blockOnZeroStock?: boolean;
  branding?: {
    logo?: string;
    customName?: string;
    dailyNotice?: string;
    themeMode?: 'standard' | 'festive' | 'dark_neon';
    receiptPhrases?: string[];
  };
  storageStrategy?: 'hybrid' | 'drive_only' | 'local_only';
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
  availableModules?: string[];
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

