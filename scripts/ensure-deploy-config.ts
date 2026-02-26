import { readdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";
import * as readline from "node:readline";
import { hasEmbarkConfig } from "./embark-config";
import type { DeployTarget } from "./embark-config";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

function buildNetlifyToml(buildCommand: string, publishDir: string): string {
  return `[build]
  command = "${buildCommand}"
  publish = "${publishDir}"
`;
}

async function askDeployTarget(packageName: string): Promise<DeployTarget> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `\n🚀 Package "${packageName}" has no .embark.json. Choose deploy target:\n  1. Google Cloud Run (default — generates workflow + Dockerfile)\n  2. Netlify (no CI/CD or Docker needed)\n  3. Other (custom deploy — no workflow or Docker generated)\n  Choose [1/2/3]: `,
      (answer) => {
        rl.close();
        const trimmed = answer.trim();
        if (trimmed === "2") resolve("netlify");
        else if (trimmed === "3") resolve("other");
        else resolve("cloud-run");
      },
    );
  });
}

export async function getPackagesWithoutConfig(
  packagesDir = PACKAGES_DIR,
): Promise<string[]> {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const missing: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgDir = join(packagesDir, entry.name);
    if (!(await hasEmbarkConfig(pkgDir))) {
      missing.push(entry.name);
    }
  }

  return missing;
}

async function ensureDeployConfig() {
  const missing = await getPackagesWithoutConfig();

  if (missing.length === 0) {
    console.log("[ensure-deploy-config] all packages have .embark.json");
    return;
  }

  let hasChanges = false;

  for (const packageName of missing) {
    const packageDir = join(PACKAGES_DIR, packageName);
    const target = await askDeployTarget(packageName);

    // Write .embark.json
    const config = { deploy: target };
    await writeFile(
      join(packageDir, ".embark.json"),
      JSON.stringify(config, null, 2) + "\n",
    );
    console.log(`  ✓ Created .embark.json for ${packageName} (deploy: ${target})`);

    // Create netlify.toml if needed
    if (target === "netlify") {
      const netlifyToml = buildNetlifyToml("bun run build", "dist");
      await writeFile(join(packageDir, "netlify.toml"), netlifyToml);
      console.log(`  ✓ Created netlify.toml for ${packageName}`);
    }

    hasChanges = true;
  }

  if (hasChanges) {
    try {
      execSync("git add packages/*/.embark.json", { cwd: ROOT, stdio: "ignore" });
      execSync("git add packages/*/netlify.toml", { cwd: ROOT, stdio: "ignore" });
    } catch {
      // Some globs may not match, that's ok
    }
  }
}

if (import.meta.main) {
  ensureDeployConfig().catch((error) => {
    console.error("[ensure-deploy-config] error:", error);
    process.exit(1);
  });
}
