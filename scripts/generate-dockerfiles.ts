import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

interface PackageJson {
  name?: string;
  main?: string;
  module?: string;
  scripts?: Record<string, string>;
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function resolveEntrypoint(pkg: PackageJson): string {
  if (pkg.scripts?.start) {
    return pkg.scripts.start;
  }
  const entry = pkg.main ?? pkg.module ?? "src/index.ts";
  return `bun run ${entry}`;
}

export function buildDockerfile(pkg: PackageJson, hasBuild: boolean): string {
  const cmd = resolveEntrypoint(pkg);
  const parts = cmd.split(" ");

  const lines: string[] = [
    "FROM oven/bun:latest AS base",
    "WORKDIR /app",
    "",
    "COPY package.json bun.lock* ./",
    "RUN bun install --frozen-lockfile --production",
    "",
    "COPY . .",
  ];

  if (hasBuild) {
    lines.push("", "RUN bun run build");
  }

  lines.push(
    "",
    "EXPOSE 8080",
    "",
    `CMD [${parts.map((p) => `"${p}"`).join(", ")}]`,
    ""
  );

  return lines.join("\n");
}

export async function processPackageDockerfile(
  packageName: string,
  packageDir: string,
): Promise<boolean> {
  const dockerfilePath = join(packageDir, "Dockerfile");

  // if the Dockerfile already exists, don't overwrite (it may have been manually edited)
  if (await exists(dockerfilePath)) {
    return false;
  }

  const pkgJsonPath = join(packageDir, "package.json");
  if (!(await exists(pkgJsonPath))) {
    console.log(`[generate-dockerfiles] ${packageName}: no package.json, skipping`);
    return false;
  }

  const pkg: PackageJson = JSON.parse(await readFile(pkgJsonPath, "utf-8"));
  const hasBuild = !!pkg.scripts?.build;
  const content = buildDockerfile(pkg, hasBuild);

  await writeFile(dockerfilePath, content, "utf-8");
  console.log(`[generate-dockerfiles] created: packages/${packageName}/Dockerfile`);
  return true;
}

async function generateDockerfiles() {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const packages = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  let hasChanges = false;

  for (const packageName of packages) {
    const packageDir = join(PACKAGES_DIR, packageName);
    const changed = await processPackageDockerfile(packageName, packageDir);
    if (changed) {
      hasChanges = true;
    }
  }

  if (hasChanges) {
    execSync("git add packages/*/Dockerfile", { cwd: ROOT, stdio: "inherit" });
  } else {
    console.log("[generate-dockerfiles] all Dockerfiles already exist, none created");
  }
}

if (import.meta.main) {
  generateDockerfiles().catch((error) => {
    console.error("[generate-dockerfiles] error:", error);
    process.exit(1);
  });
}
