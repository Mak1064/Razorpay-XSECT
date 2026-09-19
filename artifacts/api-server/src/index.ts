import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initializeStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Stripe synchronization.");
  }

  await runMigrations({ databaseUrl });
  const stripeSync = await getStripeSync();
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) {
    throw new Error("REPLIT_DOMAINS is required to configure the Stripe webhook.");
  }

  await stripeSync.findOrCreateManagedWebhook(
    `https://${domain}/api-server/api/stripe/webhook`,
  );
  await stripeSync.syncBackfill();
  logger.info("Stripe schema, webhook, and data synchronization are ready");
}

await initializeStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
