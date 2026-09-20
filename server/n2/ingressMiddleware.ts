import type { NextFunction, Request, Response } from "express";
import { N2_HEADERS, N2_TENANT_COURSEUP } from "../../shared/n2IngressApi.js";
import { decodeN2AccessToken } from "./jwtUtils.js";

export interface N2IngressContext {
  tenantId: string;
  userId: string;
  accessToken: string;
  claims: Record<string, unknown>;
}

export type N2Request = Request & { n2?: N2IngressContext };

const ALLOWED_TENANTS = new Set([N2_TENANT_COURSEUP]);

function readBearerToken(req: Request): string | null {
  const header = req.headers[N2_HEADERS.authorization];
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("n2_session="));
  if (!match) return null;
  return decodeURIComponent(match.slice("n2_session=".length));
}

export function n2IngressMiddleware(req: N2Request, res: Response, next: NextFunction): void {
  const tenantHeader = req.headers[N2_HEADERS.tenant] ?? req.headers[N2_HEADERS.legacyTenant];
  const tenantId =
    (typeof tenantHeader === "string" ? tenantHeader.trim() : "") || N2_TENANT_COURSEUP;

  if (!ALLOWED_TENANTS.has(tenantId)) {
    res.status(403).json({ error: "tenant_forbidden", tenantId });
    return;
  }

  const accessToken = readBearerToken(req);
  if (!accessToken) {
    res.status(401).json({ error: "missing_n2_token" });
    return;
  }

  const claims = decodeN2AccessToken(accessToken);
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) {
    res.status(401).json({ error: "invalid_n2_token" });
    return;
  }

  req.n2 = {
    tenantId,
    userId,
    accessToken,
    claims: claims ?? {},
  };
  next();
}

export function requireN2Context(req: N2Request, res: Response): N2IngressContext | null {
  if (!req.n2) {
    res.status(500).json({ error: "ingress_context_missing" });
    return null;
  }
  return req.n2;
}
