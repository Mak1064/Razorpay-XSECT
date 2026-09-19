import {
  aiAgentFindingsTable,
  aiAgentsTable,
  aiQueriesTable,
  aiRecommendationsTable,
  db,
  offersTable,
  planOverridesTable,
  professionalProfileTable,
  professionalTwinsTable,
  wantsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createAgent } from "../src/services/ai/agent";
import { answerQuery } from "../src/services/ai/intelligence";
import { generateTwin } from "../src/services/ai/twin";

const userId = `seed_ai_test_${randomUUID()}`;

async function main() {
  try {
    await db.insert(professionalProfileTable).values({
      userId,
      displayName: "AI Service Test",
      role: "Product leader",
      intent: "Explore climate technology partnerships",
      industry: "Climate tech",
      city: "Bengaluru",
      area: "Koramangala",
      skills: ["Product strategy", "Enterprise partnerships"],
      experience: [{ title: "Product Lead", company: "Test fixture", startYear: 2022 }],
      wants: ["Climate technology investor introductions"],
      offers: ["Product strategy"],
      onboardingComplete: true,
    });
    await db.insert(wantsTable).values({
      userId, title: "Meet climate technology investors", description: "Seeking relevant investor introductions.",
      category: "investor", skills: ["Fundraising"], industry: "Climate tech", intent: "active",
    });
    await db.insert(offersTable).values({
      userId, title: "Product strategy guidance", description: "Offering enterprise product strategy.",
      category: "expertise", skills: ["Product strategy"], industry: "Climate tech", intent: "active",
    });
    await db.insert(planOverridesTable).values({ userId, plan: "pro_plus", setBy: userId });

    const twin = await generateTwin(userId);
    console.log("Professional Twin:", JSON.stringify(twin, null, 2));
    const agent = await createAgent(userId, "Find climate technology companies seeking a product leader in Bengaluru.");
    console.log("AI Agent:", JSON.stringify(agent, null, 2));
    const answer = await answerQuery(userId, "What are the best XSECTs for my current Wants?");
    console.log("Intelligence:", JSON.stringify(answer, null, 2));
  } finally {
    const queries = await db.select({ id: aiQueriesTable.id }).from(aiQueriesTable).where(eq(aiQueriesTable.userId, userId));
    if (queries.length) await db.delete(aiRecommendationsTable).where(inArray(aiRecommendationsTable.queryId, queries.map((q) => q.id)));
    const agents = await db.select({ id: aiAgentsTable.id }).from(aiAgentsTable).where(eq(aiAgentsTable.userId, userId));
    if (agents.length) await db.delete(aiAgentFindingsTable).where(inArray(aiAgentFindingsTable.agentId, agents.map((a) => a.id)));
    await db.delete(aiAgentsTable).where(eq(aiAgentsTable.userId, userId));
    await db.delete(aiQueriesTable).where(eq(aiQueriesTable.userId, userId));
    await db.delete(professionalTwinsTable).where(eq(professionalTwinsTable.userId, userId));
    await db.delete(wantsTable).where(eq(wantsTable.userId, userId));
    await db.delete(offersTable).where(eq(offersTable.userId, userId));
    await db.delete(planOverridesTable).where(eq(planOverridesTable.userId, userId));
    await db.delete(professionalProfileTable).where(eq(professionalProfileTable.userId, userId));
    console.log("Cleaned up", userId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});