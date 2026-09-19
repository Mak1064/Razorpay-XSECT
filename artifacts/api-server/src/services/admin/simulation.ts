import { db, professionalProfileTable, type DistanceBand } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import { AREAS } from "../../lib/geo";
import { engine } from "../xsect-engine";

const weightedBands: DistanceBand[] = [
  "lt_250m", "lt_250m", "lt_250m",
  "250m_500m", "250m_500m",
  "500m_1km", "500m_1km",
  "1km_2km", "2km_5km", "5km_plus",
];

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]!;
const recentTime = () => new Date(Date.now() - Math.floor(Math.random() * 6 * 60 * 60 * 1000));

export async function simulateCrossing(input: {
  userAId: string;
  userBId: string;
  city: string;
  area: string;
  distanceBand: DistanceBand;
  occurredAt?: Date;
  durationMinutes?: number;
  adminId: string;
}) {
  if (input.userAId === input.userBId) throw new Error("Crossing participants must be different.");
  const profiles = await db.select({ userId: professionalProfileTable.userId })
    .from(professionalProfileTable)
    .where(eq(professionalProfileTable.onboardingComplete, true));
  const ids = new Set(profiles.map((profile) => profile.userId));
  if (!ids.has(input.userAId) || !ids.has(input.userBId)) {
    throw new Error("Both participants must have onboarded profiles.");
  }
  const result = await engine.recordCrossing({
    userAId: input.userAId,
    userBId: input.userBId,
    city: input.city,
    area: input.area,
    distanceBand: input.distanceBand,
    occurredAt: input.occurredAt,
    durationMinutes: input.durationMinutes,
    source: "simulated",
    createdBy: input.adminId,
  });
  const eligibility = {
    forA: result.xsects.forA ? null : await ineligibilityReason(input.userAId, input.userBId),
    forB: result.xsects.forB ? null : await ineligibilityReason(input.userBId, input.userAId),
  };
  return { ...result, eligibility, summary: `Generated a simulated crossing in ${input.area}, ${input.city}; ${[result.xsects.forA, result.xsects.forB].filter(Boolean).length} XSECTs were evaluated.` };
}

/** Plain-language reason a viewer cannot discover a counterpart (admin diagnostics only; mirrors engine.isDiscoverable rules). */
async function ineligibilityReason(viewerId: string, counterpartId: string) {
  const [viewer, counterpart] = await Promise.all([
    db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, viewerId)).limit(1).then((rows) => rows[0]),
    db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, counterpartId)).limit(1).then((rows) => rows[0]),
  ]);
  if (!viewer || !counterpart) return "One of the profiles does not exist.";
  if (counterpart.visibility === "ghost") return "Counterpart is in ghost mode.";
  if (viewer.visibility === "ghost") return "Viewer is in ghost mode.";
  if (counterpart.visibility === "stealth" || counterpart.privacy.stealthMode) return "Counterpart is in stealth mode and their stealth intents do not overlap the viewer's goals.";
  if (viewer.visibility === "stealth" || viewer.privacy.stealthMode) return "Viewer is in stealth mode and their stealth intents do not overlap the counterpart's goals.";
  if (counterpart.privacy.trustedConnectionsOnly || viewer.privacy.trustedConnectionsOnly) return "One side only allows trusted connections.";
  if (counterpart.visibility === "trusted_only" || viewer.visibility === "trusted_only") return "One side is visible to Professional/Enhanced trust levels only.";
  if (counterpart.privacy.womenOnly || viewer.privacy.womenOnly) return "A women-only preference is not satisfied.";
  return "A trust requirement on a Want or Offer, or a block, prevents discovery.";
}

async function discoverablePairs(userIds: string[]) {
  const pairs: Array<[string, string]> = [];
  for (let a = 0; a < userIds.length; a += 1) {
    for (let b = a + 1; b < userIds.length; b += 1) {
      const left = userIds[a]!;
      const right = userIds[b]!;
      if (await engine.isDiscoverable(left, right) || await engine.isDiscoverable(right, left)) pairs.push([left, right]);
    }
  }
  return pairs;
}

