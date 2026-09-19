import Stripe from "stripe";

async function getStripeSecretKey(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !token) {
    throw new Error("Connect Stripe through Replit Integrations first.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: token },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Unable to load Stripe credentials (${response.status}).`);
  }

  const data = (await response.json()) as {
    items?: Array<{ settings?: { secret_key?: string; secret?: string } }>;
  };
  const settings = data.items?.[0]?.settings;
  const secretKey = settings?.secret_key ?? settings?.secret;
  if (!secretKey) throw new Error("Stripe secret key is unavailable.");
  return secretKey;
}

export async function getUncachableStripeClient() {
  return new Stripe(await getStripeSecretKey());
}