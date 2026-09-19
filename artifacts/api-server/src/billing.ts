import { billingUsersTable, db } from "@workspace/db";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";

export type XsectPlan = "free" | "pro" | "pro_plus";
export type BillingCycle = "monthly" | "annual";

const PRO_ENTITLEMENTS = [
  "ai_intelligence",
  "unlimited_xsects",
  "standing_alerts",
  "advanced_radar",
  "warm_introductions",
  "event_intelligence",
  "stealth_mode",
  "advanced_analytics",
  "opportunity_graph",
] as const;

const PRO_PLUS_ENTITLEMENTS = [
  ...PRO_ENTITLEMENTS,
  "ai_agent",
  "advanced_matchmaking",
  "organization_intelligence",
  "premium_alerts",
] as const;

const PAID_ACCESS_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

export async function getBillingUser(userId: string) {
  const [user] = await db
    .select()
    .from(billingUsersTable)
    .where(eq(billingUsersTable.id, userId));
  return user ?? null;
}

export async function ensureBillingUser(userId: string) {
  const [user] = await db
    .insert(billingUsersTable)
    .values({ id: userId })
    .onConflictDoUpdate({
      target: billingUsersTable.id,
      set: { updatedAt: new Date() },
    })
    .returning();
  return user;
}

export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
) {
  const [user] = await db
    .update(billingUsersTable)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(billingUsersTable.id, userId))
    .returning();
  return user;
}

async function resolvePlanFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<XsectPlan> {
  const firstItem = subscription.items.data[0];
  if (!firstItem) return "free";

  const product =
    typeof firstItem.price.product === "string"
      ? await stripe.products.retrieve(firstItem.price.product)
      : firstItem.price.product;

  if ("deleted" in product && product.deleted) return "free";
  const plan = product.metadata.xsect_plan;
  return plan === "pro" || plan === "pro_plus" ? plan : "free";
}

function normalizedStatus(
  status: Stripe.Subscription.Status,
):
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "paused" {
  if (status === "incomplete_expired") return "incomplete";
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "paused":
      return "paused";
    default:
      return "incomplete";
  }
}

export async function getSubscriptionForUser(userId: string) {
  const user = await getBillingUser(userId);
  if (!user?.stripeCustomerId) {
    return {
      plan: "free" as const,
      billingCycle: "monthly" as const,
      status: "free" as const,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: [] as string[],
    };
  }

  const stripe = await getUncachableStripeClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price.product"],
  });

  const subscription =
    subscriptions.data.find((item) => PAID_ACCESS_STATUSES.has(item.status)) ??
    subscriptions.data.sort((a, b) => b.created - a.created)[0];

  if (!subscription) {
    return {
      plan: "free" as const,
      billingCycle: "monthly" as const,
      status: "free" as const,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: [] as string[],
    };
  }

  const detectedPlan = await resolvePlanFromSubscription(stripe, subscription);
  const hasPaidAccess =
    detectedPlan !== "free" && PAID_ACCESS_STATUSES.has(subscription.status);
  const plan = hasPaidAccess ? detectedPlan : "free";
  const firstItem = subscription.items.data[0];
  const billingCycle: BillingCycle =
    firstItem?.price.recurring?.interval === "year" ? "annual" : "monthly";
  const itemPeriodEnd = firstItem as Stripe.SubscriptionItem & {
    current_period_end?: number;
  };
  const legacySubscription = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const periodEnd =
    itemPeriodEnd.current_period_end ?? legacySubscription.current_period_end;
  const entitlements =
    plan === "pro_plus"
      ? [...PRO_PLUS_ENTITLEMENTS]
      : plan === "pro"
        ? [...PRO_ENTITLEMENTS]
        : [];

  return {
    plan,
    billingCycle,
    status: normalizedStatus(subscription.status),
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    entitlements,
  };
}

async function getCatalogProduct(stripe: Stripe, plan: Exclude<XsectPlan, "free">) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const product = products.data.find(
    (item) => item.metadata.xsect_plan === plan,
  );
  if (!product) {
    throw new Error(`Stripe product for ${plan} has not been configured.`);
  }
  return product;
}

