import {
  crossingsTable, db, missedXsectsTable, momentsTable, offersTable, professionalProfileTable,
  wantsTable, xsectFactorsTable, xsectsTable,
} from "@workspace/db";
import { and, eq, inArray, or } from "drizzle-orm";
import { engine } from "../src/services/xsect-engine";

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const userA = `seed_engine_a_${suffix}`;
const userB = `seed_engine_b_${suffix}`;
const ids = [userA, userB];

async function cleanup() {
  const owned = await db.select({ id: xsectsTable.id }).from(xsectsTable).where(inArray(xsectsTable.userId, ids));
  if (owned.length) await db.delete(xsectsTable).where(inArray(xsectsTable.id, owned.map((row) => row.id)));
  await db.delete(crossingsTable).where(or(inArray(crossingsTable.userAId, ids), inArray(crossingsTable.userBId, ids)));
  await db.delete(wantsTable).where(inArray(wantsTable.userId, ids));
  await db.delete(offersTable).where(inArray(offersTable.userId, ids));
  await db.delete(professionalProfileTable).where(inArray(professionalProfileTable.userId, ids));
}

try {
  await db.insert(professionalProfileTable).values([
    {
      userId: userA, displayName: "Temporary A", role: "Fintech founder", intent: "Seeking a technical cofounder",
      industry: "fintech", skills: ["payments", "product"], wants: ["technical cofounder"], offers: ["product leadership"],
      opportunityCategories: ["cofounder"], availability: "available_now", urgency: "urgent",
      city: "Bengaluru", area: "Koramangala", trustLevel: "professional", visibility: "discoverable", onboardingComplete: true,
    },
    {
      userId: userB, displayName: "Temporary B", role: "CTO", intent: "Open to fintech startup collaboration",
      industry: "fintech", skills: ["payments", "engineering", "distributed systems"], wants: ["startup collaboration"], offers: ["CTO expertise"],
      opportunityCategories: ["cofounder"], availability: "available_now", urgency: "active",
      city: "Bengaluru", area: "Koramangala", trustLevel: "professional", visibility: "discoverable", onboardingComplete: true,
    },
  ]);
  await db.insert(wantsTable).values({
    userId: userA, title: "Technical cofounder for fintech", description: "Seeking CTO expertise in payments and distributed systems",
    category: "cofounder", skills: ["payments", "engineering"], industry: "fintech", intent: "urgent", availability: "available_now",
  });
  await db.insert(offersTable).values({
    userId: userB, title: "CTO-level fintech expertise", description: "Engineering leadership for payments startups",
    category: "expertise", skills: ["payments", "engineering", "distributed systems"], industry: "fintech", intent: "active", availability: "available_now",
  });

  const first = await engine.recordCrossing({ userAId: userA, userBId: userB, city: "Bengaluru", area: "Koramangala", distanceBand: "250m_500m", source: "simulated", createdBy: userA });
  const second = await engine.recordCrossing({ userAId: userA, userBId: userB, city: "Bengaluru", area: "Koramangala", distanceBand: "lt_250m", source: "simulated", createdBy: userA });
  if (first.repeatedCount !== 1 || second.repeatedCount !== 2) throw new Error(`Repeated crossing count was ${first.repeatedCount}/${second.repeatedCount}.`);
  if (!second.xsects.forA || second.xsects.forA.score < 45) throw new Error(`Expected a sensible XSECT score, received ${second.xsects.forA?.score ?? "none"}.`);

  const [xsects, missed, moments] = await Promise.all([
    db.select().from(xsectsTable).where(inArray(xsectsTable.userId, ids)),
    db.select().from(missedXsectsTable).where(inArray(missedXsectsTable.userId, ids)),
    db.select().from(momentsTable).where(inArray(momentsTable.userId, ids)),
  ]);
  const factors = xsects.length ? await db.select().from(xsectFactorsTable).where(inArray(xsectFactorsTable.xsectId, xsects.map((row) => row.id))) : [];
  if (!xsects.length || !factors.length || missed.length < 4 || !moments.length) throw new Error(`Missing rows: xsects=${xsects.length}, factors=${factors.length}, missed=${missed.length}, moments=${moments.length}.`);
  console.log(JSON.stringify({
    crossingIds: [first.crossingId, second.crossingId], repeatedCount: second.repeatedCount,
    scores: xsects.map((row) => row.score), xsects: xsects.length, factors: factors.length, missed: missed.length, moments: moments.length,
  }, null, 2));
} finally {
  await cleanup();
}