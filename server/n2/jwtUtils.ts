export function decodeN2AccessToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function encodeN2AccessToken(
  payload: Record<string, unknown>,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): { token: string; expiresAt: string } {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + ttlMs);
  const body = {
    ...payload,
    iat: issuedAt.toISOString(),
    exp: expiresAt.toISOString(),
  };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const bodyB64 = Buffer.from(JSON.stringify(body)).toString("base64");
  const signature = Buffer.from("neriacorp-n2-ingress").toString("base64");
  return {
    token: `${header}.${bodyB64}.${signature}`,
    expiresAt: expiresAt.toISOString(),
  };
}
