import {
  bindNeriaSessionBridgeListener,
  clearNeriaSessionBridge,
  peekBridgeEnvelope,
  publishNeriaSessionToBridge,
  type NeriaSessionBridgeEnvelope,
} from "@/services/neriaSessionBridge";
import type { NeriaUnifiedAvatar } from "@/types/neriaAvatar";
import { DEFAULT_NERIA_AVATAR } from "@/types/neriaAvatar";
import type {
  AuthMethod,
  NeriaAppId,
  NeriaAuthChangeListener,
  NeriaAuthSession,
  NeriaSignInResult,
  NeriaStoredCredentialMeta,
  NeriaUser,
} from "@/types/neriaAuth";

const SESSION_STORAGE_KEY = "neria:auth:session:v1";
const CREDENTIALS_STORAGE_KEY = "neria:auth:credentials:v1";
const AVATAR_STORAGE_KEY = "neria:auth:avatar:v1";
const PROFILE_STORAGE_KEY = "neria:auth:profile:v1";
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COURSEUP_APP_ID: NeriaAppId = "courseup";

const listeners = new Set<NeriaAuthChangeListener>();

export const DEMO_NERIA_USERS: NeriaUser[] = [
  {
    id: "neria-u-standard",
    email: "standard@neriacorp.io",
    displayName: "Alex Standard",
    avatarInitials: "AS",
    subscription: {
      status: "active",
      primaryApp: "courseup",
      bonusApps: [{ appId: "heritia", discountPercent: 50 }],
      allAccess: false,
      selectedBonusApp: "heritia",
    },
    planLabel: "standard",
    preferredAuthMethod: "passkey",
    createdAt: "2025-01-10T08:00:00.000Z",
  },
  {
    id: "neria-u-vip",
    email: "vip@neriacorp.io",
    displayName: "Léa VIP",
    avatarInitials: "LV",
    subscription: {
      status: "active",
      primaryApp: "courseup",
      bonusApps: [
        { appId: "heritia", discountPercent: 50 },
        { appId: "mamandouce", discountPercent: 50 },
      ],
      allAccess: false,
      selectedBonusApp: "heritia",
    },
    planLabel: "vip",
    preferredAuthMethod: "passkey",
    createdAt: "2024-06-01T08:00:00.000Z",
  },
  {
    id: "neria-u-allaccess",
    email: "allaccess@neriacorp.io",
    displayName: "Neria All-Access",
    avatarInitials: "NA",
    subscription: {
      status: "active",
      primaryApp: "courseup",
      bonusApps: [],
      allAccess: true,
    },
    planLabel: "all-access-maternity",
    preferredAuthMethod: "sso",
    createdAt: "2024-01-01T08:00:00.000Z",
  },
];

const BONUS_APP_OPTIONS: NeriaAppId[] = ["heritia", "mamandouce"];

function notify(session: NeriaAuthSession | null): void {
  for (const listener of listeners) {
    listener(session);
  }
}

function readSession(): NeriaAuthSession | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as NeriaAuthSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function writeSession(session: NeriaAuthSession | null): void {
  if (typeof localStorage === "undefined") return;
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    notify(null);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  notify(session);
}

function readCredentialMap(): Record<string, NeriaStoredCredentialMeta> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, NeriaStoredCredentialMeta>;
  } catch {
    return {};
  }
}

function writeCredentialMap(map: Record<string, NeriaStoredCredentialMeta>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(map));
}

function hashDemoSecret(secret: string, userId: string): string {
  const input = `${userId}:${secret}:neriacorp-demo`;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `nv1_${Math.abs(hash).toString(16)}`;
}

function encodeDemoJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa("neriacorp-local-demo");
  return `${header}.${body}.${signature}`;
}

function readAvatarMap(): Record<string, NeriaUnifiedAvatar> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, NeriaUnifiedAvatar>;
  } catch {
    return {};
  }
}

