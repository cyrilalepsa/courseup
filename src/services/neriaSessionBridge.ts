import type { NeriaAppId, NeriaAuthSession } from "@/types/neriaAuth";

export const NERIA_SESSION_BRIDGE_EVENT = "neria:session-bridge";
export const BRIDGE_REGISTRY_STORAGE_KEY = "neria:session-bridge:v1";

export interface NeriaSessionBridgeEnvelope {
  sourceApp: NeriaAppId;
  targetApp?: NeriaAppId | "*";
  accessToken: string;
  userId: string;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface NeriaBridgeRegistry {
  version: 1;
  lastPublished: NeriaSessionBridgeEnvelope | null;
  peerHints: Partial<Record<NeriaAppId, string>>;
}

function readRegistry(): NeriaBridgeRegistry {
  if (typeof localStorage === "undefined") {
    return { version: 1, lastPublished: null, peerHints: {} };
  }
  try {
    const raw = localStorage.getItem(BRIDGE_REGISTRY_STORAGE_KEY);
    if (!raw) return { version: 1, lastPublished: null, peerHints: {} };
    const parsed = JSON.parse(raw) as NeriaBridgeRegistry;
    if (parsed?.version !== 1) return { version: 1, lastPublished: null, peerHints: {} };
    return parsed;
  } catch {
    return { version: 1, lastPublished: null, peerHints: {} };
  }
}

function writeRegistry(registry: NeriaBridgeRegistry): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(BRIDGE_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
}

export function sessionToBridgeEnvelope(
  session: NeriaAuthSession,
  sourceApp: NeriaAppId,
  targetApp: NeriaAppId | "*" = "*",
): NeriaSessionBridgeEnvelope {
  return {
    sourceApp,
    targetApp,
    accessToken: session.accessToken,
    userId: session.userId,
    sessionId: session.sessionId,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  };
}

export function publishNeriaSessionToBridge(
  session: NeriaAuthSession,
  sourceApp: NeriaAppId,
  targetApp: NeriaAppId | "*" = "*",
): void {
  const envelope = sessionToBridgeEnvelope(session, sourceApp, targetApp);
  const registry = readRegistry();
  registry.lastPublished = envelope;
  registry.peerHints[sourceApp] = session.sessionId;
  writeRegistry(registry);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(NERIA_SESSION_BRIDGE_EVENT, { detail: envelope }),
    );
    try {
      window.parent?.postMessage(
        { type: NERIA_SESSION_BRIDGE_EVENT, payload: envelope },
        "*",
      );
    } catch {
      /* iframe sandbox */
    }
  }
}

export function clearNeriaSessionBridge(): void {
  writeRegistry({ version: 1, lastPublished: null, peerHints: {} });
}

export function peekBridgeEnvelope(): NeriaSessionBridgeEnvelope | null {
  const registry = readRegistry();
  const envelope = registry.lastPublished;
  if (!envelope) return null;
  if (new Date(envelope.expiresAt).getTime() <= Date.now()) return null;
  return envelope;
}

export function tryConsumeBridgeForApp(
  consumerApp: NeriaAppId,
): NeriaSessionBridgeEnvelope | null {
  const envelope = peekBridgeEnvelope();
  if (!envelope) return null;
  if (envelope.targetApp !== "*" && envelope.targetApp !== consumerApp) {
    return null;
  }
  if (envelope.sourceApp === consumerApp) {
    return envelope;
  }
  return envelope;
}

export function bindNeriaSessionBridgeListener(
  consumerApp: NeriaAppId,
  onEnvelope: (envelope: NeriaSessionBridgeEnvelope) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<NeriaSessionBridgeEnvelope>).detail;
    if (!detail?.accessToken) return;
    if (detail.targetApp !== "*" && detail.targetApp !== consumerApp) return;
    onEnvelope(detail);
  };

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== NERIA_SESSION_BRIDGE_EVENT) return;
    const payload = event.data.payload as NeriaSessionBridgeEnvelope;
    if (!payload?.accessToken) return;
    if (payload.targetApp !== "*" && payload.targetApp !== consumerApp) return;
    onEnvelope(payload);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== BRIDGE_REGISTRY_STORAGE_KEY) return;
    const envelope = peekBridgeEnvelope();
    if (envelope) onEnvelope(envelope);
  };

  window.addEventListener(NERIA_SESSION_BRIDGE_EVENT, onCustom);
  window.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(NERIA_SESSION_BRIDGE_EVENT, onCustom);
    window.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}
