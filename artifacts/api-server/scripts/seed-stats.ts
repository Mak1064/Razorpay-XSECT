import { seedStats } from "../src/services/seed/index";

console.table(await seedStats());
process.exit(0);
