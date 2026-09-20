import { MongoClient, type Collection, type Db } from "mongodb";
import {
  type CourseUpStore,
  type StoredOrderDoc,
  type StoredUserDoc,
} from "./courseUpStore.js";
import { mongoTenantFilter } from "./courseUpStore.js";
import { withTenantScope } from "./tenantFilter.js";

const DB_NAME = "neriacorp_n2";
const USERS = "courseup_users";
const ORDERS = "courseup_orders";

export async function createMongoCourseUpStore(uri: string): Promise<CourseUpStore> {
  const client = new MongoClient(uri);
  await client.connect();
  const db: Db = client.db(DB_NAME);
  const users: Collection<StoredUserDoc> = db.collection(USERS);
  const orders: Collection<StoredOrderDoc> = db.collection(ORDERS);
  await users.createIndex({ tenant_id: 1, user_id: 1 }, { unique: true });
  await orders.createIndex({ tenant_id: 1, user_id: 1, order_id: 1 }, { unique: true });

  return {
    async getUser(tenantId, userId) {
      return users.findOne(mongoTenantFilter(tenantId, userId));
    },
    async upsertUser(tenantId, userId, patch) {
      const filter = mongoTenantFilter(tenantId, userId);
      const existing = await users.findOne(filter);
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
        subscriptionStatus:
          patch.subscriptionStatus ?? existing?.subscriptionStatus ?? "active",
        planLabel: patch.planLabel ?? existing?.planLabel ?? "standard",
        allAccess: patch.allAccess ?? existing?.allAccess ?? false,
        isVip: patch.isVip ?? existing?.isVip ?? false,
        selectedBonusApp: patch.selectedBonusApp ?? existing?.selectedBonusApp,
        avatar: patch.avatar ?? existing?.avatar,
        avatarUrl: patch.avatarUrl ?? existing?.avatarUrl,
        updatedAt: new Date().toISOString(),
      };
      await users.updateOne(filter, { $set: next }, { upsert: true });
      return next;
    },
    async listOrders(tenantId, userId) {
      return orders
        .find(mongoTenantFilter(tenantId, userId))
        .sort({ updatedAt: -1 })
        .toArray();
    },
    async upsertOrder(tenantId, userId, orderId, payload, historyRows) {
      const doc = withTenantScope(tenantId, userId, {
        order_id: orderId,
        payload,
        history_rows: historyRows,
        updatedAt: new Date().toISOString(),
      });
      await orders.updateOne(
        { ...mongoTenantFilter(tenantId, userId), order_id: orderId },
        { $set: doc },
        { upsert: true },
      );
      return doc;
    },
    async getOrder(tenantId, userId, orderId) {
      return orders.findOne({ ...mongoTenantFilter(tenantId, userId), order_id: orderId });
    },
  };
}
