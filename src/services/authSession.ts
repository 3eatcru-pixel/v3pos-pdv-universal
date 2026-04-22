import {
  getIdTokenResult,
  signInAnonymously,
  type User,
} from '@firebase/auth';
import { auth } from '../firebase';

export async function ensureFirebaseSession(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  const allowAnonymous = import.meta.env.VITE_ENABLE_ANONYMOUS_AUTH !== 'false';
  if (!allowAnonymous) return null;
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function getTenantClaim(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await getIdTokenResult(user);
  return (token.claims.companyId as string) || (token.claims.enterpriseId as string) || null;
}

export async function canAccessTenant(tenantId: string): Promise<boolean> {
  const strictClaims = import.meta.env.VITE_STRICT_TENANT_CLAIMS === 'true';
  const claim = await getTenantClaim();
  if (!claim) return !strictClaims;
  return claim === tenantId;
}
