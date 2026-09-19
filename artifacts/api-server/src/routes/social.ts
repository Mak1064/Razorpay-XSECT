import { db, connectionTable, conversationTable, eventRsvpTable, eventTable, eventAdminTable, eventGenerationTable, eventReportTable, professionalProfileTable, messageTable, notificationTable, consentAuditTable, reportTable, introductionTable } from "@workspace/db";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { engine } from "../services/xsect-engine";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();
const conversationStreams = new Map<string, Set<Response>>();
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
    if (status === "accepted") await engine.syncPairState(c.requesterId, c.recipientId, "connected");
    if (status === "blocked") await engine.syncPairState(c.requesterId, c.recipientId, "dismissed");
    res.json({ connection: updated });
  } catch (e) { next(e); }
}
router.post("/social/connections/:id/accept", (req, res, next) => transition(req, res, next, "accepted"));
router.post("/social/connections/:id/decline", (req, res, next) => transition(req, res, next, "declined"));
router.post("/social/connections/:id/withdraw", (req, res, next) => transition(req, res, next, "withdrawn"));
router.post("/social/connections/:id/block", (req, res, next) => transition(req, res, next, "blocked"));

router.get("/social/connections/:id/consent", async (req, res, next) => {
  try { const userId=actor(req); const c=(await db.select().from(connectionTable).where(eq(connectionTable.id, req.params.id)).limit(1))[0]; if(!c || (c.requesterId!==userId && c.recipientId!==userId)) return bad(res,"Connection not found.",404); res.json({ history: await db.select().from(consentAuditTable).where(eq(consentAuditTable.connectionId,c.id)).orderBy(desc(consentAuditTable.createdAt)) }); } catch(e){ next(e); }
});
router.post("/social/connections/:id/reveal", async (req,res,next)=>{
  try { const userId=actor(req); const c=(await db.select().from(connectionTable).where(eq(connectionTable.id,req.params.id)).limit(1))[0]; if(!c || c.status!=="accepted" || (c.requesterId!==userId && c.recipientId!==userId)) return bad(res,"Mutual accepted connection required.",403); const fields=Array.isArray(req.body?.fields)?req.body.fields.filter((x:string)=>["name","role","intent","contact"].includes(x)):[]; if(fields.includes("contact")){ const prior=await db.select().from(consentAuditTable).where(and(eq(consentAuditTable.connectionId,c.id),eq(consentAuditTable.action,"reveal"))); if(!prior.some(x=>x.actorId!==userId && Array.isArray(x.fields) && (x.fields as string[]).includes("contact"))) return bad(res,"Contact reveal requires bilateral consent.",409); } const [a]=await db.insert(consentAuditTable).values({connectionId:c.id,actorId:userId,action:"reveal",contextId:typeof req.body?.contextId==="string"?req.body.contextId:null,fields}).returning(); res.status(201).json({audit:a}); } catch(e){next(e);}
});
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
    res.json({ messages: await db.select().from(messageTable).where(and(eq(messageTable.conversationId, c.id), ne(messageTable.status, "hidden"))).orderBy(messageTable.createdAt) });
  } catch (e) { next(e); }
});
router.post("/social/conversations/:id/messages", async (req, res, next) => {
  try {
    const userId = actor(req); const body = typeof req.body?.body === "string" ? req.body.body.trim() : (typeof req.body?.content === "string" ? req.body.content.trim() : "");
    const c = (await db.select().from(conversationTable).where(eq(conversationTable.id, req.params.id)).limit(1))[0];
    if (!c || (c.participantA !== userId && c.participantB !== userId) || !(await accepted(c.participantA, c.participantB))) return bad(res, "Messaging requires an accepted connection.", 403);
    const attachment = req.body?.attachment;
     if (!body && !attachment) return bad(res, "Message body or attachment is required.");
     if (body.length > 5000) return bad(res, "Message body is too long.");
     if (attachment) { const valid = typeof attachment === "object" && typeof attachment.url === "string" && /^\/api\/storage\/objects\/[A-Za-z0-9._\/-]+$/.test(attachment.url) && typeof attachment.contentType === "string" && /^(image\/(png|jpeg|webp|gif)|application\/pdf|text\/plain)$/.test(attachment.contentType) && Number.isInteger(attachment.size) && attachment.size > 0 && attachment.size <= 10 * 1024 * 1024; if (!valid) return bad(res, "Attachment metadata is invalid or storage URL is not trusted."); }
    const [m] = await db.insert(messageTable).values({ conversationId: c.id, senderId: userId, body: body || "[Attachment]", attachment: attachment ?? null }).returning();
    await notify(c.participantA === userId ? c.participantB : c.participantA, "new_message", "New message", "You have a new message.", c.id);
    res.status(201).json({ message: m });
  } catch (e) { next(e); }
});
router.post("/social/conversations/:id/typing", async (req,res,next)=>{ try { const userId=actor(req); const c=(await db.select().from(conversationTable).where(eq(conversationTable.id,req.params.id)).limit(1))[0]; if(!c || (c.participantA!==userId && c.participantB!==userId) || !(await accepted(c.participantA,c.participantB))) return bad(res,"Conversation unavailable.",403); const typing=Boolean(req.body?.typing); conversationStreams.get(c.id)?.forEach(stream=>stream.write('event: typing\ndata: '+JSON.stringify({userId,typing})+'\n\n')); res.json({typing}); } catch(e){next(e);} });
router.get("/social/conversations/:id/events", async (req,res,next)=>{
  try { const userId=actor(req); const c=(await db.select().from(conversationTable).where(eq(conversationTable.id,req.params.id)).limit(1))[0]; if(!c || (c.participantA!==userId && c.participantB!==userId)) return bad(res,"Conversation unavailable.",403); res.set({"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive"}); res.flushHeaders(); const streams=conversationStreams.get(c.id) ?? new Set<Response>(); streams.add(res); conversationStreams.set(c.id,streams); const timer=setInterval(()=>res.write(`event: ping\ndata: {}\n\n`),25000); req.on("close",()=>{clearInterval(timer); streams.delete(res); if(!streams.size) conversationStreams.delete(c.id);}); } catch(e){next(e);}
});
router.post("/social/conversations/:id/read", async (req, res, next) => {
  try {
    const userId = actor(req); const c = (await db.select().from(conversationTable).where(eq(conversationTable.id, req.params.id)).limit(1))[0];
    if (!c || (c.participantA !== userId && c.participantB !== userId)) return bad(res, "Conversation unavailable.", 403);
    await db.update(messageTable).set({ readAt: new Date(), status: "read" }).where(and(eq(messageTable.conversationId, c.id), sql`${messageTable.senderId} <> ${userId}`, sql`${messageTable.readAt} is null`));
    res.json({ read: true });
  } catch (e) { next(e); }
});

