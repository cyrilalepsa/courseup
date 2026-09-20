import type {
  N2BonusAppId,
  N2OrderHistoryEntry,
  N2UnifiedAvatarPayload,
  N2UnifiedUserProfile,
} from "../../shared/n2IngressApi.js";
import { tenantUserFilter, withTenantScope } from "./tenantFilter.js";

export interface StoredUserDoc {
  tenant_id: string;
  user_id: string;
  email: string;
  displayName: string;
  avatarInitials: string;
  preferredAuthMethod: string;
  authMethods: string[];
  passkeyEnabled: boolean;
  subscriptionStatus: string;
  planLabel: string;
  allAccess: boolean;
  isVip: boolean;
  selectedBonusApp?: N2BonusAppId;
  avatar?: N2UnifiedAvatarPayload;
  avatarUrl?: string;
  updatedAt: string;
}

export interface StoredOrderDoc {
  tenant_id: string;
  user_id: string;
  order_id: string;
  payload: Record<string, unknown>;
  history_rows: N2OrderHistoryEntry[];
  updatedAt: string;
}

type MemoryDb = {
  users: Map<string, StoredUserDoc>;
  orders: Map<string, StoredOrderDoc>;
};

const memory: MemoryDb = {
  users: new Map(),
  orders: new Map(),
};

function userKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

function orderKey(tenantId: string, userId: string, orderId: string): string {
  return `${tenantId}:${userId}:${orderId}`;
}

export interface CourseUpStore {
  getUser(tenantId: string, userId: string): Promise<StoredUserDoc | null>;
  upsertUser(tenantId: string, userId: string, patch: Partial<StoredUserDoc>): Promise<StoredUserDoc>;
  listOrders(tenantId: string, userId: string): Promise<StoredOrderDoc[]>;
  upsertOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    payload: Record<string, unknown>,
    historyRows: N2OrderHistoryEntry[],
  ): Promise<StoredOrderDoc>;
  getOrder(tenantId: string, userId: string, orderId: string): Promise<StoredOrderDoc | null>;
}

class MemoryCourseUpStore implements CourseUpStore {
  async getUser(tenantId: string, userId: string): Promise<StoredUserDoc | null> {
    return memory.users.get(userKey(tenantId, userId)) ?? null;
  }

  async upsertUser(
    tenantId: string,
    userId: string,
    patch: Partial<StoredUserDoc>,
  ): Promise<StoredUserDoc> {
    const key = userKey(tenantId, userId);
    const existing = memory.users.get(key);
    const next: StoredUserDoc = {
      tenant_id: tenantId,
      user_id: userId,
      email: patch.email ?? existing?.email ?? `${userId}@neriacorp.io`,
      displayName: patch.displayName ?? existing?.displayName ?? "Neria User",
      avatarInitials: patch.avatarInitials ?? existing?.avatarInitials ?? "NU",
      preferredAuthMethod:
        patch.preferredAuthMethod ?? existing?.preferredAuthMethod ?? "sso",
      authMethods: patch.authMethods ?? existing?.authMethods ?? ["sso"],
      passkeyEnabled: patch.passkeyEnabled ?? existing?.passkeyEnabled ?? false,
      subscriptionStatus: patch.subscriptionStatus ?? existing?.subscriptionStatus ?? "active",
      planLabel: patch.planLabel ?? existing?.planLabel ?? "standard",
      allAccess: patch.allAccess ?? existing?.allAccess ?? false,
      isVip: patch.isVip ?? existing?.isVip ?? false,
      selectedBonusApp: patch.selectedBonusApp ?? existing?.selectedBonusApp,
      avatar: patch.avatar ?? existing?.avatar,
      avatarUrl: patch.avatarUrl ?? existing?.avatarUrl,
      updatedAt: new Date().toISOString(),
    };
    memory.users.set(key, next);
    return next;
  }

  async listOrders(tenantId: string, userId: string): Promise<StoredOrderDoc[]> {
    const prefix = `${tenantId}:${userId}:`;
    return [...memory.orders.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async upsertOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    payload: Record<string, unknown>,
    historyRows: N2OrderHistoryEntry[],
  ): Promise<StoredOrderDoc> {
    const doc = withTenantScope(tenantId, userId, {
      order_id: orderId,
      payload,
      history_rows: historyRows,
      updatedAt: new Date().toISOString(),
    });
    memory.orders.set(orderKey(tenantId, userId, orderId), doc);
    return doc;
  }

  async getOrder(tenantId: string, userId: string, orderId: string): Promise<StoredOrderDoc | null> {
    return memory.orders.get(orderKey(tenantId, userId, orderId)) ?? null;
  }
}

/** Filtre Mongo : toutes les requêtes CourseUp portent tenant_id + user_id. */
export function mongoTenantFilter(tenantId: string, userId: string) {
  return tenantUserFilter(tenantId, userId);
}

let store: CourseUpStore = new MemoryCourseUpStore();

export function getCourseUpStore(): CourseUpStore {
  return store;
}

export function setCourseUpStore(next: CourseUpStore): void {
  store = next;
}

export function toProfileDto(doc: StoredUserDoc): N2UnifiedUserProfile {
  return {
    userId: doc.user_id,
    tenantId: doc.tenant_id,
    email: doc.email,
    displayName: doc.displayName,
    avatarInitials: doc.avatarInitials,
    preferredAuthMethod: doc.preferredAuthMethod,
    authMethods: doc.authMethods,
    passkeyEnabled: doc.passkeyEnabled,
    subscriptionStatus: doc.subscriptionStatus,
    planLabel: doc.planLabel,
    allAccess: doc.allAccess,
    isVip: doc.isVip,
    selectedBonusApp: doc.selectedBonusApp,
    avatar: doc.avatar,
    avatarUrl: doc.avatarUrl,
  };
}
