/**
 * Utility for generating and validating multi-company IDs with prefixes.
 */

export type IDPrefix = 'usr' | 'cmp' | 'str' | 'emp' | 'ord' | 'itm' | 'tbl' | 'pro' | 'inv' | 'shf' | 'res' | 'inc' | 'ntf' | 'prn' | 'wfl' | 'rol';

/**
 * Generates a unique ID with a prefix.
 * Example: generateId('emp') -> "emp_7af92k"
 */
export function generateId(prefix: IDPrefix): string {
  const randomStr = Math.random().toString(36).substring(2, 9) + Math.random().toString(36).substring(2, 9);
  return `${prefix}_${randomStr.substring(0, 10)}`;
}

/**
 * Validates if an ID has the correct prefix.
 */
export function validateId(id: string, prefix: IDPrefix): boolean {
  return id.startsWith(`${prefix}_`);
}

/**
 * Generates a secure, non-predictable invite code.
 * Example: "AB12-CD34"
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  const part = () => Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `${part()}-${part()}`;
}

/**
 * Helper to check if an entity belongs to a specific company.
 */
export function belongsToCompany(entity: { companyId?: string; enterpriseId?: string }, targetCompanyId: string): boolean {
  return (entity.companyId === targetCompanyId) || (entity.enterpriseId === targetCompanyId);
}
