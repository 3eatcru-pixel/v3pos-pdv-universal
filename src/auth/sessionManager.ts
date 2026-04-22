import type { AuthSession, AuthUser } from './authTypes';

const SESSION_KEY = 'pos_auth_session_v1';
const USER_KEY = 'pos_auth_user_v1';
const LEGACY_USER_KEY = 'pos_current_user';
const LEGACY_TENANT_KEY = 'rm_enterprise_id';

interface LegacyUser {
  id: string;
  name: string;
  role: string;
  email?: string;
  pin?: string;
  companyId: string;
}

class SessionManager {
  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }

  setSession(session: AuthSession, user: AuthUser | null): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    this.syncLegacyMirror(user, session.tenantId);
  }

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  touchSession(): AuthSession | null {
    const current = this.getSession();
    if (!current) return null;
    const updated: AuthSession = {
      ...current,
      lastSeenAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated;
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    localStorage.removeItem(LEGACY_TENANT_KEY);
  }

  private syncLegacyMirror(user: AuthUser | null, tenantId: string | null): void {
    if (!user || !tenantId) {
      localStorage.removeItem(LEGACY_USER_KEY);
      localStorage.removeItem(LEGACY_TENANT_KEY);
      return;
    }

    const legacyUser: LegacyUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      pin: user.pin,
      companyId: tenantId,
    };

    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(legacyUser));
    localStorage.setItem(LEGACY_TENANT_KEY, tenantId);
  }
}

export const sessionManager = new SessionManager();

