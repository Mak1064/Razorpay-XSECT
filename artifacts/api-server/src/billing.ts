export type XsectPlan = "free" | "pro" | "pro_plus";

export const BILLING_PLANS = [
  {
    id: "free",
    name: "Base Signal",
    description: "Essential discovery for active professionals.",
    monthlyPrice: null,
    annualPrice: null,
  },
  {
    id: "pro",
    name: "XSECT Pro",
    description: "Advanced opportunity discovery available in demo mode.",
    monthlyPrice: null,
    annualPrice: null,
  },
  {
    id: "pro_plus",
    name: "Pro+",
    description: "Full intelligence features available in demo mode.",
    monthlyPrice: null,
    annualPrice: null,
  },
] as const;