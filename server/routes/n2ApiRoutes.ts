import { Router } from "express";
import type { N2BonusAppId } from "../../shared/n2IngressApi.js";
import { N2_TENANT_COURSEUP } from "../../shared/n2IngressApi.js";
import { getCourseUpStore, toProfileDto } from "../db/courseUpStore.js";
import { encodeN2AccessToken } from "../n2/jwtUtils.js";
import type { N2IngressContext, N2Request } from "../n2/ingressMiddleware.js";
import { requireN2Context } from "../n2/ingressMiddleware.js";
import {
  buildHistoryRowsFromOrderPayload,
  extractReloadItems,
} from "../services/orderHistoryBuilder.js";

function claimsFromProfile(
  tenantId: string,
  userId: string,
  profile: ReturnType<typeof toProfileDto>,
): Record<string, unknown> {
  return {
    sub: userId,
    tenant: tenantId,
    app: N2_TENANT_COURSEUP,
    email: profile.email,
    plan: profile.allAccess ? "all-access" : profile.planLabel,
    is_vip: profile.isVip,
    bonus_app: profile.selectedBonusApp,
    avatar_url: profile.avatarUrl ?? profile.avatar?.photoDataUrl,
  };
}

async function ensureUserFromClaims(ctx: N2IngressContext) {
  const store = getCourseUpStore();
  const claims = ctx.claims;
  const existing = await store.getUser(ctx.tenantId, ctx.userId);
  if (existing) return existing;
  return store.upsertUser(ctx.tenantId, ctx.userId, {
    email: typeof claims.email === "string" ? claims.email : undefined,
    planLabel: typeof claims.plan === "string" ? String(claims.plan) : "standard",
    allAccess: claims.plan === "all-access",
    isVip: Boolean(claims.is_vip),
    selectedBonusApp:
      typeof claims.bonus_app === "string" ? (claims.bonus_app as N2BonusAppId) : undefined,
  });
}

export function createN2ApiRouter(): Router {
  const router = Router();

  const profileHandler = async (req: N2Request, res: import("express").Response) => {
    const ctx = requireN2Context(req, res);
    if (!ctx) return;
    const user = await ensureUserFromClaims(ctx);
    res.json({ profile: toProfileDto(user) });
  };

  router.get("/user/profile", profileHandler);
  router.get("/courseup/user/profile", profileHandler);

  router.post("/user/avatar", async (req: N2Request, res) => {
    const ctx = requireN2Context(req, res);
    if (!ctx) return;
    const { avatar, photoUrl } = req.body as {
      avatar?: Record<string, unknown>;
      photoUrl?: string;
    };
    if (!avatar || typeof avatar !== "object") {
      res.status(400).json({ error: "avatar_required" });
      return;
    }

    const store = getCourseUpStore();
    const user = await store.upsertUser(ctx.tenantId, ctx.userId, {
      avatar: avatar as unknown as import("../../shared/n2IngressApi.js").N2UnifiedAvatarPayload,
      avatarUrl: photoUrl ?? (typeof avatar.photoDataUrl === "string" ? avatar.photoDataUrl : undefined),
    });
    const profile = toProfileDto(user);
    const token = encodeN2AccessToken(claimsFromProfile(ctx.tenantId, ctx.userId, profile));
    res.json({
      ok: true,
      profile,
      accessToken: token.token,
      expiresAt: token.expiresAt,
    });
  });

  router.get("/orders/history", async (req: N2Request, res) => {
    const ctx = requireN2Context(req, res);
    if (!ctx) return;
    const store = getCourseUpStore();
    const orders = await store.listOrders(ctx.tenantId, ctx.userId);
    const entries = orders.flatMap((row) => row.history_rows);
    res.json({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      entries,
    });
  });

  router.post("/orders/reload", async (req: N2Request, res) => {
    const ctx = requireN2Context(req, res);
    if (!ctx) return;
    const orderId = String((req.body as { orderId?: string })?.orderId ?? "");
    if (!orderId) {
      res.status(400).json({ error: "order_id_required" });
      return;
    }
    const store = getCourseUpStore();
    const stored = await store.getOrder(ctx.tenantId, ctx.userId, orderId);
    if (!stored) {
      res.status(404).json({ error: "order_not_found" });
      return;
    }
    const lines = extractReloadItems(stored.payload);
    const items = lines.map((line, index) => ({
      id: `reload-${orderId}-${index}`,
      name: String(line.name ?? "Article"),
      quantity: Number(line.quantity ?? 1),
      unit: String(line.unit ?? "u"),
      category: "épicerie",
      confidenceScore: 1,
      source: "text",
      attributes: {
        qualityScore: "B",
        bio: false,
        local: false,
        seasonal: false,
      },
    }));
    res.json({
      orderId,
      order: stored.payload,
      items,
    });
  });

  router.post("/orders/sync", async (req: N2Request, res) => {
    const ctx = requireN2Context(req, res);
    if (!ctx) return;
    const order = req.body as Record<string, unknown>;
    const orderId = String(order.id ?? "");
    if (!orderId) {
      res.status(400).json({ error: "order_payload_invalid" });
      return;
    }
    const rows = buildHistoryRowsFromOrderPayload(order);
    const store = getCourseUpStore();
    await store.upsertOrder(ctx.tenantId, ctx.userId, orderId, order, rows);
    res.json({ ok: true, orderId, entries: rows.length });
  });

  router.post("/subscription/bonus-app", async (req: N2Request, res) => {
    const ctx = requireN2Context(req, res);
    if (!ctx) return;
    const bonusApp = (req.body as { bonusApp?: N2BonusAppId })?.bonusApp;
    if (bonusApp !== "heritia" && bonusApp !== "mamandouce") {
      res.status(400).json({ error: "invalid_bonus_app" });
      return;
    }
    const store = getCourseUpStore();
    const user = await store.upsertUser(ctx.tenantId, ctx.userId, {
      selectedBonusApp: bonusApp,
    });
    const profile = toProfileDto(user);
    const token = encodeN2AccessToken(claimsFromProfile(ctx.tenantId, ctx.userId, profile));
    res.json({
      ok: true,
      selectedBonusApp: bonusApp,
      accessToken: token.token,
      profile,
    });
  });

  return router;
}