function writeAvatarMap(map: Record<string, NeriaUnifiedAvatar>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(map));
}

function readProfileMap(): Record<string, Partial<NeriaUser>> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Partial<NeriaUser>>;
  } catch {
    return {};
  }
}

function writeProfileMap(map: Record<string, Partial<NeriaUser>>): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(map));
}

export function mergeStoredUserProfile(user: NeriaUser): NeriaUser {
  const avatars = readAvatarMap();
  const profiles = readProfileMap();
  const patch = profiles[user.id];
  const avatar = avatars[user.id] ?? user.avatar ?? patch?.avatar;
  const subscription = {
    ...user.subscription,
    ...patch?.subscription,
    selectedBonusApp:
      patch?.subscription?.selectedBonusApp ??
      user.subscription.selectedBonusApp ??
      user.subscription.bonusApps[0]?.appId,
  };
  return {
    ...user,
    ...patch,
    avatar,
    subscription,
    preferredAuthMethod:
      patch?.preferredAuthMethod ?? user.preferredAuthMethod ?? user.lastAuthMethod,
  };
}

function createSession(user: NeriaUser, authMethod: AuthMethod): NeriaAuthSession {
  const enriched = mergeStoredUserProfile(user);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + DEFAULT_SESSION_TTL_MS);
  const sessionId = `ses_${enriched.id}_${issuedAt.getTime().toString(36)}`;
  const accessToken = encodeDemoJwt({
    sub: enriched.id,
    email: enriched.email,
    sid: sessionId,
    app: COURSEUP_APP_ID,
    plan: enriched.subscription.allAccess ? "all-access" : enriched.subscription.primaryApp,
    avatar: enriched.avatar?.updatedAt,
    bonusApp: enriched.subscription.selectedBonusApp,
    iat: issuedAt.toISOString(),
    exp: expiresAt.toISOString(),
  });

  return {
    sessionId,
    userId: enriched.id,
    user: { ...enriched, lastAuthMethod: authMethod },
    authMethod,
    accessToken,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

function refreshSessionUser(mutator: (user: NeriaUser) => NeriaUser): NeriaAuthSession | null {
  const session = readSession();
  if (!session) return null;
  const nextUser = mutator(session.user);
  const next = createSession(nextUser, session.authMethod);
  const preserved: NeriaAuthSession = {
    ...next,
    sessionId: session.sessionId,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  };
  writeSession(preserved);
  publishNeriaSessionToBridge(preserved, COURSEUP_APP_ID, "*");
  return preserved;
}

function persistCredentials(
  userId: string,
  patch: Partial<NeriaStoredCredentialMeta> & { methods?: AuthMethod[] },
): void {
  const map = readCredentialMap();
  const existing = map[userId];
  const methods = new Set<AuthMethod>([
    ...(existing?.methods ?? []),
    ...(patch.methods ?? []),
  ]);
  map[userId] = {
    userId,
    methods: [...methods],
    passwordVerifier: patch.passwordVerifier ?? existing?.passwordVerifier,
    patternVerifier: patch.patternVerifier ?? existing?.patternVerifier,
    passkeyCredentialId: patch.passkeyCredentialId ?? existing?.passkeyCredentialId,
    updatedAt: new Date().toISOString(),
  };
  writeCredentialMap(map);
}

function finalizeSignIn(session: NeriaAuthSession): NeriaSignInResult {
  writeSession(session);
  publishNeriaSessionToBridge(session, COURSEUP_APP_ID, "*");
  return { ok: true, session };
}

export function subscribeNeriaAuth(listener: NeriaAuthChangeListener): () => void {
  listeners.add(listener);
  listener(readSession());
  return () => listeners.delete(listener);
}

export function getNeriaAuthSession(): NeriaAuthSession | null {
  return readSession();
}

export function getDemoNeriaUser(userId: string): NeriaUser | undefined {
  return DEMO_NERIA_USERS.find((u) => u.id === userId);
}

export async function simulateWebAuthnPasskeySignIn(
  userId = DEMO_NERIA_USERS[0].id,
): Promise<NeriaSignInResult> {
  const user = getDemoNeriaUser(userId);
  if (!user) return { ok: false, error: "Utilisateur démo introuvable" };

  await new Promise((resolve) => setTimeout(resolve, 280));

  const credentialId = `pk_${user.id}_${hashDemoSecret("passkey", user.id).slice(0, 12)}`;
  persistCredentials(user.id, {
    methods: ["passkey"],
    passkeyCredentialId: credentialId,
  });

  if (typeof window !== "undefined" && window.PublicKeyCredential) {
    /* Environnement compatible WebAuthn — simulation locale uniquement. */
  }

  return finalizeSignIn(createSession(user, "passkey"));
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<NeriaSignInResult> {
  const user =
    DEMO_NERIA_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ??
    DEMO_NERIA_USERS[0];
  const map = readCredentialMap();
  const meta = map[user.id];
  const verifier = hashDemoSecret(password, user.id);

  if (meta?.passwordVerifier && meta.passwordVerifier !== verifier) {
    return { ok: false, error: "Mot de passe incorrect" };
  }

  if (!meta?.passwordVerifier) {
    persistCredentials(user.id, {
      methods: ["password"],
      passwordVerifier: verifier,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 120));
  return finalizeSignIn(createSession(user, "password"));
}

/** Schéma mobile : séquence de 4 chiffres (ex. 1-2-3-4). */
export async function signInWithUnlockPattern(
  pattern: string,
  userId = DEMO_NERIA_USERS[0].id,
): Promise<NeriaSignInResult> {
  const normalized = pattern.replace(/\D/g, "");
  if (normalized.length < 4) {
    return { ok: false, error: "Schéma trop court (4 chiffres min.)" };
  }

  const user = getDemoNeriaUser(userId);
  if (!user) return { ok: false, error: "Utilisateur démo introuvable" };

  const map = readCredentialMap();
  const meta = map[user.id];
  const verifier = hashDemoSecret(normalized, user.id);

  if (meta?.patternVerifier && meta.patternVerifier !== verifier) {
    return { ok: false, error: "Schéma incorrect" };
  }

  if (!meta?.patternVerifier) {
    persistCredentials(user.id, {
      methods: ["pattern"],
      patternVerifier: verifier,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 160));
  return finalizeSignIn(createSession(user, "pattern"));
}

export async function signInWithSsoBridge(
  envelope: NeriaSessionBridgeEnvelope,
): Promise<NeriaSignInResult> {
  const user = getDemoNeriaUser(envelope.userId);
  if (!user) {
    return { ok: false, error: "Compte SSO non reconnu localement" };
  }

  const session: NeriaAuthSession = {
    sessionId: envelope.sessionId,
    userId: user.id,
    user: { ...user, lastAuthMethod: "sso" },
    authMethod: "sso",
    accessToken: envelope.accessToken,
    issuedAt: envelope.issuedAt,
    expiresAt: envelope.expiresAt,
  };

  return finalizeSignIn(session);
}

export async function registerNeriaAccount(input: {
  email: string;
  displayName: string;
  password: string;
  primaryApp?: NeriaAppId;
}): Promise<NeriaSignInResult> {
  const id = `neria-u-${Date.now().toString(36)}`;
  const user: NeriaUser = {
    id,
    email: input.email.trim(),
    displayName: input.displayName.trim() || "Neria User",
    avatarInitials: (input.displayName.trim() || "NU")
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    subscription: {
      status: "trial",
      primaryApp: input.primaryApp ?? "courseup",
      bonusApps: [{ appId: "heritia", discountPercent: 50 }],
      allAccess: false,
    },
    createdAt: new Date().toISOString(),
  };

  persistCredentials(user.id, {
    methods: ["password"],
    passwordVerifier: hashDemoSecret(input.password, user.id),
  });

  return finalizeSignIn(createSession(user, "password"));
}

export async function switchDemoNeriaUser(userId: string): Promise<NeriaSignInResult> {
  return simulateWebAuthnPasskeySignIn(userId);
}

export function signOutNeria(): void {
  writeSession(null);
  clearNeriaSessionBridge();
}

export function tryAutoLoginFromSessionBridge(
  consumerApp: NeriaAppId = COURSEUP_APP_ID,
): NeriaAuthSession | null {
  const existing = readSession();
  if (existing) return existing;

  const envelope = peekBridgeEnvelope();
  if (!envelope) return null;
  if (envelope.targetApp !== "*" && envelope.targetApp !== consumerApp) return null;

  const user = getDemoNeriaUser(envelope.userId);
  if (!user) return null;

  const session: NeriaAuthSession = {
    sessionId: envelope.sessionId,
    userId: user.id,
    user: { ...user, lastAuthMethod: "sso" },
    authMethod: "sso",
    accessToken: envelope.accessToken,
    issuedAt: envelope.issuedAt,
    expiresAt: envelope.expiresAt,
  };
  writeSession(session);
  return session;
}

export function initNeriaAuthBridge(consumerApp: NeriaAppId = COURSEUP_APP_ID): () => void {
  tryAutoLoginFromSessionBridge(consumerApp);
  return bindNeriaSessionBridgeListener(consumerApp, (envelope) => {
    void signInWithSsoBridge(envelope);
  });
}

export function purgeNeriaAuthStorage(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    localStorage.removeItem(AVATAR_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }
  clearNeriaSessionBridge();
  notify(null);
}

export function getNeriaCredentialMeta(userId: string): NeriaStoredCredentialMeta | null {
  return readCredentialMap()[userId] ?? null;
}

export function authMethodLabel(method: AuthMethod): string {
  const labels: Record<AuthMethod, string> = {
    passkey: "Passkey / Biométrie",
    pattern: "Schéma mobile",
    password: "Mot de passe",
    sso: "SSO NeriaCorp",
  };
  return labels[method];
}

export function resolveNeriaPlanDisplay(user: NeriaUser): string {
  if (user.subscription.allAccess || user.planLabel === "all-access-maternity") {
    return "All-Access Maternité";
  }
  if (user.planLabel === "vip" || user.id === "neria-u-vip") {
    return "VIP";
  }
  return "Standard";
}

export function isNeriaPremiumUser(user: NeriaUser): boolean {
  return (
    user.subscription.allAccess ||
    user.planLabel === "vip" ||
    user.planLabel === "all-access-maternity" ||
    user.id === "neria-u-vip" ||
    user.id === "neria-u-allaccess"
  );
}

export function listSelectableBonusApps(): NeriaAppId[] {
  return BONUS_APP_OPTIONS;
}

export async function enablePasskeyForCurrentUser(): Promise<NeriaSignInResult> {
  const session = readSession();
  if (!session) return { ok: false, error: "Non connecté" };
  await simulateWebAuthnPasskeySignIn(session.userId);
  const profiles = readProfileMap();
  profiles[session.userId] = {
    ...profiles[session.userId],
    preferredAuthMethod: "passkey",
  };
  writeProfileMap(profiles);
  return { ok: true, session: readSession() ?? undefined };
}

export async function enablePatternForCurrentUser(
  pattern: string,
): Promise<NeriaSignInResult> {
  const session = readSession();
  if (!session) return { ok: false, error: "Non connecté" };
  const result = await signInWithUnlockPattern(pattern, session.userId);
  if (!result.ok) return result;
  const profiles = readProfileMap();
  profiles[session.userId] = {
    ...profiles[session.userId],
    preferredAuthMethod: "pattern",
  };
  writeProfileMap(profiles);
  return result;
}

function mapN2ProfileToUser(
  profile: import("@shared/n2IngressApi").N2UnifiedUserProfile,
): Partial<NeriaUser> {
  return {
    email: profile.email,
    displayName: profile.displayName,
    avatarInitials: profile.avatarInitials,
    preferredAuthMethod: profile.preferredAuthMethod as AuthMethod,
    subscription: {
      status: profile.subscriptionStatus as NeriaUser["subscription"]["status"],
      primaryApp: "courseup",
      bonusApps: profile.selectedBonusApp
        ? [{ appId: profile.selectedBonusApp, discountPercent: 50 }]
        : [],
      allAccess: profile.allAccess,
      selectedBonusApp: profile.selectedBonusApp,
    },
    planLabel:
      profile.planLabel === "vip"
        ? "vip"
        : profile.allAccess
          ? "all-access-maternity"
          : "standard",
    avatar: profile.avatar as NeriaUnifiedAvatar | undefined,
  };
}

export function applyN2RefreshedSession(
  accessToken: string,
  expiresAt: string,
  profile?: import("@shared/n2IngressApi").N2UnifiedUserProfile,
): void {
  const session = readSession();
  if (!session) return;
  const userPatch = profile ? mapN2ProfileToUser(profile) : {};
  const next: NeriaAuthSession = {
    ...session,
    accessToken,
    expiresAt,
    user: { ...session.user, ...userPatch },
  };
  writeSession(next);
  publishNeriaSessionToBridge(next, COURSEUP_APP_ID, "*");
}

export async function updateSelectedBonusApp(appId: NeriaAppId): Promise<NeriaAuthSession | null> {
  const session = readSession();
  if (!session) return null;
  if (session.user.subscription.allAccess) return session;

  const profiles = readProfileMap();
  profiles[session.userId] = {
    ...profiles[session.userId],
    subscription: {
      ...session.user.subscription,
      selectedBonusApp: appId,
      bonusApps: [{ appId, discountPercent: 50 }],
    },
  };
  writeProfileMap(profiles);

  const local = refreshSessionUser((user) =>
    mergeStoredUserProfile({
      ...user,
      subscription: {
        ...user.subscription,
        selectedBonusApp: appId,
        bonusApps: [{ appId, discountPercent: 50 }],
      },
    }),
  );

  const { postN2BonusApp, isN2IngressConfigured } = await import(
    "@/services/api/n2IngressClient"
  );
  if (!isN2IngressConfigured()) return local;
  const remote = await postN2BonusApp({ bonusApp: appId });
  if (remote?.accessToken) {
    const current = readSession();
    applyN2RefreshedSession(
      remote.accessToken,
      current?.expiresAt ?? new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString(),
      remote.profile,
    );
  }
  return readSession();
}

export async function saveNeriaAvatar(avatar: NeriaUnifiedAvatar): Promise<NeriaAuthSession | null> {
  const session = readSession();
  if (!session) return null;
  const map = readAvatarMap();
  map[session.userId] = { ...avatar, updatedAt: new Date().toISOString() };
  writeAvatarMap(map);
  const local = refreshSessionUser((user) => ({
    ...mergeStoredUserProfile(user),
    avatar: map[session.userId],
  }));

  const { postN2UserAvatar, isN2IngressConfigured } = await import(
    "@/services/api/n2IngressClient"
  );
  if (!isN2IngressConfigured()) return local;
  const remote = await postN2UserAvatar({
    avatar: map[session.userId],
    photoUrl: avatar.photoDataUrl,
  });
  if (remote?.accessToken) {
    applyN2RefreshedSession(remote.accessToken, remote.expiresAt, remote.profile);
  }
  return readSession();
}

export function getNeriaAvatarForUser(userId: string): NeriaUnifiedAvatar {
  return readAvatarMap()[userId] ?? DEFAULT_NERIA_AVATAR;
}

export const NERIA_CLIENT_PORTAL_URL = "https://client.neriacorp.io/espace";
