import { db, connectionTable, conversationTable, eventRsvpTable, eventTable, messageTable, notificationTable } from "@workspace/db";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);
const actor = (req: Request) => (req as AuthenticatedRequest).userId;
const bad = (res: Response, message: string, status = 400): void => { res.status(status).json({ error: message }); };

async function notify(userId: string, type: string, title: string, body: string, resourceId?: string) {
  await db.insert(notificationTable).values({ userId, type, title, body, resourceId });
}
async function connectionFor(a: string, b: string) {
  return (await db.select().from(connectionTable).where(or(
    and(eq(connectionTable.requesterId, a), eq(connectionTable.recipientId, b)),
    and(eq(connectionTable.requesterId, b), eq(connectionTable.recipientId, a)),
  )).limit(1))[0];
}
async function accepted(a: string, b: string) {
  const c = await connectionFor(a, b);
  return c?.status === "accepted";
}

router.get("/social/connections", async (req, res, next) => {
  try {
    const userId = actor(req);
    const rows = await db.select().from(connectionTable).where(or(eq(connectionTable.requesterId, userId), eq(connectionTable.recipientId, userId))).orderBy(desc(connectionTable.updatedAt));
    const view = (c: typeof rows[number]) => ({ ...c, identity: c.status === "accepted" ? { userId: c.requesterId === userId ? c.recipientId : c.requesterId } : null });
    res.json({ incoming: rows.filter(c => c.recipientId === userId && c.status === "pending").map(view), outgoing: rows.filter(c => c.requesterId === userId && c.status === "pending").map(view), accepted: rows.filter(c => c.status === "accepted").map(view), all: rows.map(view) });
  } catch (e) { next(e); }
});

router.post("/social/connections/request", async (req, res, next) => {
  try {
    const userId = actor(req); const target = typeof req.body?.targetUserId === "string" ? req.body.targetUserId : "";
    if (!target || target === userId) return bad(res, "A different targetUserId is required.");
    const existing = await connectionFor(userId, target);
    if (existing?.status === "accepted" || existing?.status === "blocked") return bad(res, "Connection cannot be requested.", 409);
    if (existing?.status === "pending") return res.json({ connection: existing });
    const [c] = existing
      ? await db.update(connectionTable).set({ requesterId: userId, recipientId: target, status: "pending", blockedBy: null }).where(eq(connectionTable.id, existing.id)).returning()
      : await db.insert(connectionTable).values({ requesterId: userId, recipientId: target }).returning();
    await notify(target, "connection_request", "New connection request", "Someone would like to connect with you.", c.id);
    res.status(201).json({ connection: c });
  } catch (e) { next(e); }
});

async function transition(req: any, res: any, next: any, status: "accepted" | "declined" | "withdrawn" | "blocked") {
  try {
    const userId = actor(req); const id = typeof req.body?.connectionId === "string" ? req.body.connectionId : req.params.id;
    const c = (await db.select().from(connectionTable).where(eq(connectionTable.id, id)).limit(1))[0];
    if (!c || (c.requesterId !== userId && c.recipientId !== userId)) return bad(res, "Connection not found.", 404);
    const allowed = status === "accepted" || status === "declined" ? c.recipientId === userId : true;
    if (!allowed) return bad(res, "Only the recipient may respond.", 403);
    if (c.status === status) return res.json({ connection: c });
    const valid = (status === "accepted" && c.status === "pending") || (status === "declined" && c.status === "pending") || (status === "withdrawn" && c.status === "pending" && c.requesterId === userId) || (status === "blocked" && c.status !== "blocked");
    if (!valid) return bad(res, "Invalid connection state transition.", 409);
    const [updated] = await db.update(connectionTable).set({ status, blockedBy: status === "blocked" ? userId : null }).where(eq(connectionTable.id, id)).returning();
    const other = c.requesterId === userId ? c.recipientId : c.requesterId;
    if (status === "accepted") await notify(other, "connection_accepted", "Connection accepted", "Your connection request was accepted.", c.id);
    res.json({ connection: updated });
  } catch (e) { next(e); }
}
router.post("/social/connections/:id/accept", (req, res, next) => transition(req, res, next, "accepted"));
router.post("/social/connections/:id/decline", (req, res, next) => transition(req, res, next, "declined"));
router.post("/social/connections/:id/withdraw", (req, res, next) => transition(req, res, next, "withdrawn"));
router.post("/social/connections/:id/block", (req, res, next) => transition(req, res, next, "blocked"));

