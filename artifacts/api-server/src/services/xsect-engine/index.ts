/**
 * XSECT Engine — public contract.
 *
 * This module is the single entry point other services use to score pairs, record crossings and
 * (re)compute XSECTs. The implementation lives in ./engine.ts (matching), ./crossings.ts (crossing
 * pipeline), ./moments.ts (feed generation). Only functions exported here are considered stable.
 *
 * Privacy rules enforced inside the engine:
 *  - Exact coordinates are never returned; only DistanceBand + area labels.
 *  - Counterpart identity is protected until mutual consent (accepted connection). Callers must use
 *    `protectedProfileView` when rendering a counterpart.
 *  - Visibility (stealth/ghost/trusted_only) and womenOnly/trust requirements are honoured.
 */
import type { DistanceBand, ProfessionalProfile, Xsect, XsectFactor, XsectFactorName, XsectType } from "@workspace/db";

export type FactorBreakdown = { factor: XsectFactorName; score: number; weight: number; detail: string };

export type PairScore = {
  score: number;               // 0–100 XSECT Score
  factors: FactorBreakdown[];  // stored to xsect_factors
  explanation: string[];       // "Why this XSECT?" bullets, safe to show the viewer
  wantId: string | null;       // best matching want of viewer
  offerId: string | null;      // best matching offer of counterpart
  isHot: boolean;              // score >= 80 and urgency/availability aligned
};

export type ScoreContext = {
  type: XsectType;
  distanceBand?: DistanceBand | null;
  crossingCount?: number;      // repeated crossings boost proximity/freshness
  sharedEventId?: string | null;
  pathLength?: number | null;  // for network XSECTs
  availabilityOverlapMinutes?: number | null; // for time XSECTs
  now?: Date;
};

export type ProtectedProfileView = {
  userId: string;
  revealed: boolean;           // true only with mutual consent
  displayName: string | null;  // null until revealed
  photoUrl: string | null;     // null until revealed
  role: string;                // role/headline is always shown (profession-level, not identity)
  industry: string | null;
  company: string | null;      // null until revealed
  city: string | null;
  area: string | null;         // area label only, never coordinates
  trustLevel: ProfessionalProfile["trustLevel"];
  skills: string[];
  intentSummary: string;       // short, e.g. "Looking for a technical co-founder"
  lastActiveBand: "now" | "today" | "this_week" | "earlier";
  handle: string;              // stable anonymous label, e.g. "Product Lead · Koramangala"
};

export type XsectWithFactors = Xsect & { factors: XsectFactor[]; counterpart: ProtectedProfileView | null };

export type RecordCrossingInput = {
  userAId: string; userBId: string;
  city: string; area: string;
  distanceBand: DistanceBand;
  occurredAt?: Date; durationMinutes?: number;
  source: "simulated" | "manual" | "gps";
  createdBy?: string | null;
};

export type RecordCrossingResult = {
  crossingId: string;
  repeatedCount: number;                       // total crossings for this pair incl. this one
  xsects: { forA: Xsect | null; forB: Xsect | null }; // null when a side is not eligible (visibility/blocked)
  missed: { forA: string | null; forB: string | null }; // missed_xsects ids
};

export interface XsectEngine {
  /** Pure-ish scoring of viewer → counterpart. Reads wants/offers/profiles/connections from DB. */
  scorePair(viewerId: string, counterpartId: string, context: ScoreContext): Promise<PairScore>;
  /** Upsert an XSECT row (by owner + pairKey) with factors and explanation. Emits moments/alerts when new or newly hot. */
  upsertXsect(ownerId: string, counterpartId: string | null, context: ScoreContext & { pairKey: string; crossingId?: string | null; eventId?: string | null; organizationOpportunityId?: string | null; pathUserIds?: string[] }, score: PairScore): Promise<Xsect>;
  /** Full crossing pipeline: store crossing → detect repeats → score both sides → xsects → missed journal → moments. */
  recordCrossing(input: RecordCrossingInput): Promise<RecordCrossingResult>;
  /** Recompute intent (and opportunity) XSECTs for one user against eligible candidates. Returns number of XSECTs written/updated. */
  recomputeIntentXsects(userId: string, options?: { limit?: number }): Promise<number>;
  /** Compute Time XSECTs from availability_rules overlap with counterparts that already have an active XSECT/connection. */
  recomputeTimeXsects(userId: string): Promise<number>;
  /** List XSECTs for a viewer with factors and protected counterpart view. Applies plan limits when `limit` given. */
  listXsects(userId: string, filters?: { type?: XsectType; status?: Xsect["status"]; minScore?: number; limit?: number }): Promise<XsectWithFactors[]>;
  /** Load a single XSECT owned by viewer, with factors + counterpart view. */
  getXsect(userId: string, xsectId: string): Promise<XsectWithFactors | null>;
  /** Protected view of a counterpart from the viewer's perspective (honours consent + visibility). */
  protectedProfileView(viewerId: string, counterpartId: string): Promise<ProtectedProfileView | null>;
  /** Utility: can `viewerId` discover `counterpartId` at all (visibility, blocks, women-only, trust requirement). */
  isDiscoverable(viewerId: string, counterpartId: string): Promise<boolean>;
  /** Sync all XSECT/Missed rows for a pair (both sides) with connection state: accepted → connected, blocked/declined → dismissed. */
  syncPairState(userAId: string, userBId: string, state: "connected" | "dismissed" | "active"): Promise<{ xsects: number; missed: number }>;
  /** Expire stale XSECTs/missed entries/alerts. Safe to call often. */
  expireStale(now?: Date): Promise<{ xsects: number; missed: number; alerts: number }>;
}

export const pairKeyFor = (type: XsectType, a: string, b: string | null, sourceId?: string | null) => {
  const [x, y] = b ? [a, b].sort() : [a, ""];
  return `${type}:${x}:${y}:${sourceId ?? ""}`;
};

export const crossingPairKey = (a: string, b: string) => [a, b].sort().join(":");

// The concrete engine is provided by ./engine. Keep this indirection so consumers import from the package root.
export { engine } from "./engine";
