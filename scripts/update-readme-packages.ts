import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");
const README_PATH = join(ROOT, "README.md");

const MARKER_START = "<!-- PACKAGES:START -->";
const MARKER_END = "<!-- PACKAGES:END -->";

interface PackageJson {
  name?: string;
  description?: string;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function buildMarkdownTable(packages: { name: string; description: string }[]): string[] {
  return [
    "| Package | Description |",
    "|---------|-------------|",
    ...packages.map((p) => `| \`${p.name}\` | ${p.description} |`),
  ];
}

export function replaceReadmeSection(
  readme: string,
  markerStart: string,
  markerEnd: string,
  newSection: string,
): string {
  const startIndex = readme.indexOf(markerStart);
  const endIndex = readme.indexOf(markerEnd);

  if (startIndex === -1 || endIndex === -1) {
    return readme;
  }

  return (
    readme.slice(0, startIndex) +
    newSection +
    readme.slice(endIndex + markerEnd.length)
  );
}

export async function getPackages(): Promise<{ name: string; description: string }[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const packages: { name: string; description: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgJsonPath = join(PACKAGES_DIR, entry.name, "package.json");
    if (!(await exists(pkgJsonPath))) continue;

    const pkg: PackageJson = JSON.parse(await readFile(pkgJsonPath, "utf-8"));
    packages.push({
      name: entry.name,
      description: pkg.description ?? entry.name,
    });
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

export interface UpdateResult {
  hasChanged: boolean;
  newContent: string;
}

export function processReadmeUpdate(
  readme: string,
  packages: { name: string; description: string }[],
): UpdateResult {
  const tableLines = buildMarkdownTable(packages);

  const newSection = [
    MARKER_START,
    ...tableLines,
    MARKER_END,
  ].join("\n");

  const newReadme = replaceReadmeSection(readme, MARKER_START, MARKER_END, newSection);

  if (newReadme === readme) {
    console.log("[update-readme] packages table is already up to date");
    return { hasChanged: false, newContent: readme };
  }

  if (newReadme.indexOf(MARKER_START) === -1) {
    console.log("[update-readme] markers not found in README.md, skipping");
    return { hasChanged: false, newContent: readme };
  }

  return { hasChanged: true, newContent: newReadme };
}

async function updateReadme() {
  const readme = await readFile(README_PATH, "utf-8");
  const packages = await getPackages();

  const result = processReadmeUpdate(readme, packages);

  if (result.hasChanged) {
    await writeFile(README_PATH, result.newContent, "utf-8");
    execSync("git add README.md", { cwd: ROOT, stdio: "ignore" });
    console.log("[update-readme] packages table updated in README.md");
  }
}

if (import.meta.main) {
  updateReadme().catch((error) => {
    console.error("[update-readme] error:", error);
    process.exit(1);
  });
}
