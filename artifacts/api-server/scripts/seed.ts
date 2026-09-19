import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runSeed, type SeedPhase } from "../src/services/seed/index";

const args = new Set(process.argv.slice(2));
const phaseArg = [...args].find((arg) => arg.startsWith("--phase="));
const phase = (phaseArg?.slice("--phase=".length) ?? "all") as SeedPhase;
if (!["profiles", "graph", "activity", "all"].includes(phase)) throw new Error(`Unknown seed phase: ${phase}`);

if (phase === "activity" || phase === "all") {
  const enginePath = fileURLToPath(new URL("../src/services/xsect-engine/engine.ts", import.meta.url));
  if ((await readFile(enginePath, "utf8")).includes("PLACEHOLDER")) {
    throw new Error("Activity seeding is waiting for the XSECT engine implementation. Run --phase=profiles or --phase=graph meanwhile.");
  }
}

const stats = await runSeed({ reset: args.has("--reset"), phase });
console.log(`Seed phase "${phase}" complete.`);
console.table(stats);
process.exit(0);
