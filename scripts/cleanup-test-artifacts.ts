import { rmSync } from "node:fs";
import { join } from "node:path";
import { readdir, access } from "node:fs/promises";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");
const ALLOWED_DIRECTORIES = new Set(["showcase"]);

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function cleanTestArtifacts() {
  console.log("[cleanup-test] cleaning test artifacts...");

  if (!(await exists(PACKAGES_DIR))) {
    console.log("[cleanup-test] no packages found");
    return;
  }

  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !ALLOWED_DIRECTORIES.has(entry.name)) {
      const path = join(PACKAGES_DIR, entry.name);
      try {
        rmSync(path, { recursive: true, force: true });
        console.log(`[cleanup-test] removed temporary package: packages/${entry.name}`);
      } catch (error) {
        console.error(`[cleanup-test] error removing ${entry.name}:`, error);
      }
    }
  }

  // Clean up cleanup-orphan-workflows test directory if it exists
  const testDirCleanup = join(ROOT, ".test-cleanup");
  if (await exists(testDirCleanup)) {
    try {
      rmSync(testDirCleanup, { recursive: true, force: true });
      console.log("[cleanup-test] removed test directory .test-cleanup");
    } catch (error) {
      console.error("[cleanup-test] error removing .test-cleanup:", error);
    }
  }

  console.log("[cleanup-test] cleanup complete");
}

if (import.meta.main) {
  cleanTestArtifacts().catch((error) => {
    console.error("[cleanup-test] error:", error);
    process.exit(1);
  });
}