export async function simulateArea(input: { city: string; area: string; count: number; includeUserId?: string; adminId: string }) {
  const profiles = await db.select({ userId: professionalProfileTable.userId })
    .from(professionalProfileTable)
    .where(and(
      eq(professionalProfileTable.city, input.city),
      eq(professionalProfileTable.area, input.area),
      eq(professionalProfileTable.onboardingComplete, true),
      eq(professionalProfileTable.visibility, "discoverable"),
    ));
  const ids = profiles.map((profile) => profile.userId);
  const pairs = await discoverablePairs(ids);

  const selected: Array<[string, string]> = [];
  if (input.includeUserId) {
    const includeProfile = (await db.select({ userId: professionalProfileTable.userId }).from(professionalProfileTable)
      .where(and(eq(professionalProfileTable.userId, input.includeUserId), eq(professionalProfileTable.onboardingComplete, true))).limit(1))[0];
    if (!includeProfile) throw new Error("The included user must have an onboarded profile.");
    const candidates: string[] = [];
    for (const id of ids) {
      if (id !== input.includeUserId && (await engine.isDiscoverable(input.includeUserId, id) || await engine.isDiscoverable(id, input.includeUserId))) candidates.push(id);
    }
    const scored = await Promise.all(candidates.map(async (id) => ({
      id,
      score: (await engine.scorePair(input.includeUserId!, id, { type: "physical", distanceBand: "lt_250m" })).score,
    })));
    scored.sort((a, b) => b.score - a.score);
    for (const candidate of scored.slice(0, input.count)) selected.push([input.includeUserId, candidate.id]);
  }
  if (!pairs.length && selected.length < input.count) throw new Error("At least two mutually discoverable profiles are required in this area.");
  while (selected.length < input.count) selected.push(pick(pairs));

  const results = [];
  for (const [userAId, userBId] of selected.slice(0, input.count)) {
    results.push(await engine.recordCrossing({
      userAId, userBId, city: input.city, area: input.area,
      distanceBand: pick(weightedBands), occurredAt: recentTime(),
      durationMinutes: 2 + Math.floor(Math.random() * 29),
      source: "simulated", createdBy: input.adminId,
    }));
  }
  return { results, summary: `Simulated ${results.length} crossings among discoverable profiles in ${input.area}, ${input.city}.` };
}

export async function simulateUserDay(input: { userId: string; crossings: number; adminId: string }) {
  const user = (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, input.userId)).limit(1))[0];
  if (!user?.city) throw new Error("The selected user needs a city before a day can be simulated.");
  const candidates = await db.select({ userId: professionalProfileTable.userId })
    .from(professionalProfileTable)
    .where(and(
      eq(professionalProfileTable.city, user.city),
      eq(professionalProfileTable.onboardingComplete, true),
      ne(professionalProfileTable.userId, input.userId),
    ));
  const eligible: string[] = [];
  for (const candidate of candidates) if (await engine.isDiscoverable(input.userId, candidate.userId)) eligible.push(candidate.userId);
  if (!eligible.length) throw new Error("No discoverable profiles are available in this user's city.");
  const areas = AREAS.filter((area) => area.city === user.city);
  if (!areas.length) throw new Error("No simulation areas are configured for this user's city.");
  const results = [];
  for (let index = 0; index < input.crossings; index += 1) {
    const area = pick(areas);
    results.push(await engine.recordCrossing({
      userAId: input.userId, userBId: pick(eligible), city: user.city, area: area.area,
      distanceBand: pick(weightedBands), occurredAt: recentTime(),
      durationMinutes: 2 + Math.floor(Math.random() * 29),
      source: "simulated", createdBy: input.adminId,
    }));
  }
  return { results, summary: `Simulated ${results.length} crossings across ${user.city} for the selected user.` };
}