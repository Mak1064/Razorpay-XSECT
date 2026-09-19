import { db, professionalProfileTable, xsectPathsTable, type XsectPath } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { engine, pairKeyFor, type PairScore, type ProtectedProfileView } from "../xsect-engine";
import { loadAcceptedGraph, shortestPaths, usersMatchingQuery } from "./graph";

const trustWeight = { contact: 0.75, professional: 0.88, enhanced: 1 } as const;
const placeholder = (error: unknown) => error instanceof Error && /PLACEHOLDER|not implemented/i.test(error.message);
const words = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 1));

async function localRelevance(viewerId: string, targetId: string, query: string): Promise<number> {
  const rows = await db.select().from(professionalProfileTable).where(inArray(professionalProfileTable.userId, [viewerId, targetId]));
  const viewer = rows.find((row) => row.userId === viewerId);
  const target = rows.find((row) => row.userId === targetId);
  if (!target) return 0;
  const targetTerms = words([target.role, target.industry, ...target.skills, ...target.offers].filter(Boolean).join(" "));
  const requested = words(query);
  const viewerTerms = words([viewer?.role, viewer?.industry, ...(viewer?.skills ?? []), ...(viewer?.wants ?? [])].filter(Boolean).join(" "));
  const requestOverlap = requested.size ? [...requested].filter((term) => targetTerms.has(term)).length / requested.size : 0;
  const profileOverlap = viewerTerms.size ? [...viewerTerms].filter((term) => targetTerms.has(term)).length / viewerTerms.size : 0;
  return Math.round(Math.min(100, 20 + requestOverlap * 55 + profileOverlap * 25));
}

async function protectedStep(viewerId: string, userId: string, direct: boolean): Promise<ProtectedProfileView | null> {
  try {
    return await engine.protectedProfileView(viewerId, userId);
  } catch (error) {
    if (!placeholder(error)) throw error;
    const profile = (await db.select().from(professionalProfileTable).where(eq(professionalProfileTable.userId, userId)).limit(1))[0];
    if (!profile) return null;
    if (!direct && (profile.visibility !== "discoverable" || profile.privacy.womenOnly || profile.privacy.trustedConnectionsOnly || profile.privacy.stealthMode)) return null;
    return {
      userId,
      revealed: direct,
      displayName: direct ? profile.displayName : null,
      photoUrl: direct ? profile.photoUrl : null,
      role: profile.role,
      industry: profile.industry,
      company: direct ? profile.company : null,
      city: profile.city,
      area: profile.area,
      trustLevel: profile.trustLevel,
      skills: profile.skills,
      intentSummary: profile.intent,
      lastActiveBand: "this_week",
      handle: [profile.role || "Protected professional", profile.area].filter(Boolean).join(" · "),
    };
  }
}

export async function findAndPersistPaths(viewerId: string, query: string, maxHops: number, limit: number): Promise<XsectPath[]> {
  const graph = await loadAcceptedGraph();
  const targets = await usersMatchingQuery(query);
  targets.delete(viewerId);
  const rawPaths = shortestPaths(graph, viewerId, targets, maxHops);
  const ranked = [];
  for (const path of rawPaths) {
    const targetId = path.userIds[path.userIds.length - 1];
    let discoverable = graph.acceptedPairs.has([viewerId, targetId].sort().join(":"));
    if (!discoverable) {
      try { discoverable = await engine.isDiscoverable(viewerId, targetId); }
      catch (error) { if (!placeholder(error)) throw error; discoverable = true; }
    }
    if (!discoverable) continue;
    let score: PairScore | null = null;
    try { score = await engine.scorePair(viewerId, targetId, { type: "network", pathLength: path.edges.length }); }
    catch (error) { if (!placeholder(error)) throw error; }
    const relevance = score?.score ?? await localRelevance(viewerId, targetId, query);
    const views = await Promise.all(path.userIds.slice(1).map((id, index) => protectedStep(viewerId, id, index === 0)));
    if (views.some((view) => !view)) continue;
    const strength = Math.min(...path.edges.map((edge) => edge.strength));
    const targetView = views[views.length - 1]!;
    const trust = targetView!.trustLevel;
    const rank = strength * (relevance / 100) * trustWeight[trust];
    const steps = views.map((view, index) => ({
      userId: path.userIds[index + 1],
      label: view!.revealed && view!.displayName ? view!.displayName : view!.handle || [view!.role, view!.area].filter(Boolean).join(" · "),
      relationshipStrength: path.edges[index].strength,
      trust: view!.trustLevel,
      revealed: index === 0 && graph.acceptedPairs.has([viewerId, path.userIds[index + 1]].sort().join(":")),
    }));
    ranked.push({ targetId, path, score, relevance, strength, trust, rank, steps });
  }
  ranked.sort((a, b) => b.rank - a.rank);
  const selected = ranked.slice(0, limit);
  if (!selected.length) return [];
  const inserted = await db.insert(xsectPathsTable).values(selected.map((entry) => ({
    userId: viewerId,
    query,
    targetUserId: entry.targetId,
    steps: entry.steps,
    stepCount: entry.path.edges.length,
    strength: entry.strength,
    relevance: entry.relevance,
    trust: entry.trust,
    explanation: `${entry.path.edges.length}-step Path ranked by relationship strength, XSECT relevance, and ${entry.trust} trust.`,
  }))).returning();
  await Promise.all(selected.map(async (entry) => {
    const pairKey = pairKeyFor("network", viewerId, entry.targetId);
    const score = entry.score ?? {
      score: entry.relevance,
      factors: [],
      explanation: ["A verified connection Path intersects with your current query."],
      wantId: null,
      offerId: null,
      isHot: entry.relevance >= 80,
    };
    try {
      await engine.upsertXsect(viewerId, entry.targetId, {
        type: "network",
        pathLength: entry.path.edges.length,
        pathUserIds: entry.path.userIds.slice(1, -1),
        pairKey,
      }, score);
    } catch (error) {
      if (!placeholder(error)) throw error;
    }
  }));
  return inserted;
}