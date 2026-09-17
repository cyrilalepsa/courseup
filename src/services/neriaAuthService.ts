import {
  bindNeriaSessionBridgeListener,
  clearNeriaSessionBridge,
  peekBridgeEnvelope,
  publishNeriaSessionToBridge,
  type NeriaSessionBridgeEnvelope,
} from "@/services/neriaSessionBridge";
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
    },
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
    },
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
    createdAt: "2024-01-01T08:00:00.000Z",
  },
];

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

function createSession(user: NeriaUser, authMethod: AuthMethod): NeriaAuthSession {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + DEFAULT_SESSION_TTL_MS);
  const sessionId = `ses_${user.id}_${issuedAt.getTime().toString(36)}`;
  const accessToken = encodeDemoJwt({
    sub: user.id,
    email: user.email,
    sid: sessionId,
    app: COURSEUP_APP_ID,
    plan: user.subscription.allAccess ? "all-access" : user.subscription.primaryApp,
    iat: issuedAt.toISOString(),
    exp: expiresAt.toISOString(),
  });

  return {
    sessionId,
    userId: user.id,
    user: { ...user, lastAuthMethod: authMethod },
    authMethod,
    accessToken,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
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
  }
  clearNeriaSessionBridge();
  notify(null);
}