async function getCatalogPrice(
  stripe: Stripe,
  plan: Exclude<XsectPlan, "free">,
  cycle: BillingCycle,
) {
  const product = await getCatalogProduct(stripe, plan);
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    type: "recurring",
    limit: 100,
  });
  const interval = cycle === "annual" ? "year" : "month";
  const price = prices.data.find(
    (item) => item.recurring?.interval === interval,
  );
  if (!price) {
    throw new Error(`Stripe price for ${plan}/${cycle} has not been configured.`);
  }
  return { product, price };
}

export async function listBillingCatalog() {
  const stripe = await getUncachableStripeClient();
  return Promise.all(
    (["pro", "pro_plus"] as const).map(async (plan) => {
      const product = await getCatalogProduct(stripe, plan);
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        type: "recurring",
        limit: 100,
      });
      const monthly = prices.data.find(
        (item) => item.recurring?.interval === "month",
      );
      const annual = prices.data.find(
        (item) => item.recurring?.interval === "year",
      );
      if (monthly?.unit_amount == null || annual?.unit_amount == null) {
        throw new Error(`Stripe prices for ${plan} are incomplete.`);
      }
      return {
        plan,
        name: product.name,
        description: product.description ?? "",
        prices: {
          monthly: {
            amount: monthly.unit_amount,
            currency: monthly.currency,
          },
          annual: {
            amount: annual.unit_amount,
            currency: annual.currency,
          },
        },
      };
    }),
  );
}

async function getOrCreateCustomer(userId: string) {
  const stripe = await getUncachableStripeClient();
  const user = await ensureBillingUser(userId);
  if (user.stripeCustomerId) {
    return { stripe, customerId: user.stripeCustomerId };
  }

  const customer = await stripe.customers.create({
    metadata: { xsect_user_id: userId },
  });
  await setStripeCustomerId(userId, customer.id);
  return { stripe, customerId: customer.id };
}

export async function createCheckout(
  userId: string,
  plan: Exclude<XsectPlan, "free">,
  cycle: BillingCycle,
  origin: string,
) {
  const { stripe, customerId } = await getOrCreateCustomer(userId);
  const current = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  if (current.data.some((item) => PAID_ACCESS_STATUSES.has(item.status))) {
    throw new Error(
      "An active subscription already exists. Manage changes in the billing portal.",
    );
  }

  const { price } = await getCatalogPrice(stripe, plan, cycle);
  const returnUrl = `${origin}/xsect/plans`;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId,
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=cancelled`,
    metadata: {
      xsect_user_id: userId,
      xsect_plan: plan,
      xsect_cycle: cycle,
    },
    subscription_data: {
      metadata: {
        xsect_user_id: userId,
        xsect_plan: plan,
      },
    },
  });
  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }
  return session.url;
}

async function getOrCreatePortalConfiguration(stripe: Stripe) {
  const configurations = await stripe.billingPortal.configurations.list({
    limit: 100,
  });
  const existing = configurations.data.find(
    (item) => item.active && item.metadata?.xsect === "true",
  );
  if (existing) return existing.id;

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your XSECT subscription",
    },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "other",
          ],
        },
      },
    },
    metadata: { xsect: "true" },
  });
  return configuration.id;
}

export async function createPortal(userId: string, origin: string) {
  const user = await getBillingUser(userId);
  if (!user?.stripeCustomerId) {
    throw new Error("No Stripe customer exists for this account.");
  }

  const stripe = await getUncachableStripeClient();
  const configuration = await getOrCreatePortalConfiguration(stripe);
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    configuration,
    return_url: `${origin}/xsect/profile`,
  });
  return session.url;
}

export async function userHasEntitlement(
  userId: string,
  entitlement: string,
): Promise<boolean> {
  const subscription = await getSubscriptionForUser(userId);
  return (subscription.entitlements as string[]).includes(entitlement);
}