import { createHash } from "node:crypto";
import { db, offersTable, professionalProfileTable, professionalTwinsTable, reviewsTable, wantsTable, type TwinSummary } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod";

const MODEL = "gpt-5.6-terra";
const keys: Array<keyof TwinSummary> = ["whatYouOffer", "whatYouWant", "whatYouAreGoodAt", "whoYouShouldMeet", "opportunitiesThatFit", "industries", "networkingGoals"];
const twinSchema = {
  type: "object",
  additionalProperties: false,
  required: keys,
  properties: Object.fromEntries(keys.map((key) => [key, { type: "array", items: { type: "string" }, maxItems: 12 }])),
} as const;
const twinResult = z.object(Object.fromEntries(keys.map((key) => [key, z.array(z.string()).max(12)])) as Record<keyof TwinSummary, z.ZodArray<z.ZodString>>);

async function sourceFor(userId: string) {
  const [profile, wants, offers, reviews] = await Promise.all([
    db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, userId)).limit(1).then((r) => r[0] ?? null),
    db.select().from(wantsTable).where(eq(wantsTable.userId, userId)),
    db.select().from(offersTable).where(eq(offersTable.userId, userId)),
    db.select({
      count: sql<number>`count(*)::int`,
      average: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::real`,
      professionalism: sql<number>`coalesce(avg(${reviewsTable.professionalism}), 0)::real`,
      reliability: sql<number>`coalesce(avg(${reviewsTable.reliability}), 0)::real`,
      helpfulness: sql<number>`coalesce(avg(${reviewsTable.helpfulness}), 0)::real`,
    }).from(reviewsTable).where(eq(reviewsTable.revieweeId, userId)).then((r) => r[0]),
  ]);
  if (!profile) throw new Error("A professional profile is required to generate your Professional Twin.");
  return {
    profile: {
      role: profile.role, intent: profile.intent, company: profile.company, industry: profile.industry,
      experience: profile.experience, skills: profile.skills, wants: profile.wants, offers: profile.offers,
      opportunityCategories: profile.opportunityCategories, availability: profile.availability,
    },
    wants: wants.map(({ title, description, category, skills, industry, intent, availability, workMode }) => ({ title, description, category, skills, industry, intent, availability, workMode })),
    offers: offers.map(({ title, description, category, skills, industry, intent, availability, workMode }) => ({ title, description, category, skills, industry, intent, availability, workMode })),
    reviews,
  };
}

export async function generateTwin(userId: string, force = false) {
  const source = await sourceFor(userId);
  const sourceHash = createHash("sha256").update(JSON.stringify(source)).digest("hex");
  const existing = (await db.select().from(professionalTwinsTable).where(eq(professionalTwinsTable.userId, userId)).limit(1))[0];
  if (existing?.sourceHash === sourceHash && !force) return getTwin(userId);

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: "Create a concise Professional Twin using only supplied facts. Do not invent credentials, employers, achievements, people, or opportunities. Phrase uncertain recommendations as categories of people or opportunities, never named entities." },
      { role: "user", content: JSON.stringify(source) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "professional_twin", strict: true, schema: twinSchema } },
  });
  const generated = twinResult.parse(JSON.parse(response.choices[0]?.message?.content ?? "{}"));
  const [stored] = await db.insert(professionalTwinsTable).values({ userId, generated, overrides: existing?.overrides ?? {}, model: MODEL, sourceHash, generatedAt: new Date() })
    .onConflictDoUpdate({ target: professionalTwinsTable.userId, set: { generated, model: MODEL, sourceHash, generatedAt: new Date() } }).returning();
  return { ...stored, merged: { ...stored.generated, ...stored.overrides } };
}

export async function getTwin(userId: string) {
  const twin = (await db.select().from(professionalTwinsTable).where(eq(professionalTwinsTable.userId, userId)).limit(1))[0];
  if (!twin) return null;
  return { ...twin, merged: { ...twin.generated, ...twin.overrides } };
}

export async function updateTwinOverrides(userId: string, partial: Partial<TwinSummary>) {
  const twin = await getTwin(userId);
  if (!twin) throw new Error("Generate your Professional Twin before editing it.");
  const clean = Object.fromEntries(Object.entries(partial).filter(([key, value]) => keys.includes(key as keyof TwinSummary) && Array.isArray(value)).map(([key, value]) => [key, (value as unknown[]).filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean).slice(0, 20)])) as Partial<TwinSummary>;
  const overrides = { ...twin.overrides, ...clean };
  const [updated] = await db.update(professionalTwinsTable).set({ overrides }).where(eq(professionalTwinsTable.userId, userId)).returning();
  return { ...updated, merged: { ...updated.generated, ...updated.overrides } };
}