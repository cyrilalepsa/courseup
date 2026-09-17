export type AuthMethod = "passkey" | "pattern" | "password" | "sso";

import type { NeriaUnifiedAvatar } from "@/types/neriaAvatar";

export type NeriaAppId = "courseup" | "heritia" | "mamandouce";

export type NeriaPlanLabel = "standard" | "vip" | "all-access-maternity";

export interface NeriaSubscriptionPlan {
  status: "active" | "trial" | "expired";
  /** Application principale incluse dans l’abonnement. */
  primaryApp: NeriaAppId;
  /** Applications bonus (ex. -50 % sur la 2ᵉ app). */
  bonusApps: { appId: NeriaAppId; discountPercent: number }[];
  /** Option All-Access : toutes les apps NeriaCorp. */
  allAccess: boolean;
  /** App bonus choisie à -50 % (hors All-Access). */
  selectedBonusApp?: NeriaAppId;
}

export interface NeriaUser {
  id: string;
  email: string;
  displayName: string;
  avatarInitials: string;
  subscription: NeriaSubscriptionPlan;
  planLabel?: NeriaPlanLabel;
  preferredAuthMethod?: AuthMethod;
  avatar?: NeriaUnifiedAvatar;
  lastAuthMethod?: AuthMethod;
  createdAt: string;
}

export interface NeriaAuthSession {
  sessionId: string;
  userId: string;
  user: NeriaUser;
  authMethod: AuthMethod;
  /** JWT NeriaCorp (simulation locale) pour le pont inter-apps. */
  accessToken: string;
  issuedAt: string;
  expiresAt: string;
}

export interface NeriaStoredCredentialMeta {
  userId: string;
  methods: AuthMethod[];
  /** Empreinte locale (démo) — jamais le secret en clair. */
  passwordVerifier?: string;
  patternVerifier?: string;
  passkeyCredentialId?: string;
  updatedAt: string;
}

export interface NeriaSignInResult {
  ok: boolean;
  session?: NeriaAuthSession;
  error?: string;
}

export type NeriaAuthChangeListener = (session: NeriaAuthSession | null) => void;
