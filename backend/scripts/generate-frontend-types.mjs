import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backendTypesSource = resolve(
  __dirname,
  "../src/contracts/backend-api.types.ts",
);
const frontendTypesTarget = resolve(
  __dirname,
  "../../frontend/src/types/generated/backend-api.types.ts",
);

const banner = `/**
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 *
 * Source: backend/src/contracts/backend-api.types.ts
 * Regenerate: npm run generate:frontend-types (from backend)
 */

`;

async function main() {
  const source = await readFile(backendTypesSource, "utf8");
  await mkdir(dirname(frontendTypesTarget), { recursive: true });
  await writeFile(frontendTypesTarget, banner + source, "utf8");
  console.log(`Generated frontend backend types at: ${frontendTypesTarget}`);
}

main().catch((error) => {
  console.error("Failed to generate frontend backend types:", error);
  process.exit(1);
});
