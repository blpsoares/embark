import { readdir, unlink, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { isNetlifyPackage } from "./embark-config";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getPackageNames(packagesDir = PACKAGES_DIR): Promise<string[]> {
  if (!(await exists(packagesDir))) {
    return [];
  }

  const entries = await readdir(packagesDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function getWorkflowNames(workflowsDir = WORKFLOWS_DIR): Promise<string[]> {
  if (!(await exists(workflowsDir))) {
    return [];
  }

  const entries = await readdir(workflowsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".yml"))
    .map((e) => e.name.replace(".yml", ""));
}

export async function cleanOrphanWorkflows(
  packagesDir = PACKAGES_DIR,
  workflowsDir = WORKFLOWS_DIR,
  root = ROOT,
): Promise<boolean> {
  const packages = await getPackageNames(packagesDir);
  const workflows = await getWorkflowNames(workflowsDir);
  const packagesSet = new Set(packages);

  // Build set of netlify packages (they should not have workflows)
  const netlifyPackages = new Set<string>();
  for (const pkg of packages) {
    const pkgDir = join(packagesDir, pkg);
    if (await isNetlifyPackage(pkgDir)) {
      netlifyPackages.add(pkg);
    }
  }

  let hasChanges = false;

  for (const workflow of workflows) {
    // Delete if package was removed OR if package switched to netlify
    if (!packagesSet.has(workflow) || netlifyPackages.has(workflow)) {
      const workflowPath = join(workflowsDir, `${workflow}.yml`);
      await unlink(workflowPath);
      const reason = netlifyPackages.has(workflow) ? "netlify deploy" : "package deleted";
      console.log(`[cleanup-orphan] deleted: .github/workflows/${workflow}.yml (${reason})`);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    try {
      execSync("git add .github/workflows/", { cwd: root, stdio: "inherit" });
    } catch {
      // May fail in test environments where cwd is not a git repo
    }
  } else {
    console.log("[cleanup-orphan] no orphan workflows found");
  }

  return hasChanges;
}

if (import.meta.main) {
  cleanOrphanWorkflows().catch((error) => {
    console.error("[cleanup-orphan] error:", error);
    process.exit(1);
  });
}
