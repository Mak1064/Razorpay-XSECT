import type { ProfessionalProfile } from "@workspace/db";

export type TrustLevel = "contact" | "professional" | "enhanced";
export type TrustStats = {
  activeWantOrOfferCount: number;
  acceptedConnections: number;
  reviewsReceived: number;
  averageReviewRating: number;
  verifiedOrganizationMembership: boolean;
  now?: Date;
};

export type TrustResult = { level: TrustLevel; missing: string[]; professionalComplete: boolean; enhancedComplete: boolean };

export function computeTrustProgress(profile: ProfessionalProfile, stats: TrustStats): TrustResult {
  const professionalChecks = [
    [Boolean(profile.displayName.trim()), "Add your display name."],
    [Boolean(profile.role.trim()), "Add your professional role."],
    [Boolean(profile.intent.trim()), "Describe your current intent."],
    [profile.skills.length >= 3, "Add at least 3 skills."],
    [stats.activeWantOrOfferCount >= 1, "Create at least one active Want or Offer."],
    [Boolean(profile.company?.trim() || profile.industry?.trim()), "Add a company or industry."],
  ] as const;
  const professionalComplete = professionalChecks.every(([complete]) => complete);
  const ageDays = ((stats.now ?? new Date()).getTime() - profile.createdAt.getTime()) / 86_400_000;
  const socialProof = stats.acceptedConnections >= 3 || (stats.reviewsReceived >= 2 && stats.averageReviewRating >= 4);
  const enhancedComplete = professionalComplete && ((socialProof && ageDays >= 7) || stats.verifiedOrganizationMembership);
  const level: TrustLevel = enhancedComplete ? "enhanced" : professionalComplete ? "professional" : "contact";
  const missing = professionalComplete
    ? [
        ...(!socialProof ? ["Build 3 accepted connections, or receive 2 reviews averaging at least 4.0."] : []),
        ...(ageDays < 7 && !stats.verifiedOrganizationMembership ? ["Keep your profile active for at least 7 days, or join an organization with confirmed membership."] : []),
      ]
    : professionalChecks.filter(([complete]) => !complete).map(([, label]) => label);
  return { level, missing, professionalComplete, enhancedComplete };
}

export function computeTrustLevel(profile: ProfessionalProfile, stats: TrustStats): TrustLevel {
  return computeTrustProgress(profile, stats).level;
}