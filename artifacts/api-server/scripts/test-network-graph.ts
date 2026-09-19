import { connectionTable, db, professionalProfileTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { loadAcceptedGraph, shortestPaths } from "../src/services/network/graph";

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const ids = Array.from({ length: 5 }, (_, index) => `seed_graph_test_${suffix}_${index}`);

async function main() {
  try {
    await db.insert(professionalProfileTable).values(ids.map((userId, index) => ({
      userId,
      displayName: `Graph Test ${index}`,
      role: index === 4 ? "Climate investor" : "Network test professional",
      industry: "Climate tech",
      skills: index === 4 ? ["investment"] : ["networking"],
      onboardingComplete: true,
    })));
    await db.insert(connectionTable).values([
      { requesterId: ids[0], recipientId: ids[1], status: "accepted" as const },
      { requesterId: ids[1], recipientId: ids[2], status: "accepted" as const },
      { requesterId: ids[2], recipientId: ids[3], status: "accepted" as const },
      { requesterId: ids[1], recipientId: ids[4], status: "accepted" as const },
    ]);
    const graph = await loadAcceptedGraph();
    const twoHop = shortestPaths(graph, ids[0], new Set([ids[4]]), 3);
    if (twoHop.length !== 1 || twoHop[0].edges.length !== 2 || twoHop[0].userIds.join(",") !== [ids[0], ids[1], ids[4]].join(",")) {
      throw new Error(`Expected a two-hop shortest Path, got ${JSON.stringify(twoHop)}`);
    }
    const capped = shortestPaths(graph, ids[0], new Set([ids[3]]), 2);
    if (capped.length !== 0) throw new Error("Two-hop cap exposed a three-hop target.");
    console.log("Network graph test passed: five users, accepted edges, shortest Path, and hop cap verified.");
  } finally {
    await db.delete(connectionTable).where(inArray(connectionTable.requesterId, ids));
    await db.delete(professionalProfileTable).where(inArray(professionalProfileTable.userId, ids));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});