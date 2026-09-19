import {
  connectionTable, crossingsTable, db, missedXsectsTable, momentsTable, notificationTable,
  xsectsTable,
} from "@workspace/db";
import { and, count, desc, eq, gt, gte, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { track } from "../lib/analytics";
import { FREE_LIMITS, getEffectivePlan, hasEntitlement } from "../lib/entitlements";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { engine } from "../services/xsect-engine";

// Owned by the "xsects" build stream. Mounted under /api by routes/index.ts.
const router: IRouter = Router();
router.use(requireAuth);
const actor = (req: Request) => (req as AuthenticatedRequest).userId;
const bad = (res: Response, message: string, status = 400): void => { res.status(status).json({ error: message }); };
const refreshes = new Map<string, number>();
const typeSchema = z.enum(["physical", "intent", "network", "time", "event", "opportunity"]);
const statusSchema = z.enum(["active", "requested", "connected", "dismissed", "expired"]);

async function requestConnection(userId: string, targetId: string) {
  const existing = (await db.select().from(connectionTable).where(or(
    and(eq(connectionTable.requesterId, userId), eq(connectionTable.recipientId, targetId)),
    and(eq(connectionTable.requesterId, targetId), eq(connectionTable.recipientId, userId)),
  )).limit(1))[0];
  if (existing?.status === "accepted" || existing?.status === "blocked") throw new Error("Connection cannot be requested.");
  if (existing?.status === "pending") return existing;
  const [connection] = existing
    ? await db.update(connectionTable).set({ requesterId: userId, recipientId: targetId, status: "pending", blockedBy: null }).where(eq(connectionTable.id, existing.id)).returning()
    : await db.insert(connectionTable).values({ requesterId: userId, recipientId: targetId }).returning();
  await db.insert(notificationTable).values({ userId: targetId, type: "connection_request", title: "New XSECT request", body: "A protected professional would like to connect.", resourceId: connection.id });
  return connection;
}

router.get("/radar", async (req, res, next) => {
  try {
    const userId = actor(req);
    await engine.expireStale();
    const last = refreshes.get(userId) ?? 0;
    if (Date.now() - last >= 10 * 60_000) {
      refreshes.set(userId, Date.now());
      const hasAny = (await db.select({ id: xsectsTable.id }).from(xsectsTable).where(eq(xsectsTable.userId, userId)).limit(1)).length > 0;
      const refresh = (async () => {
        await engine.recomputeIntentXsects(userId);
        if (await hasEntitlement(userId, "time_xsects")) await engine.recomputeTimeXsects(userId);
      })().catch((error) => console.error("radar refresh failed", error));
      // First visit: wait so the Radar is not empty. Afterwards refresh in the background.
      if (!hasAny) await refresh;
    }
    const [moments, hotXsects, physical, active, missed, connections] = await Promise.all([
      db.select().from(momentsTable).where(eq(momentsTable.userId, userId)).orderBy(sql`${momentsTable.readAt} asc nulls first`, desc(momentsTable.createdAt)).limit(30),
      engine.listXsects(userId, { status: "active", minScore: 0, limit: 50 }),
      engine.listXsects(userId, { type: "physical", status: "active", limit: 100 }),
      db.select({ value: count() }).from(xsectsTable).where(and(eq(xsectsTable.userId, userId), eq(xsectsTable.status, "active"))),
      db.select({ value: count() }).from(missedXsectsTable).where(and(eq(missedXsectsTable.userId, userId), gte(missedXsectsTable.occurredAt, new Date(Date.now() - 7 * 86_400_000)))),
      db.select({ value: count() }).from(connectionTable).where(and(eq(connectionTable.status, "accepted"), or(eq(connectionTable.requesterId, userId), eq(connectionTable.recipientId, userId)))),
    ]);
    const recent = physical.filter((xsect) => xsect.createdAt.getTime() >= Date.now() - 86_400_000);
    const nearby = Object.fromEntries(["lt_250m", "250m_500m", "500m_1km", "1km_2km", "2km_5km", "5km_plus"].map((band) => [band, recent.filter((xsect) => xsect.distanceBand === band)]));
    res.json({
      moments, hotXsects: hotXsects.filter((xsect) => xsect.isHot).slice(0, 5), nearby,
      stats: { activeXsects: Number(active[0]?.value ?? 0), missedThisWeek: Number(missed[0]?.value ?? 0), connections: Number(connections[0]?.value ?? 0) },
    });
  } catch (error) { next(error); }
});

router.get("/xsects", async (req, res, next) => {
  try {
    const parsed = z.object({ type: typeSchema.optional(), status: statusSchema.optional(), minScore: z.coerce.number().min(0).max(100).optional() }).safeParse(req.query);
    if (!parsed.success) return bad(res, "Invalid XSECT filters.");
    const userId = actor(req);
    const effective = await getEffectivePlan(userId);
    const limited = effective.plan === "free" && (!parsed.data.status || parsed.data.status === "active");
    const xsects = await engine.listXsects(userId, { ...parsed.data, limit: limited ? FREE_LIMITS.xsectsPerDay : 200 });
    res.json({ xsects, limited, plan: effective.plan });
  } catch (error) { next(error); }
});

router.get("/xsects/:id", async (req, res, next) => {
  try {
    const xsect = await engine.getXsect(actor(req), req.params.id);
    if (!xsect) return bad(res, "XSECT not found.", 404);
    await track("xsect_viewed", actor(req), { xsectId: xsect.id });
    res.json({ xsect });
  } catch (error) { next(error); }
});

router.post("/xsects/:id/request", async (req, res, next) => {
  try {
    const userId = actor(req);
    const xsect = await engine.getXsect(userId, req.params.id);
    if (!xsect?.counterpartUserId) return bad(res, "XSECT not found.", 404);
    if (!(await engine.isDiscoverable(userId, xsect.counterpartUserId))) return bad(res, "This XSECT is no longer discoverable.", 403);
    const connection = await requestConnection(userId, xsect.counterpartUserId);
    await Promise.all([
      db.update(xsectsTable).set({ status: "requested" }).where(and(eq(xsectsTable.id, xsect.id), eq(xsectsTable.userId, userId))),
      db.update(missedXsectsTable).set({ status: "requested" }).where(and(eq(missedXsectsTable.userId, userId), eq(missedXsectsTable.xsectId, xsect.id))),
      track("request_sent", userId, { xsectId: xsect.id, connectionId: connection.id }),
    ]);
    res.status(201).json({ connection });
  } catch (error) {
    if (error instanceof Error && error.message === "Connection cannot be requested.") return bad(res, error.message, 409);
    next(error);
  }
});

router.post("/xsects/:id/dismiss", async (req, res, next) => {
  try {
    const [xsect] = await db.update(xsectsTable).set({ status: "dismissed" }).where(and(eq(xsectsTable.id, req.params.id), eq(xsectsTable.userId, actor(req)))).returning();
    if (!xsect) return bad(res, "XSECT not found.", 404);
    res.json({ xsect });
  } catch (error) { next(error); }
});

router.get("/discover", async (req, res, next) => {
  try {
    const parsed = z.object({ category: z.string().max(80).optional(), industry: z.string().max(120).optional(), minScore: z.coerce.number().min(0).max(100).default(45), type: typeSchema.optional() }).safeParse(req.query);
    if (!parsed.success) return bad(res, "Invalid discovery filters.");
    const types = parsed.data.type ? [parsed.data.type] : ["intent", "opportunity"] as const;
    const results = (await Promise.all(types.map((type) => engine.listXsects(actor(req), { type, status: "active", minScore: parsed.data.minScore, limit: 200 })))).flat();
    const filtered = results.filter((xsect) => {
      const categoryOk = !parsed.data.category || xsect.explanation.some((text) => text.toLowerCase().includes(parsed.data.category!.toLowerCase()));
      const industryOk = !parsed.data.industry || xsect.counterpart?.industry?.toLowerCase() === parsed.data.industry.toLowerCase();
      return categoryOk && industryOk;
    }).sort((a, b) => b.score - a.score);
    res.json({ xsects: filtered.map((xsect) => ({ ...xsect, reasons: xsect.explanation })) });
  } catch (error) { next(error); }
});

router.get("/missed", async (req, res, next) => {
  try {
    const status = z.enum(["active", "expired", "dismissed", "requested", "connected"]).optional().safeParse(req.query.status);
    if (!status.success) return bad(res, "Invalid Missed status.");
    const userId = actor(req);
    const effective = await getEffectivePlan(userId);
    const limited = effective.plan === "free";
    const conditions = [eq(missedXsectsTable.userId, userId)];
    if (status.data) conditions.push(eq(missedXsectsTable.status, status.data));
    if (limited) conditions.push(gte(missedXsectsTable.occurredAt, new Date(Date.now() - FREE_LIMITS.missedHistoryDays * 86_400_000)));
    const rows = await db.select({ missed: missedXsectsTable, crossing: crossingsTable }).from(missedXsectsTable)
      .leftJoin(crossingsTable, eq(crossingsTable.id, missedXsectsTable.crossingId))
      .where(and(...conditions)).orderBy(desc(missedXsectsTable.occurredAt)).limit(200);
    const missed = await Promise.all(rows.map(async ({ missed, crossing }) => ({
      ...missed, counterpart: await engine.protectedProfileView(userId, missed.counterpartUserId),
      area: crossing?.area ?? null, city: crossing?.city ?? null,
    })));
    await track("missed_xsect_viewed", userId, { count: missed.length });
    res.json({ missed, limited, plan: effective.plan });
  } catch (error) { next(error); }
});

router.post("/missed/:id/dismiss", async (req, res, next) => {
  try {
    const [missed] = await db.update(missedXsectsTable).set({ status: "dismissed" }).where(and(eq(missedXsectsTable.id, req.params.id), eq(missedXsectsTable.userId, actor(req)))).returning();
    if (!missed) return bad(res, "Missed XSECT not found.", 404);
    res.json({ missed });
  } catch (error) { next(error); }
});

router.post("/missed/:id/request", async (req, res, next) => {
  try {
    const userId = actor(req);
    const missed = (await db.select().from(missedXsectsTable).where(and(eq(missedXsectsTable.id, req.params.id), eq(missedXsectsTable.userId, userId))).limit(1))[0];
    if (!missed) return bad(res, "Missed XSECT not found.", 404);
    if (!(await engine.isDiscoverable(userId, missed.counterpartUserId))) return bad(res, "This XSECT is no longer discoverable.", 403);
    const connection = await requestConnection(userId, missed.counterpartUserId);
    await db.update(missedXsectsTable).set({ status: "requested" }).where(eq(missedXsectsTable.id, missed.id));
    if (missed.xsectId) await db.update(xsectsTable).set({ status: "requested" }).where(and(eq(xsectsTable.id, missed.xsectId), eq(xsectsTable.userId, userId)));
    await track("request_sent", userId, { missedXsectId: missed.id, connectionId: connection.id });
    res.status(201).json({ connection });
  } catch (error) {
    if (error instanceof Error && error.message === "Connection cannot be requested.") return bad(res, error.message, 409);
    next(error);
  }
});

router.get("/moments", async (req, res, next) => {
  try {
    const before = typeof req.query.before === "string" ? new Date(req.query.before) : null;
    if (before && Number.isNaN(before.getTime())) return bad(res, "Invalid pagination cursor.");
    const conditions = [eq(momentsTable.userId, actor(req))];
    if (before) conditions.push(lt(momentsTable.createdAt, before));
    const moments = await db.select().from(momentsTable).where(and(...conditions)).orderBy(desc(momentsTable.createdAt)).limit(30);
    res.json({ moments, nextCursor: moments.length === 30 ? moments[29].createdAt.toISOString() : null });
  } catch (error) { next(error); }
});
router.post("/moments/:id/read", async (req, res, next) => {
  try {
    const [moment] = await db.update(momentsTable).set({ readAt: new Date() }).where(and(eq(momentsTable.id, req.params.id), eq(momentsTable.userId, actor(req)))).returning();
    if (!moment) return bad(res, "Moment not found.", 404);
    res.json({ moment });
  } catch (error) { next(error); }
});
router.post("/moments/read-all", async (req, res, next) => {
  try {
    await db.update(momentsTable).set({ readAt: new Date() }).where(and(eq(momentsTable.userId, actor(req)), isNull(momentsTable.readAt)));
    res.json({ read: true });
  } catch (error) { next(error); }
});

router.get("/crossings/recent", async (req, res, next) => {
  try {
    const userId = actor(req);
    const rows = await db.select({
      id: crossingsTable.id, pairKey: crossingsTable.pairKey, area: crossingsTable.area, city: crossingsTable.city,
      distanceBand: crossingsTable.distanceBand, occurredAt: crossingsTable.occurredAt,
    }).from(crossingsTable).where(and(
      or(eq(crossingsTable.userAId, userId), eq(crossingsTable.userBId, userId)),
      gte(crossingsTable.occurredAt, new Date(Date.now() - 30 * 86_400_000)),
    )).orderBy(desc(crossingsTable.occurredAt)).limit(200);
    const totals = new Map<string, number>();
    rows.forEach((row) => totals.set(row.pairKey, (totals.get(row.pairKey) ?? 0) + 1));
    res.json({ crossings: rows.map(({ pairKey, ...row }) => ({ ...row, repeatedCount: totals.get(pairKey) ?? 1 })) });
  } catch (error) { next(error); }
});

export default router;
