import type { OrganizationOpportunity, ProfessionalProfile, Want } from "@workspace/db";

const words = (values: Array<string | null | undefined>) =>
  new Set(values.flatMap((value) => (value ?? "").toLowerCase().split(/[^a-z0-9+#.]+/)).filter(Boolean));

const overlap = (left: Set<string>, right: Set<string>) => [...left].filter((value) => right.has(value));

export type OpportunityFit = { score: number; explanation: string[] };

/** Local, explainable organization-opportunity fit. This is deliberately not an XSECT Engine score. */
export function computeOpportunityFit(
  profile: ProfessionalProfile | null | undefined,
  wants: Want[],
  opportunity: OrganizationOpportunity,
): OpportunityFit {
  if (!profile) return { score: 0, explanation: ["Complete your professional profile to calculate fit."] };
  const viewerSkills = words(profile.skills);
  const opportunitySkills = words(opportunity.skills);
  const sharedSkills = overlap(viewerSkills, opportunitySkills);
  const viewerIntent = words([profile.intent, ...profile.wants, ...wants.map((want) => `${want.title} ${want.description} ${want.category}`)]);
  const opportunityIntent = words([opportunity.type, opportunity.title, opportunity.description]);
  const sharedIntent = overlap(viewerIntent, opportunityIntent);
  const industryAligned = Boolean(profile.industry && opportunity.industry && profile.industry.toLowerCase() === opportunity.industry.toLowerCase());

  const skillScore = opportunitySkills.size ? Math.min(45, Math.round(sharedSkills.length / opportunitySkills.size * 45)) : 15;
  const intentScore = Math.min(35, sharedIntent.length * 10);
  const industryScore = industryAligned ? 20 : 0;
  const score = Math.max(0, Math.min(100, skillScore + intentScore + industryScore));
  const explanation = [
    sharedSkills.length ? `${sharedSkills.length} requested skill${sharedSkills.length === 1 ? "" : "s"} overlap.` : "No requested skill overlap yet.",
    sharedIntent.length ? "Your Wants and intent align with this opportunity." : "No direct Want or intent alignment found.",
    industryAligned ? `Industry aligned: ${opportunity.industry}.` : "Industry alignment is not established.",
  ];
  return { score, explanation };
}