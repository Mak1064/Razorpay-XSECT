import { db, professionalProfileTable, type ProfessionalProfile } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AREAS } from "../lib/geo";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);
const actor = (req: Request) => (req as AuthenticatedRequest).userId;
const error = (res: Response, message: string, status = 400): void => { res.status(status).json({ error: message }); };

const item = z.string().trim().min(1).max(160);
const profileInput = z.object({
  displayName: z.string().trim().min(1).max(120),
  role: z.string().trim().max(160).default(""),
  intent: z.string().trim().max(1000).default(""),
  photoUrl: z.string().refine((v) => v.startsWith("/objects/") || v.startsWith("https://"), "photoUrl must be a private object path or HTTPS URL").nullable().optional(),
  company: z.string().trim().max(160).nullable().optional(),
  industry: z.string().trim().max(160).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  area: z.string().trim().max(120).nullable().optional(),
  identity: z.object({ pronouns: z.string().max(60).optional(), location: z.string().max(160).optional(), ageRange: z.string().max(40).optional() }).default({}),
  experience: z.array(z.object({ title: item, company: item, startYear: z.number().int().min(1900).max(2200).optional(), endYear: z.number().int().min(1900).max(2200).optional(), description: z.string().max(1000).optional() })).max(20).default([]),
  links: z.array(z.object({ label: item, url: z.string().url().refine((v) => v.startsWith("https://"), "links must use HTTPS") })).max(20).default([]),
  skills: z.array(item).max(50).default([]),
  wants: z.array(item).max(30).default([]),
  offers: z.array(item).max(30).default([]),
  opportunityCategories: z.array(item).max(30).default([]),
  availability: z.enum(["available_now", "within_month", "not_available"]).default("not_available"),
  urgency: z.enum(["urgent", "soon", "exploring"]).default("exploring"),
  discoveryRadius: z.number().int().min(1).max(500).default(25),
  notificationPreferences: z.object({ email: z.boolean(), push: z.boolean(), matches: z.boolean(), messages: z.boolean() }).default({ email: true, push: true, matches: true, messages: true }),
  privacy: z.object({
    trustedConnectionsOnly: z.boolean().default(false),
    womenOnly: z.boolean().default(false),
    stealthMode: z.boolean().default(false),
    visibilitySchedule: z.object({ start: z.string(), end: z.string(), timezone: z.string().optional() }).optional(),
    fieldVisibility: z.record(z.boolean()).default({}),
  }).default({ trustedConnectionsOnly: false, womenOnly: false, stealthMode: false, fieldVisibility: {} }),
  onboardingComplete: z.boolean().default(false),
});

export function projectProfessionalProfile(profile: ProfessionalProfile, viewerId: string, connected = false) {
  const own = profile.userId === viewerId;
  if (own) return profile;
  if (profile.privacy.stealthMode || (profile.privacy.trustedConnectionsOnly && !connected)) return { userId: profile.userId, trustReputation: profile.trustReputation };
  const visible = (field: string) => profile.privacy.fieldVisibility[field] !== false;
  return {
    userId: profile.userId,
    displayName: visible("displayName") ? profile.displayName : null,
    role: visible("role") ? profile.role : null,
    company: visible("company") ? profile.company : null,
    industry: visible("industry") ? profile.industry : null,
    city: profile.city,
    area: profile.area,
    skills: visible("skills") ? profile.skills : [],
    wants: visible("wants") ? profile.wants : [],
    offers: visible("offers") ? profile.offers : [],
    opportunityCategories: visible("opportunityCategories") ? profile.opportunityCategories : [],
    trustReputation: profile.trustReputation,
  };
}
async function getProfile(userId: string) {
  return (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, userId)).limit(1))[0];
}

/** Public list of supported cities/areas (area labels + centroids are public place data, never user locations). */
router.get("/areas", (_req, res) => {
  res.json({ areas: AREAS.map(({ city, area }) => ({ city, area })) });
});

router.get("/profile", async (req, res, next) => {
  try { res.json({ profile: await getProfile(actor(req)) ?? null }); } catch (e) { next(e); }
});
router.put("/profile", async (req, res, next) => {
  try {
    const parsed = profileInput.safeParse(req.body);
    if (!parsed.success) { error(res, parsed.error.message); return; }
    const userId = actor(req);
    const values = { ...parsed.data, userId };
    const [profile] = await db.insert(professionalProfileTable).values(values).onConflictDoUpdate({ target: professionalProfileTable.userId, set: parsed.data }).returning();
    res.json({ profile });
  } catch (e) { next(e); }
});
router.post("/onboarding/complete", async (req, res, next) => {
  try {
    const parsed = profileInput.extend({ onboardingComplete: z.literal(true) }).safeParse(req.body);
    if (!parsed.success) { error(res, parsed.error.message); return; }
    const userId = actor(req);
    const [profile] = await db.insert(professionalProfileTable).values({ ...parsed.data, userId }).onConflictDoUpdate({ target: professionalProfileTable.userId, set: parsed.data }).returning();
    res.json({ profile });
  } catch (e) { next(e); }
});
export default router;