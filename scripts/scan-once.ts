import { scanOnce } from "../src/server/pipeline";

const result = await scanOnce();
process.stdout.write(`${JSON.stringify(result)}\n`);
if (result.status !== "ok") process.exitCode = 1;