const terms = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.toLowerCase()) : [];
async function relevance(eventId: string, viewerId: string) {
  const event = (await db.select().from(eventTable).where(eq(eventTable.id, eventId)).limit(1))[0];
  const viewer = (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, viewerId)).limit(1))[0];
  if (!event || !viewer) return { status: "unavailable", reason: "Complete a professional profile with Wants, Offers, or skills to see relevance." };
  const eventTerms = terms(event.intentTags);
  const viewerTerms = new Set([...terms(viewer.wants), ...terms(viewer.offers), ...terms(viewer.skills)]);
  const shared = eventTerms.filter((term) => viewerTerms.has(term));
  return eventTerms.length ? { status: "available", score: Math.round((shared.length / eventTerms.length) * 100), shared } : { status: "unavailable", reason: "This event has no intent tags yet." };
}
router.get("/social/events", async (req, res, next) => {
  try {
    const userId = actor(req);
    const events = await db.select().from(eventTable).orderBy(eventTable.startsAt);
    const rsvps = await db.select().from(eventRsvpTable).where(eq(eventRsvpTable.userId, userId));
    res.json({ events: await Promise.all(events.map(async (event) => ({
      ...event,
      attendeeCount: 0,
      rsvp: rsvps.find((r) => r.eventId === event.id) ?? null,
      matching: await relevance(event.id, userId),
    }))) });
  } catch (e) { next(e); }
});
router.get("/social/events/:id", async (req, res, next) => {
  try {
    const event = (await db.select().from(eventTable).where(eq(eventTable.id, req.params.id)).limit(1))[0];
    if (!event) return bad(res, "Event not found.", 404);
    const rsvp = (await db.select().from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, event.id), eq(eventRsvpTable.userId, actor(req)))).limit(1))[0];
    const admins = await db.select({ userId: eventAdminTable.userId, role: eventAdminTable.role }).from(eventAdminTable).where(eq(eventAdminTable.eventId, event.id));
    const attendees = await db.select({ id: eventRsvpTable.id, userId: eventRsvpTable.userId, status: eventRsvpTable.status }).from(eventRsvpTable).where(and(eq(eventRsvpTable.eventId, event.id), sql`${eventRsvpTable.status} in ('confirmed', 'waitlisted')`));
    const eventTerms = terms(event.intentTags);
    const attendeeViews = await Promise.all(attendees.map(async (a, i) => {
      const profile = (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, a.userId)).limit(1))[0];
      const connected = await accepted(actor(req), a.userId);
      const privateProfile = !profile || profile.privacy.stealthMode || (profile.privacy.trustedConnectionsOnly && !connected);
      const profileTerms = profile && !privateProfile ? new Set([...terms(profile.wants), ...terms(profile.offers), ...terms(profile.skills)]) : new Set<string>();
      const shared = eventTerms.filter((term) => profileTerms.has(term));
      return { id: a.id, label: `Protected attendee ${i + 1}`, status: a.status, relevance: privateProfile ? { status: "unavailable", reason: "Attendee intent is private." } : { status: "available", score: eventTerms.length ? Math.round(shared.length / eventTerms.length * 100) : 0, shared } };
    }));
    const matching = await relevance(event.id, actor(req));
    const generations = await db.select().from(eventGenerationTable).where(and(eq(eventGenerationTable.eventId, event.id), eq(eventGenerationTable.userId, actor(req)))).orderBy(desc(eventGenerationTable.createdAt));
    res.json({ event, rsvp: rsvp ?? null, admins, attendeeCount: attendees.length,
      attendees: attendeeViews,
      matching, generations });
  } catch (e) { next(e); }
});
router.post("/social/events", async (req, res, next) => {
  try {
    const userId = actor(req);
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";
    const startsAt = new Date(req.body?.startsAt);
    const capacity = Number(req.body?.capacity);
    const intentTags = Array.isArray(req.body?.intentTags) ? req.body.intentTags.filter((tag: unknown): tag is string => typeof tag === "string" && tag.trim().length > 0).map((tag: string) => tag.trim().toLowerCase()).slice(0, 30) : [];
    if (!title || title.length > 160 || !description || description.length > 5000 || !location || !Number.isFinite(startsAt.getTime()) || !Number.isInteger(capacity) || capacity < 1 || capacity > 10000) return bad(res, "Valid title, description, location, startsAt, and capacity are required.");
    const [event] = await db.insert(eventTable).values({ title, description, location, startsAt, capacity: String(capacity), createdBy: userId, intentTags, womenOnly: req.body?.womenOnly === true }).returning();
    await db.insert(eventAdminTable).values({ eventId: event.id, userId, role: "owner" });
    res.status(201).json({ event });
  } catch (e) { next(e); }
});
async function eventAdmin(eventId: string, userId: string) {
  return (await db.select().from(eventAdminTable).where(and(eq(eventAdminTable.eventId, eventId), eq(eventAdminTable.userId, userId))).limit(1))[0];
}
router.patch("/social/events/:id", async (req, res, next) => {
  try {
    const userId = actor(req); if (!(await eventAdmin(req.params.id, userId))) return bad(res, "Event administrator access required.", 403);
    const patch: Record<string, unknown> = {};
    for (const key of ["title", "description", "location"] as const) if (typeof req.body?.[key] === "string" && req.body[key].trim()) patch[key] = req.body[key].trim();
    if (req.body?.startsAt) { const d = new Date(req.body.startsAt); if (!Number.isFinite(d.getTime())) return bad(res, "Invalid startsAt."); patch.startsAt = d; }
    if (req.body?.capacity !== undefined) { const n = Number(req.body.capacity); if (!Number.isInteger(n) || n < 1) return bad(res, "Invalid capacity."); patch.capacity = String(n); }
    const [event] = await db.update(eventTable).set(patch).where(eq(eventTable.id, req.params.id)).returning();
    if (!event) return bad(res, "Event not found.", 404); res.json({ event });
  } catch (e) { next(e); }
});
router.post("/social/events/:id/cancel-event", async (req, res, next) => {
  try {
    const userId = actor(req); if (!(await eventAdmin(req.params.id, userId))) return bad(res, "Event administrator access required.", 403);
    const [event] = await db.update(eventTable).set({ cancelledAt: new Date(), cancelledReason: typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : "Cancelled by administrator." }).where(eq(eventTable.id, req.params.id)).returning();
    if (!event) return bad(res, "Event not found.", 404); res.json({ event });
  } catch (e) { next(e); }
});
router.post("/social/events/:id/admins", async (req, res, next) => {
  try {
    const userId = actor(req); if (!(await eventAdmin(req.params.id, userId))) return bad(res, "Event administrator access required.", 403);
    const target = typeof req.body?.userId === "string" ? req.body.userId.trim() : ""; if (!target) return bad(res, "userId is required.");
    const [admin] = await db.insert(eventAdminTable).values({ eventId: req.params.id, userId: target, role: "admin" }).onConflictDoNothing().returning();
    res.status(admin ? 201 : 200).json({ admin: admin ?? await eventAdmin(req.params.id, target) });
  } catch (e) { next(e); }
});
router.post("/social/events/:id/report", async (req, res, next) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : ""; if (!reason || reason.length > 200) return bad(res, "A report reason is required.");
    const [report] = await db.insert(eventReportTable).values({ eventId: req.params.id, reporterId: actor(req), reason, details: typeof req.body?.details === "string" ? req.body.details.slice(0, 2000) : null }).returning();
    res.status(201).json({ report: { id: report.id, status: report.status } });
  } catch (e) { next(e); }
});
router.get("/social/events/:id/generations", async (req, res, next) => {
  try { res.json({ generations: await db.select().from(eventGenerationTable).where(and(eq(eventGenerationTable.eventId, req.params.id), eq(eventGenerationTable.userId, actor(req)))).orderBy(desc(eventGenerationTable.createdAt)) }); } catch (e) { next(e); }
});
router.post("/social/events/:id/generations", async (req, res, next) => {
  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : ""; if (!prompt || prompt.length > 1000) return bad(res, "A prompt is required.");
    const [generation] = await db.insert(eventGenerationTable).values({ eventId: req.params.id, userId: actor(req), prompt, status: "unavailable", output: "Generation is unavailable until event intent data is present." }).returning();
    res.status(201).json({ generation });
  } catch (e) { next(e); }
});
router.get("/social/events/:id/calendar.ics", async (req, res, next) => {
  try {
    const event = (await db.select().from(eventTable).where(eq(eventTable.id, req.params.id)).limit(1))[0]; if (!event) return bad(res, "Event not found.", 404);
    const esc = (value: string) => value.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
    const stamp = event.startsAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    res.type("text/calendar").set("Content-Disposition", `attachment; filename="${event.id}.ics"`).send(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//XSECT//Events//EN\r\nBEGIN:VEVENT\r\nUID:${event.id}@xsect\r\nDTSTAMP:${stamp}\r\nDTSTART:${stamp}\r\nSUMMARY:${esc(event.title)}\r\nDESCRIPTION:${esc(event.description)}\r\nLOCATION:${esc(event.location)}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`);
  } catch (e) { next(e); }
});
router.post("/social/events/:id/rsvp", async (req, res, next) => {
  try {
    const userId = actor(req); const event = (await db.select().from(eventTable).where(eq(eventTable.id, req.params.id)).limit(1))[0];
    if (!event) return bad(res, "Event not found.", 404);
    if (event.cancelledAt) return bad(res, "This event has been cancelled.", 409);
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
router.post("/social/introductions", async (req,res,next)=>{ try { const userId=actor(req); const target=typeof req.body?.targetUserId==="string"?req.body.targetUserId:""; if(!target || target===userId) return bad(res,"A targetUserId is required."); const trustedOnly=Boolean(req.body?.trustedOnly); if(trustedOnly && !(await accepted(userId,target))) return bad(res,"Trusted introductions require an accepted connection.",403); const [i]=await db.insert(introductionTable).values({requesterId:userId,targetId:target,contextId:typeof req.body?.contextId==="string"?req.body.contextId:null,trustedOnly}).returning(); await notify(target,"introduction_request","Introduction request","Someone requested an introduction.",i.id); res.status(201).json({introduction:i}); } catch(e){next(e);} });
router.post("/social/reports", async (req,res,next)=>{ try { const userId=actor(req); const subject=typeof req.body?.subjectId==="string"?req.body.subjectId:""; const reason=typeof req.body?.reason==="string"?req.body.reason.trim():""; if(!subject || !reason) return bad(res,"subjectId and reason are required."); const [report]=await db.insert(reportTable).values({reporterId:userId,subjectId:subject,connectionId:typeof req.body?.connectionId==="string"?req.body.connectionId:null,reason,details:typeof req.body?.details==="string"?req.body.details.slice(0,5000):null}).returning(); const c=await connectionFor(userId,subject); if(c && c.status!=="blocked") await db.update(connectionTable).set({status:"blocked",blockedBy:userId}).where(eq(connectionTable.id,c.id)); res.status(201).json({report}); } catch(e){next(e);} });
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