import type { AuthPermission, AuthRole, AuthSession } from './authTypes';
import { sessionManager } from './sessionManager';

const ROLE_PERMISSIONS: Record<AuthRole, AuthPermission[]> = {
  dev: ['dev.global_admin'],
  owner: [
    'tenant.manage_modules',
    'staff.create',
    'staff.update',
    'staff.assign_role',
    'sales.read',
    'sales.write',
    'inventory.read',
    'inventory.write',
    'reports.read',
    'settings.read',
    'settings.write',
  ],
  manager: [
    'staff.create',
    'staff.update',
    'sales.read',
    'sales.write',
    'inventory.read',
    'inventory.write',
    'reports.read',
    'settings.read',
  ],
  staff: ['sales.read', 'sales.write', 'inventory.read'],
};

export function permissionsForRole(role: AuthRole): AuthPermission[] {
  if (role === 'dev') {
    return [...new Set(Object.values(ROLE_PERMISSIONS).flat())];
  }
  return ROLE_PERMISSIONS[role] || [];
}

export function requireAuth(): AuthSession {
  const session = sessionManager.getSession();
  if (!session) {
    throw new Error('auth_required');
  }
  return session;
}

export function requireRole(role: AuthRole): AuthSession {
  const session = requireAuth();
  if (session.role !== 'dev' && session.role !== role) {
    throw new Error(`role_required:${role}`);
  }
  return session;
}

export function requirePermission(permission: AuthPermission): AuthSession {
  const session = requireAuth();
  if (session.role === 'dev') {
    return session;
  }
  const allowed = permissionsForRole(session.role);
  if (!allowed.includes(permission)) {
    throw new Error(`permission_required:${permission}`);
  }
  return session;
}

export function canAccessTenant(targetTenantId: string): boolean {
  const session = sessionManager.getSession();
  if (!session) return false;
  if (session.role === 'dev') return true;
  return session.tenantId === targetTenantId;
}