router.get("/social/conversations", async (req, res, next) => {
  try {
    const userId = actor(req);
    const rows = await db.select().from(conversationTable).where(or(eq(conversationTable.participantA, userId), eq(conversationTable.participantB, userId)));
    res.json({ conversations: rows });
  } catch (e) { next(e); }
});
router.post("/social/conversations", async (req, res, next) => {
  try {
    const userId = actor(req); const target = typeof req.body?.targetUserId === "string" ? req.body.targetUserId : "";
    if (!target || !(await accepted(userId, target))) return bad(res, "An accepted connection is required.", 403);
    const [a, b] = [userId, target].sort();
    const existing = (await db.select().from(conversationTable).where(and(eq(conversationTable.participantA, a), eq(conversationTable.participantB, b))).limit(1))[0];
    const conversation = existing ?? (await db.insert(conversationTable).values({ participantA: a, participantB: b }).returning())[0];
    res.status(existing ? 200 : 201).json({ conversation });
  } catch (e) { next(e); }
});
router.get("/social/conversations/:id/messages", async (req, res, next) => {
  try {
    const userId = actor(req); const c = (await db.select().from(conversationTable).where(eq(conversationTable.id, req.params.id)).limit(1))[0];
    if (!c || (c.participantA !== userId && c.participantB !== userId) || !(await accepted(c.participantA, c.participantB))) return bad(res, "Conversation unavailable.", 403);
    res.json({ messages: await db.select().from(messageTable).where(eq(messageTable.conversationId, c.id)).orderBy(messageTable.createdAt) });
  } catch (e) { next(e); }
});
router.post("/social/conversations/:id/messages", async (req, res, next) => {
  try {
    const userId = actor(req); const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    const c = (await db.select().from(conversationTable).where(eq(conversationTable.id, req.params.id)).limit(1))[0];
    if (!c || (c.participantA !== userId && c.participantB !== userId) || !(await accepted(c.participantA, c.participantB))) return bad(res, "Messaging requires an accepted connection.", 403);
    if (!body || body.length > 5000) return bad(res, "Message body is required.");
    const [m] = await db.insert(messageTable).values({ conversationId: c.id, senderId: userId, body }).returning();
    await notify(c.participantA === userId ? c.participantB : c.participantA, "new_message", "New message", "You have a new message.", c.id);
    res.status(201).json({ message: m });
  } catch (e) { next(e); }
});
router.post("/social/conversations/:id/read", async (req, res, next) => {
  try {
    const userId = actor(req); const c = (await db.select().from(conversationTable).where(eq(conversationTable.id, req.params.id)).limit(1))[0];
    if (!c || (c.participantA !== userId && c.participantB !== userId)) return bad(res, "Conversation unavailable.", 403);
    await db.update(messageTable).set({ readAt: new Date() }).where(and(eq(messageTable.conversationId, c.id), sql`${messageTable.senderId} <> ${userId}`, sql`${messageTable.readAt} is null`));
    res.json({ read: true });
  } catch (e) { next(e); }
});

