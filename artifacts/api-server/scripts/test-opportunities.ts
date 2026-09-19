import {
  db, offersTable, organizationMembersTable, organizationOpportunitiesTable, organizationsTable,
  professionalProfileTable, wantsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { computeOpportunityFit } from "../src/services/opportunities/fit";
import { computeTrustLevel } from "../src/services/trust";

const userId = `seed_opportunities_test_${Date.now()}`;
let organizationId: string | undefined;

try {
  const [profile] = await db.insert(professionalProfileTable).values({
    userId, displayName: "Service test", role: "Engineer", intent: "Climate collaboration",
    company: "Test runner", industry: "Climate", skills: ["TypeScript", "Systems", "Climate"],
    createdAt: new Date(Date.now() - 8 * 86_400_000),
  }).returning();
  const [want] = await db.insert(wantsTable).values({
    userId, title: "Climate systems collaboration", category: "partnership", skills: ["TypeScript", "Climate"],
  }).returning();
  const [organization] = await db.insert(organizationsTable).values({
    name: "Seed opportunities service test", slug: `seed-opportunities-service-test-${Date.now()}`, industry: "Climate", createdBy: userId,
  }).returning();
  organizationId = organization.id;
  await db.insert(organizationMembersTable).values({ organizationId, userId, role: "owner" });
  const [opportunity] = await db.insert(organizationOpportunitiesTable).values({
    organizationId, createdBy: userId, type: "collaboration", title: "Climate TypeScript systems",
    skills: ["TypeScript", "Climate"], industry: "Climate",
  }).returning();

  const fit = computeOpportunityFit(profile, [want], opportunity);
  if (fit.score < 60 || fit.score > 100) throw new Error(`Unexpected fit score: ${fit.score}`);
  const trust = computeTrustLevel(profile, {
    activeWantOrOfferCount: 1, acceptedConnections: 3, reviewsReceived: 0,
    averageReviewRating: 0, verifiedOrganizationMembership: false,
  });
  if (trust !== "enhanced") throw new Error(`Unexpected trust level: ${trust}`);
  console.log(JSON.stringify({ ok: true, fit, trust }));
} finally {
  if (organizationId) await db.delete(organizationsTable).where(eq(organizationsTable.id, organizationId));
  await db.delete(wantsTable).where(eq(wantsTable.userId, userId));
  await db.delete(offersTable).where(eq(offersTable.userId, userId));
  await db.delete(professionalProfileTable).where(eq(professionalProfileTable.userId, userId));
}