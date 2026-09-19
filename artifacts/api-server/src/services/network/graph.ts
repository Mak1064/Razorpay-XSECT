import {
  connectionTable,
  conversationTable,
  db,
  messageTable,
  offersTable,
  organizationMembersTable,
  organizationsTable,
  professionalProfileTable,
} from "@workspace/db";
import { eq, inArray, or } from "drizzle-orm";

export type GraphEdge = {
  connectionId: string;
  from: string;
  to: string;
  strength: number;
  acceptedAt: Date;
  messageCount: number;
  mutualCount: number;
};

export type ConnectionGraph = {
  adjacency: Map<string, GraphEdge[]>;
  acceptedPairs: Set<string>;
};

export type GraphPath = { userIds: string[]; edges: GraphEdge[] };

const pair = (a: string, b: string) => [a, b].sort().join(":");
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Relationship strength is intentionally explainable:
 * connection tenure (30), exchanged messages (40), and mutual connections (30).
 */
export async function loadAcceptedGraph(): Promise<ConnectionGraph> {
  const connections = await db.select().from(connectionTable).where(eq(connectionTable.status, "accepted"));
  const adjacencySets = new Map<string, Set<string>>();
  for (const connection of connections) {
    const a = adjacencySets.get(connection.requesterId) ?? new Set<string>();
    const b = adjacencySets.get(connection.recipientId) ?? new Set<string>();
    a.add(connection.recipientId);
    b.add(connection.requesterId);
    adjacencySets.set(connection.requesterId, a);
    adjacencySets.set(connection.recipientId, b);
  }

  const conversations = connections.length
    ? await db.select().from(conversationTable).where(or(
        inArray(conversationTable.participantA, [...adjacencySets.keys()]),
        inArray(conversationTable.participantB, [...adjacencySets.keys()]),
      ))
    : [];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const messages = conversationIds.length
    ? await db.select({ conversationId: messageTable.conversationId }).from(messageTable).where(inArray(messageTable.conversationId, conversationIds))
    : [];
  const messageCounts = new Map<string, number>();
  for (const message of messages) messageCounts.set(message.conversationId, (messageCounts.get(message.conversationId) ?? 0) + 1);
  const conversationByPair = new Map(conversations.map((conversation) => [pair(conversation.participantA, conversation.participantB), conversation]));

  const adjacency = new Map<string, GraphEdge[]>();
  const acceptedPairs = new Set<string>();
  const now = Date.now();
  for (const connection of connections) {
    const a = connection.requesterId;
    const b = connection.recipientId;
    acceptedPairs.add(pair(a, b));
    const aNeighbours = adjacencySets.get(a) ?? new Set<string>();
    const bNeighbours = adjacencySets.get(b) ?? new Set<string>();
    const mutualCount = [...aNeighbours].filter((id) => bNeighbours.has(id)).length;
    const conversation = conversationByPair.get(pair(a, b));
    const messageCount = conversation ? messageCounts.get(conversation.id) ?? 0 : 0;
    const acceptedAt = connection.updatedAt ?? connection.createdAt;
    const ageDays = Math.max(0, (now - acceptedAt.getTime()) / 86_400_000);
    const ageScore = Math.min(30, 30 * (1 - Math.exp(-ageDays / 180)));
    const messageScore = Math.min(40, 10 * Math.log2(1 + messageCount));
    const mutualScore = Math.min(30, 10 * mutualCount);
    const strength = clamp(ageScore + messageScore + mutualScore);
    const edge = { connectionId: connection.id, from: a, to: b, strength, acceptedAt, messageCount, mutualCount };
    adjacency.set(a, [...(adjacency.get(a) ?? []), edge]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), { ...edge, from: b, to: a }]);
  }
  return { adjacency, acceptedPairs };
}

export function shortestPaths(graph: ConnectionGraph, viewerId: string, targets: Set<string>, maxHops = 3): GraphPath[] {
  const queue: GraphPath[] = [{ userIds: [viewerId], edges: [] }];
  const bestDepth = new Map<string, number>([[viewerId, 0]]);
  const found = new Map<string, GraphPath>();
  while (queue.length) {
    const current = queue.shift()!;
    const depth = current.edges.length;
    const node = current.userIds[current.userIds.length - 1];
    if (depth >= maxHops) continue;
    for (const edge of graph.adjacency.get(node) ?? []) {
      if (current.userIds.includes(edge.to)) continue;
      const next = { userIds: [...current.userIds, edge.to], edges: [...current.edges, edge] };
      if (targets.has(edge.to) && !found.has(edge.to)) found.set(edge.to, next);
      const nextDepth = depth + 1;
      if ((bestDepth.get(edge.to) ?? Infinity) >= nextDepth) {
        bestDepth.set(edge.to, nextDepth);
        queue.push(next);
      }
    }
  }
  return [...found.values()];
}

export async function usersMatchingQuery(query: string): Promise<Set<string>> {
  const terms = query.toLowerCase().split(/\s+/).map((term) => term.trim()).filter((term) => term.length > 1);
  if (!terms.length) return new Set();
  const [profiles, offers, memberships] = await Promise.all([
    db.select().from(professionalProfileTable),
    db.select().from(offersTable).where(eq(offersTable.status, "active")),
    db.select({ userId: organizationMembersTable.userId, organizationName: organizationsTable.name })
      .from(organizationMembersTable)
      .innerJoin(organizationsTable, eq(organizationMembersTable.organizationId, organizationsTable.id)),
  ]);
  const searchable = new Map<string, string[]>();
  const add = (userId: string, values: unknown[]) => {
    const bucket = searchable.get(userId) ?? [];
    bucket.push(...values.flatMap((value) => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === "string"));
    searchable.set(userId, bucket);
  };
  for (const profile of profiles) add(profile.userId, [profile.userId, profile.role, profile.industry, profile.skills]);
  for (const offer of offers) add(offer.userId, [offer.title, offer.category]);
  for (const membership of memberships) add(membership.userId, [membership.organizationName]);
  return new Set([...searchable].filter(([, values]) => {
    const haystack = values.join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  }).map(([userId]) => userId));
}

export const graphPairKey = pair;