const seedEvents = [
  { title: "XSECT Founder Supper", description: "An intimate evening for builders, operators, and curious collaborators.", location: "Downtown community table", startsAt: new Date("2026-06-12T18:30:00Z"), capacity: "24" },
  { title: "Creative Systems Workshop", description: "A practical session on turning ideas into repeatable creative systems.", location: "Arts district studio", startsAt: new Date("2026-06-20T16:00:00Z"), capacity: "40" },
];
async function ensureEvents() {
  const existing = await db.select({ id: eventTable.id }).from(eventTable).limit(1);
  if (!existing.length) await db.insert(eventTable).values(seedEvents);
}
router.get("/social/events", async (_req, res, next) => {
  try { await ensureEvents(); res.json({ events: await db.select().from(eventTable).orderBy(eventTable.startsAt) }); } catch (e) { next(e); }
});
router.get("/social/events/:id", async (req, res, next) => {
  try {
    await ensureEvents();
    const event = (await db.select().from(eventTable).where(eq(eventTable.id, req.params.id)).limit(1))[0];
    if (!event) return bad(res, "Event not found.", 404);
    const rsvp = (await db.select().from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, event.id), eq(eventRsvpTable.userId, actor(req)))).limit(1))[0];
    res.json({ event, rsvp: rsvp ?? null });
  } catch (e) { next(e); }
});
router.post("/social/events/:id/rsvp", async (req, res, next) => {
  try {
    const userId = actor(req); const event = (await db.select().from(eventTable).where(eq(eventTable.id, req.params.id)).limit(1))[0];
    if (!event) return bad(res, "Event not found.", 404);
    const current = (await db.select().from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, event.id), eq(eventRsvpTable.userId, userId))).limit(1))[0];
    if (current && current.status !== "cancelled") return res.json({ rsvp: current });
    const confirmed = await db.select({ id: eventRsvpTable.id }).from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, event.id), eq(eventRsvpTable.status, "confirmed")));
    const status = confirmed.length >= Number(event.capacity) ? "waitlisted" : "confirmed";
    const [rsvp] = current
      ? await db.update(eventRsvpTable).set({ status }).where(eq(eventRsvpTable.id, current.id)).returning()
      : await db.insert(eventRsvpTable).values({ eventId: event.id, userId, status }).returning();
    await notify(userId, "rsvp_status", `RSVP ${status}`, `Your RSVP for ${event.title} is ${status}.`, event.id);
    res.status(201).json({ rsvp });
  } catch (e) { next(e); }
});
router.post("/social/events/:id/invite", async (req, res, next) => {
  try {
    const userId = actor(req); const target = typeof req.body?.targetUserId === "string" ? req.body.targetUserId : "";
    if (!target || !(await accepted(userId, target))) return bad(res, "You may only invite an accepted connection.", 403);
    const event = (await db.select().from(eventTable).where(eq(eventTable.id, req.params.id)).limit(1))[0];
    if (!event) return bad(res, "Event not found.", 404);
    const existing = (await db.select().from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, event.id), eq(eventRsvpTable.userId, target))).limit(1))[0];
    const rsvp = existing ?? (await db.insert(eventRsvpTable).values({ eventId: event.id, userId: target, status: "requested" }).returning())[0];
    await notify(target, "event_invite", "Event invitation", `You were invited to ${event.title}.`, event.id);
    res.status(existing ? 200 : 201).json({ rsvp });
  } catch (e) { next(e); }
});
router.post("/social/events/:id/cancel", async (req, res, next) => {
  try {
    const r = (await db.select().from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, req.params.id), eq(eventRsvpTable.userId, actor(req)))).limit(1))[0];
    if (!r) { res.json({ cancelled: true }); return; }
    const [updated] = await db.update(eventRsvpTable).set({ status: "cancelled" }).where(eq(eventRsvpTable.id, r.id)).returning();
    res.json({ rsvp: updated });
  } catch (e) { next(e); }
});
router.get("/social/notifications", async (req, res, next) => {
  try { res.json({ notifications: await db.select().from(notificationTable).where(eq(notificationTable.userId, actor(req))).orderBy(desc(notificationTable.createdAt)) }); } catch (e) { next(e); }
});
router.post("/social/notifications/:id/read", async (req, res, next) => {
  try {
    const [n] = await db.update(notificationTable).set({ readAt: new Date() }).where(and(eq(notificationTable.id, req.params.id), eq(notificationTable.userId, actor(req)))).returning();
    if (!n) return bad(res, "Notification not found.", 404); res.json({ notification: n });
  } catch (e) { next(e); }
});
router.post("/social/notifications/read-all", async (req, res, next) => {
  try { await db.update(notificationTable).set({ readAt: new Date() }).where(and(eq(notificationTable.userId, actor(req)), sql`${notificationTable.readAt} is null`)); res.json({ read: true }); } catch (e) { next(e); }
});

export default router;