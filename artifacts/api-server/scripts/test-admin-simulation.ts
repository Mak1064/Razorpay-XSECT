import {
  analyticsEventsTable, crossingsTable, db, missedXsectsTable, momentsTable, offersTable,
  professionalProfileTable, wantsTable, xsectFactorsTable, xsectsTable,
} from "@workspace/db";
import { inArray, or } from "drizzle-orm";
import { simulateCrossing } from "../src/services/admin/simulation";

const suffix = Date.now().toString(36);
const userAId = `seed_admin_sim_a_${suffix}`;
const userBId = `seed_admin_sim_b_${suffix}`;
const userIds = [userAId, userBId];

async function cleanup() {
  const xsects = await db.select({ id: xsectsTable.id }).from(xsectsTable).where(or(inArray(xsectsTable.userId, userIds), inArray(xsectsTable.counterpartUserId, userIds)));
  if (xsects.length) await db.delete(xsectFactorsTable).where(inArray(xsectFactorsTable.xsectId, xsects.map((row) => row.id)));
  await db.delete(momentsTable).where(or(inArray(momentsTable.userId, userIds), inArray(momentsTable.relatedUserId, userIds)));
  await db.delete(missedXsectsTable).where(or(inArray(missedXsectsTable.userId, userIds), inArray(missedXsectsTable.counterpartUserId, userIds)));
  await db.delete(xsectsTable).where(or(inArray(xsectsTable.userId, userIds), inArray(xsectsTable.counterpartUserId, userIds)));
  await db.delete(crossingsTable).where(or(inArray(crossingsTable.userAId, userIds), inArray(crossingsTable.userBId, userIds)));
  await db.delete(wantsTable).where(inArray(wantsTable.userId, userIds));
  await db.delete(offersTable).where(inArray(offersTable.userId, userIds));
  await db.delete(analyticsEventsTable).where(inArray(analyticsEventsTable.userId, userIds));
  await db.delete(professionalProfileTable).where(inArray(professionalProfileTable.userId, userIds));
}

try {
  await db.insert(professionalProfileTable).values([
    { userId: userAId, displayName: "Simulation Test A", role: "Founder", city: "Bengaluru", area: "Koramangala", onboardingComplete: true, visibility: "discoverable", skills: ["strategy"], wants: ["engineering"], offers: ["strategy"] },
    { userId: userBId, displayName: "Simulation Test B", role: "Engineer", city: "Bengaluru", area: "Koramangala", onboardingComplete: true, visibility: "discoverable", skills: ["engineering"], wants: ["strategy"], offers: ["engineering"] },
  ]);
  await db.insert(wantsTable).values({ userId: userAId, title: "Technical collaboration", category: "cofounder", description: "Seeking engineering collaboration", skills: ["engineering"] });
  await db.insert(offersTable).values({ userId: userBId, title: "Engineering collaboration", category: "expertise", description: "Available for technical collaboration", skills: ["engineering"] });
  const result = await simulateCrossing({
    userAId, userBId, city: "Bengaluru", area: "Koramangala", distanceBand: "lt_250m",
    durationMinutes: 10, adminId: "admin_simulation_test",
  });
  if (!result.crossingId || !result.summary || (!result.xsects.forA && !result.xsects.forB)) throw new Error("Simulation did not create the expected crossing and XSECT output.");
  console.log(`PASS: ${result.summary}`);
} finally {
  await cleanup();
}