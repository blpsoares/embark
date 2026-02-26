import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { isNetlifyPackage } from "./embark-config";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");
const TEMPLATE_PATH = join(ROOT, "templates", "workflow.template.yml");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");
const PLACEHOLDER = "__PACKAGE_NAME__";
const PLACEHOLDER_LOWERCASE = "__PACKAGE_NAME_LOWERCASE__";

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getPackageNames(): Promise<string[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export async function processPackageWorkflow(
  packageName: string,
  template: string,
  workflowsDir: string,
): Promise<boolean> {
  const workflowPath = join(workflowsDir, `${packageName}.yml`);

  // if the workflow already exists, don't overwrite (it may have been manually edited)
  if (await exists(workflowPath)) {
    return false;
  }

  const content = template
    .replaceAll(PLACEHOLDER, packageName)
    .replaceAll(PLACEHOLDER_LOWERCASE, packageName.toLowerCase());
  await writeFile(workflowPath, content, "utf-8");
  console.log(`[generate-workflows] created: .github/workflows/${packageName}.yml`);
  return true;
}

export async function processPackagesWorkflows(
  template: string,
  packages: string[],
  workflowsDir: string,
): Promise<boolean> {
  let hasChanges = false;

  for (const packageName of packages) {
    const changed = await processPackageWorkflow(packageName, template, workflowsDir);
    if (changed) {
      hasChanges = true;
    }
  }

  return hasChanges;
}

async function generateWorkflows() {
  const template = await readFile(TEMPLATE_PATH, "utf-8");
  const allPackages = await getPackageNames();

  // Filter out packages that deploy via Netlify (they don't need CI/CD workflows)
  const packages: string[] = [];
  for (const pkg of allPackages) {
    const pkgDir = join(PACKAGES_DIR, pkg);
    if (await isNetlifyPackage(pkgDir)) {
      console.log(`[generate-workflows] ${pkg}: netlify deploy, skipping workflow`);
      continue;
    }
    packages.push(pkg);
  }

  await mkdir(WORKFLOWS_DIR, { recursive: true });

  const hasChanges = await processPackagesWorkflows(template, packages, WORKFLOWS_DIR);

  if (hasChanges) {
    execSync("git add .github/workflows/", { cwd: ROOT, stdio: "inherit" });
  } else {
    console.log("[generate-workflows] all workflows already exist, none created");
  }
}

if (import.meta.main) {
  generateWorkflows().catch((error) => {
    console.error("[generate-workflows] error:", error);
    process.exit(1);
  });
}
