import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const README_PATH = join(ROOT, "README.md");
const PACKAGE_JSON_PATH = join(ROOT, "package.json");

const VERSION_MARKER_START = "<!-- VERSION:START -->";
const VERSION_MARKER_END = "<!-- VERSION:END -->";

interface RootPackageJson {
  version?: string;
}

export function buildVersionBadge(version: string): string {
  const color = "818cf8";
  return `![version](https://img.shields.io/badge/version-${version}-${color}?style=for-the-badge)`;
}

export function replaceVersionSection(
  readme: string,
  version: string,
): { hasChanged: boolean; newContent: string } {
  const startIndex = readme.indexOf(VERSION_MARKER_START);
  const endIndex = readme.indexOf(VERSION_MARKER_END);

  if (startIndex === -1 || endIndex === -1) {
    return { hasChanged: false, newContent: readme };
  }

  const badge = buildVersionBadge(version);
  const newSection = `${VERSION_MARKER_START}\n${badge}\n${VERSION_MARKER_END}`;
  const newReadme =
    readme.slice(0, startIndex) +
    newSection +
    readme.slice(endIndex + VERSION_MARKER_END.length);

  if (newReadme === readme) {
    return { hasChanged: false, newContent: readme };
  }

  return { hasChanged: true, newContent: newReadme };
}

async function updateVersionBadge() {
  const pkgJson: RootPackageJson = JSON.parse(
    await readFile(PACKAGE_JSON_PATH, "utf-8"),
  );
  const version = pkgJson.version ?? "0.0.0";

  const readme = await readFile(README_PATH, "utf-8");
  const result = replaceVersionSection(readme, version);

  if (result.hasChanged) {
    await writeFile(README_PATH, result.newContent, "utf-8");
    execSync("git add README.md", { cwd: ROOT, stdio: "ignore" });
    console.log(`[update-version] badge updated to v${version}`);
  } else {
    console.log("[update-version] version badge is already up to date");
  }
}

if (import.meta.main) {
  updateVersionBadge().catch((error) => {
    console.error("[update-version] error:", error);
    process.exit(1);
  });
}
