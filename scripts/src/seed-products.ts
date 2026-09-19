import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";

const catalog = [
  {
    plan: "pro",
    name: "XSECT Pro",
    description: "Advanced opportunity radar, intelligence, and introductions.",
    monthly: 999,
    annual: 9900,
  },
  {
    plan: "pro_plus",
    name: "XSECT Pro+",
    description: "Persistent AI agent and advanced opportunity intelligence.",
    monthly: 2499,
    annual: 24900,
  },
] as const;

async function ensurePrice(
  stripe: Stripe,
  productId: string,
  interval: "month" | "year",
  amount: number,
  plan: string,
) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "recurring",
    limit: 100,
  });
  const existing = prices.data.find(
    (price) =>
      price.recurring?.interval === interval &&
      price.unit_amount === amount &&
      price.currency === "usd",
  );
  if (existing) return existing;

  return stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
    metadata: {
      xsect_plan: plan,
      xsect_cycle: interval === "year" ? "annual" : "monthly",
    },
  });
}

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  const products = await stripe.products.list({ active: true, limit: 100 });

  for (const item of catalog) {
    let product = products.data.find(
      (candidate) => candidate.metadata.xsect_plan === item.plan,
    );
    if (!product) {
      product = await stripe.products.create({
        name: item.name,
        description: item.description,
        metadata: { xsect_plan: item.plan },
      });
    }

    const monthly = await ensurePrice(
      stripe,
      product.id,
      "month",
      item.monthly,
      item.plan,
    );
    const annual = await ensurePrice(
      stripe,
      product.id,
      "year",
      item.annual,
      item.plan,
    );
    console.log(
      `${item.name}: monthly ${monthly.id}, annual ${annual.id}`,
    );
  }
}

seedProducts().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});