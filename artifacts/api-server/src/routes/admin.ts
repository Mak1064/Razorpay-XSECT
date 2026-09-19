import {
  adminUsersTable, aiQueriesTable, analyticsEventName, analyticsEventsTable,
  connectionTable, crossingsTable, db, introductionRequestsTable, messageTable, missedXsectsTable,
  offersTable, organizationsTable, planOverridesTable, professionalProfileTable, standingAlertsTable,
  wantsTable, xsectsTable,
} from "@workspace/db";
import { and, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { track } from "../lib/analytics";
import { AREAS } from "../lib/geo";
import { getEffectivePlan } from "../lib/entitlements";
import { isAdmin, requireAdmin } from "../middlewares/requireAdmin";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { engine } from "../services/xsect-engine";
import { simulateArea, simulateCrossing, simulateUserDay } from "../services/admin/simulation";

const router: IRouter = Router();
router.use(requireAuth);
const actor = (req: Request) => (req as AuthenticatedRequest).userId;
const bad = (res: Response, message: string, status = 400): void => { res.status(status).json({ error: message }); };
const planSchema = z.enum(["free", "pro", "pro_plus"]);
const distanceBandSchema = z.enum(["lt_250m", "250m_500m", "500m_1km", "1km_2km", "2km_5km", "5km_plus"]);

router.get("/admin/me", async (req, res, next) => {
  try {
    const userId = actor(req);
    const effective = await getEffectivePlan(userId);
    res.json({ isAdmin: await isAdmin(userId), plan: effective.plan, planSource: effective.source });
  } catch (error) { next(error); }
});

router.post("/admin/bootstrap", async (req, res, next) => {
  try {
    const admin = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(934721)`);
      const existing = await tx.select({ userId: adminUsersTable.userId }).from(adminUsersTable).limit(1);
      if (existing.length) return null;
      return (await tx.insert(adminUsersTable).values({ userId: actor(req), grantedBy: actor(req) }).returning())[0];
    });
    if (!admin) return bad(res, "Admin access has already been claimed.", 409);
    res.status(201).json({ admin });
  } catch (error) { next(error); }
});

router.post("/access/plan", async (req, res, next) => {
  try {
    if (process.env.DEMO_PLAN_SWITCH === "false") return bad(res, "Demo plan switching is disabled.", 403);
    const parsed = planSchema.safeParse(req.body?.plan);
    if (!parsed.success) return bad(res, "plan must be free, pro, or pro_plus.");
    const userId = actor(req);
    const [override] = await db.insert(planOverridesTable).values({ userId, plan: parsed.data, setBy: userId })
      .onConflictDoUpdate({ target: planOverridesTable.userId, set: { plan: parsed.data, setBy: userId, updatedAt: new Date() } }).returning();
    await track("plan_switched", userId, { plan: parsed.data, source: "self_service_demo" });
    res.json({ override });
  } catch (error) { next(error); }
});

const clientEvents = new Set(["xsect_viewed", "missed_xsect_viewed"]);
router.post("/analytics/events", async (req, res, next) => {
  try {
    if (!clientEvents.has(req.body?.name)) return bad(res, "Event name is not allowed.");
    const properties = req.body?.properties;
    if (properties !== undefined && (!properties || typeof properties !== "object" || Array.isArray(properties))) return bad(res, "properties must be an object.");
    await track(req.body.name, actor(req), properties ?? {});
    res.status(201).json({ tracked: true });
  } catch (error) { next(error); }
});

router.use("/admin", requireAdmin);

const total = async (table: Parameters<typeof db.select>[0] extends never ? never : any, where?: any) => {
  const query = db.select({ value: count() }).from(table);
  const rows = where ? await query.where(where) : await query;
  return Number(rows[0]?.value ?? 0);
};

router.get("/admin/areas", (_req, res) => {
  res.json({ areas: AREAS.map(({ city, area }) => ({ city, area })) });
});

router.get("/admin/overview", async (_req, res, next) => {
  try {
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const [
      users, onboarded, wants, offers, organizations, crossing24h, crossing7d, crossings,
      missedActive, acceptedConnections, messages, intros, alerts, aiQueries, overrideRows,
      xsectGroups, topAreas,
    ] = await Promise.all([
      total(professionalProfileTable),
      total(professionalProfileTable, eq(professionalProfileTable.onboardingComplete, true)),
      total(wantsTable), total(offersTable), total(organizationsTable),
      total(crossingsTable, gte(crossingsTable.occurredAt, dayAgo)),
      total(crossingsTable, gte(crossingsTable.occurredAt, weekAgo)), total(crossingsTable),
      total(missedXsectsTable, eq(missedXsectsTable.status, "active")),
      total(connectionTable, eq(connectionTable.status, "accepted")), total(messageTable),
      total(introductionRequestsTable), total(standingAlertsTable), total(aiQueriesTable),
      db.select({ plan: planOverridesTable.plan, value: count() }).from(planOverridesTable)
        .innerJoin(professionalProfileTable, eq(professionalProfileTable.userId, planOverridesTable.userId)).groupBy(planOverridesTable.plan),
      db.select({ type: xsectsTable.type, status: xsectsTable.status, value: count() }).from(xsectsTable).groupBy(xsectsTable.type, xsectsTable.status),
      db.select({ city: crossingsTable.city, area: crossingsTable.area, crossings: count() }).from(crossingsTable)
        .groupBy(crossingsTable.city, crossingsTable.area).orderBy(desc(count())).limit(10),
    ]);
    const plans = { free: users, pro: 0, pro_plus: 0 };
    for (const row of overrideRows) {
      plans[row.plan] = Number(row.value);
      plans.free -= Number(row.value);
    }
    res.json({
      counts: { users, onboarded, wants, offers, organizations, crossings: { last24h: crossing24h, last7d: crossing7d, total: crossings }, missedActive, connectionsAccepted: acceptedConnections, messages, intros, alerts, aiQueries },
      xsects: xsectGroups.map((row) => ({ ...row, value: Number(row.value) })),
      planDistribution: plans,
      topAreas: topAreas.map((row) => ({ ...row, crossings: Number(row.crossings) })),
    });
  } catch (error) { next(error); }
});

router.get("/admin/users", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const query = String(req.query.q ?? "").trim();
    const where = query ? or(
      ilike(professionalProfileTable.displayName, `%${query}%`),
      ilike(professionalProfileTable.role, `%${query}%`),
      ilike(professionalProfileTable.userId, `%${query}%`),
    ) : undefined;
    const profiles = await db.select().from(professionalProfileTable).where(where).orderBy(desc(professionalProfileTable.lastActiveAt)).limit(25).offset((page - 1) * 25);
    const ids = profiles.map((profile) => profile.userId);
    const countMap = async (table: typeof wantsTable | typeof offersTable | typeof xsectsTable) => {
      if (!ids.length) return new Map<string, number>();
      const rows = await db.select({ userId: table.userId, value: count() }).from(table).where(inArray(table.userId, ids)).groupBy(table.userId);
      return new Map(rows.map((row) => [row.userId, Number(row.value)]));
    };
    const [wantCounts, offerCounts, xsectCounts, resultCount] = await Promise.all([
      countMap(wantsTable), countMap(offersTable), countMap(xsectsTable),
      total(professionalProfileTable, where),
    ]);
    res.json({
      users: profiles.map((profile) => ({
        userId: profile.userId, displayName: profile.displayName, role: profile.role, city: profile.city, area: profile.area,
        trustLevel: profile.trustLevel, visibility: profile.visibility, lastActiveAt: profile.lastActiveAt,
        counts: { wants: wantCounts.get(profile.userId) ?? 0, offers: offerCounts.get(profile.userId) ?? 0, xsects: xsectCounts.get(profile.userId) ?? 0 },
      })),
      page, total: resultCount, pages: Math.ceil(resultCount / 25),
    });
  } catch (error) { next(error); }
});

router.get("/admin/users/:id", async (req, res, next) => {
  try {
    const profile = (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, req.params.id)).limit(1))[0];
    if (!profile) return bad(res, "User not found.", 404);
    const [wants, offers, xsects, crossings, missed] = await Promise.all([
      db.select().from(wantsTable).where(eq(wantsTable.userId, profile.userId)).orderBy(desc(wantsTable.createdAt)),
      db.select().from(offersTable).where(eq(offersTable.userId, profile.userId)).orderBy(desc(offersTable.createdAt)),
      db.select().from(xsectsTable).where(eq(xsectsTable.userId, profile.userId)).orderBy(desc(xsectsTable.createdAt)),
      db.select({
        id: crossingsTable.id, city: crossingsTable.city, area: crossingsTable.area, distanceBand: crossingsTable.distanceBand,
        occurredAt: crossingsTable.occurredAt, durationMinutes: crossingsTable.durationMinutes, source: crossingsTable.source,
      }).from(crossingsTable).where(or(eq(crossingsTable.userAId, profile.userId), eq(crossingsTable.userBId, profile.userId))).orderBy(desc(crossingsTable.occurredAt)),
      db.select().from(missedXsectsTable).where(eq(missedXsectsTable.userId, profile.userId)).orderBy(desc(missedXsectsTable.occurredAt)),
    ]);
    const safeProfile = Object.fromEntries(Object.entries(profile).filter(([key]) => key !== "approxLat" && key !== "approxLng"));
    res.json({ profile: safeProfile, wants, offers, xsects, crossings, missed });
  } catch (error) { next(error); }
});

const crossingSchema = z.object({
  userAId: z.string().min(1), userBId: z.string().min(1), city: z.string().min(1), area: z.string().min(1),
  distanceBand: distanceBandSchema, occurredAt: z.coerce.date().optional(), durationMinutes: z.number().int().min(1).max(1440).optional(),
});
router.post("/admin/simulate/crossing", async (req, res, next) => {
  try {
    const parsed = crossingSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid crossing.");
    res.status(201).json(await simulateCrossing({ ...parsed.data, adminId: actor(req) }));
  } catch (error) { if (error instanceof Error) return bad(res, error.message, 409); next(error); }
});

router.post("/admin/simulate/area", async (req, res, next) => {
  try {
    const parsed = z.object({ city: z.string().min(1), area: z.string().min(1), count: z.number().int().min(1).max(100).default(10), includeUserId: z.string().min(1).optional() }).safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid area simulation.");
    res.status(201).json(await simulateArea({ ...parsed.data, adminId: actor(req) }));
  } catch (error) { if (error instanceof Error) return bad(res, error.message, 409); next(error); }
});

router.post("/admin/simulate/user-day", async (req, res, next) => {
  try {
    const parsed = z.object({ userId: z.string().min(1), crossings: z.number().int().min(1).max(50).default(5) }).safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid user-day simulation.");
    res.status(201).json(await simulateUserDay({ ...parsed.data, adminId: actor(req) }));
  } catch (error) { if (error instanceof Error) return bad(res, error.message, 409); next(error); }
});

router.post("/admin/recompute", async (req, res, next) => {
  try {
    const parsed = z.object({ userId: z.string().min(1).optional() }).safeParse(req.body ?? {});
    if (!parsed.success) return bad(res, "Invalid userId.");
    const ids = parsed.data.userId ? [parsed.data.userId] : (await db.select({ userId: professionalProfileTable.userId }).from(professionalProfileTable).where(eq(professionalProfileTable.onboardingComplete, true))).map((row) => row.userId);
    let intent = 0;
    let time = 0;
    for (const id of ids) {
      intent += await engine.recomputeIntentXsects(id);
      time += await engine.recomputeTimeXsects(id);
    }
    res.json({ users: ids.length, intent, time, summary: `Recomputed intent and Time XSECTs for ${ids.length} user${ids.length === 1 ? "" : "s"}; ${intent + time} rows were written or updated.` });
  } catch (error) { next(error); }
});

router.post("/admin/expire", async (_req, res, next) => {
  try {
    const result = await engine.expireStale();
    res.json({ ...result, summary: `Expired ${result.xsects} XSECTs, ${result.missed} missed entries, and ${result.alerts} alerts.` });
  } catch (error) { next(error); }
});

router.get("/admin/plan-overrides", async (_req, res, next) => {
  try {
    const rows = await db.select({
      userId: planOverridesTable.userId, plan: planOverridesTable.plan, setBy: planOverridesTable.setBy,
      createdAt: planOverridesTable.createdAt, updatedAt: planOverridesTable.updatedAt,
      displayName: professionalProfileTable.displayName, role: professionalProfileTable.role,
    }).from(planOverridesTable).leftJoin(professionalProfileTable, eq(professionalProfileTable.userId, planOverridesTable.userId)).orderBy(desc(planOverridesTable.updatedAt));
    res.json({ overrides: rows });
  } catch (error) { next(error); }
});

router.put("/admin/plan-overrides/:userId", async (req, res, next) => {
  try {
    const parsed = planSchema.safeParse(req.body?.plan);
    if (!parsed.success) return bad(res, "Invalid plan.");
    const [override] = await db.insert(planOverridesTable).values({ userId: req.params.userId, plan: parsed.data, setBy: actor(req) })
      .onConflictDoUpdate({ target: planOverridesTable.userId, set: { plan: parsed.data, setBy: actor(req), updatedAt: new Date() } }).returning();
    await track("plan_switched", req.params.userId, { plan: parsed.data, source: "admin", setBy: actor(req) });
    res.json({ override });
  } catch (error) { next(error); }
});

router.delete("/admin/plan-overrides/:userId", async (req, res, next) => {
  try {
    await db.delete(planOverridesTable).where(eq(planOverridesTable.userId, req.params.userId));
    const effective = await getEffectivePlan(req.params.userId);
    await track("plan_switched", req.params.userId, { plan: effective.plan, source: "admin_override_removed", setBy: actor(req) });
    res.status(204).send();
  } catch (error) { next(error); }
});

router.get("/admin/analytics/funnel", async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 86400000);
    const steps = ["signup", "profile_completed", "want_created", "offer_created", "xsect_created", "request_sent", "request_accepted", "chat_started"] as const;
    const grouped = await db.select({ name: analyticsEventsTable.name, value: sql<number>`count(distinct ${analyticsEventsTable.userId})` })
      .from(analyticsEventsTable).where(and(gte(analyticsEventsTable.createdAt, since), inArray(analyticsEventsTable.name, [...steps]))).groupBy(analyticsEventsTable.name);
    const values = new Map(grouped.map((row) => [row.name, Number(row.value)]));
    const funnel = steps.map((name, index) => {
      const value = values.get(name) ?? 0;
      const previous = index ? values.get(steps[index - 1]!) ?? 0 : value;
      return { name, label: name === "request_accepted" ? "mutual_consent" : name, count: value, conversion: index === 0 ? 100 : previous ? Math.round(value / previous * 1000) / 10 : 0 };
    });
    const daily = await db.select({
      day: sql<string>`to_char(date_trunc('day', ${analyticsEventsTable.createdAt}), 'YYYY-MM-DD')`,
      name: analyticsEventsTable.name, value: count(),
    }).from(analyticsEventsTable).where(and(
      gte(analyticsEventsTable.createdAt, since),
      inArray(analyticsEventsTable.name, ["xsect_created", "request_sent"]),
    )).groupBy(sql`date_trunc('day', ${analyticsEventsTable.createdAt})`, analyticsEventsTable.name).orderBy(sql`date_trunc('day', ${analyticsEventsTable.createdAt})`);
    const series = new Map<string, { date: string; xsect_created: number; request_sent: number }>();
    for (const row of daily) {
      const item = series.get(row.day) ?? { date: row.day, xsect_created: 0, request_sent: 0 };
      item[row.name as "xsect_created" | "request_sent"] = Number(row.value);
      series.set(row.day, item);
    }
    res.json({ days, funnel, daily: [...series.values()] });
  } catch (error) { next(error); }
});

router.get("/admin/analytics/events", async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const name = typeof req.query.name === "string" && analyticsEventName.includes(req.query.name as typeof analyticsEventName[number]) ? req.query.name as typeof analyticsEventName[number] : undefined;
    const where = and(gte(analyticsEventsTable.createdAt, new Date(Date.now() - days * 86400000)), name ? eq(analyticsEventsTable.name, name) : undefined);
    const events = await db.select().from(analyticsEventsTable).where(where).orderBy(desc(analyticsEventsTable.createdAt)).limit(200);
    res.json({ events });
  } catch (error) { next(error); }
});

router.get("/admin/admins", async (_req, res, next) => {
  try {
    const admins = await db.select({
      userId: adminUsersTable.userId, grantedBy: adminUsersTable.grantedBy, createdAt: adminUsersTable.createdAt,
      displayName: professionalProfileTable.displayName, role: professionalProfileTable.role,
    }).from(adminUsersTable).leftJoin(professionalProfileTable, eq(professionalProfileTable.userId, adminUsersTable.userId)).orderBy(adminUsersTable.createdAt);
    res.json({ admins });
  } catch (error) { next(error); }
});

router.post("/admin/admins", async (req, res, next) => {
  try {
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return bad(res, "userId is required.");
    const [admin] = await db.insert(adminUsersTable).values({ userId: parsed.data.userId, grantedBy: actor(req) }).onConflictDoNothing().returning();
    const existing = admin ?? (await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, parsed.data.userId)).limit(1))[0];
    res.status(admin ? 201 : 200).json({ admin: existing });
  } catch (error) { next(error); }
});

router.delete("/admin/admins/:userId", async (req, res, next) => {
  try {
    if (req.params.userId === actor(req)) {
      const admins = await total(adminUsersTable);
      if (admins <= 1) return bad(res, "You cannot remove yourself as the last administrator.", 409);
    }
    await db.delete(adminUsersTable).where(eq(adminUsersTable.userId, req.params.userId));
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;