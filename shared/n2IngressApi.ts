export const N2_TENANT_COURSEUP = "courseup";

export const N2_HEADERS = {
  tenant: "x-n2-tenant",
  legacyTenant: "x-neria-tenant",
  authorization: "authorization",
} as const;

export type N2BonusAppId = "courseup" | "heritia" | "mamandouce";

export interface N2UnifiedAvatarPayload {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  accessory: string;
  photoDataUrl?: string;
  updatedAt: string;
}

export interface N2UnifiedUserProfile {
  userId: string;
  tenantId: string;
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
}

export interface N2AvatarSaveRequest {
  avatar: N2UnifiedAvatarPayload;
  photoUrl?: string;
}

export interface N2AvatarSaveResponse {
  ok: true;
  profile: N2UnifiedUserProfile;
  accessToken: string;
  expiresAt: string;
}

export interface N2OrderHistoryEntry {
  id: string;
  orderId: string;
  kind: "drive" | "selys" | "instore";
  label: string;
  storeName: string;
  date: string;
  totalEuro: number;
  n2oCredited: number;
  heritiaSync: "synced" | "pending" | "na";
  status: string;
}

export interface N2OrderHistoryResponse {
  tenantId: string;
  userId: string;
  entries: N2OrderHistoryEntry[];
}

export interface N2OrderReloadRequest {
  orderId: string;
}

export interface N2OrderReloadResponse {
  orderId: string;
  order: Record<string, unknown>;
  items: Record<string, unknown>[];
}

export interface N2BonusAppRequest {
  bonusApp: N2BonusAppId;
}

export interface N2BonusAppResponse {
  ok: true;
  selectedBonusApp: N2BonusAppId;
  accessToken: string;
  profile: N2UnifiedUserProfile;
}
