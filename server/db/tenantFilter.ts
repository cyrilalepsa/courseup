export interface TenantScopedDocument {
  tenant_id: string;
  user_id: string;
}

export function tenantUserFilter(tenantId: string, userId: string) {
  return { tenant_id: tenantId, user_id: userId };
}

export function withTenantScope<T extends object>(
  tenantId: string,
  userId: string,
  doc: T,
): T & TenantScopedDocument {
  return { ...doc, tenant_id: tenantId, user_id: userId };
}
