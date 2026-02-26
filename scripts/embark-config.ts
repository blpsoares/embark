import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

export type DeployTarget = "cloud-run" | "netlify" | "other";

interface EmbarkConfig {
  deploy?: DeployTarget;
}

export async function readEmbarkConfig(packageDir: string): Promise<EmbarkConfig | null> {
  const configPath = join(packageDir, ".embark.json");
  try {
    await access(configPath);
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as EmbarkConfig;
  } catch {
    return null;
  }
}

export async function getDeployTarget(packageDir: string): Promise<DeployTarget> {
  const config = await readEmbarkConfig(packageDir);
  return config?.deploy ?? "cloud-run";
}

export async function isNetlifyPackage(packageDir: string): Promise<boolean> {
  const target = await getDeployTarget(packageDir);
  return target === "netlify";
}

export async function isExternalDeploy(packageDir: string): Promise<boolean> {
  const target = await getDeployTarget(packageDir);
  return target === "netlify" || target === "other";
}

export async function hasEmbarkConfig(packageDir: string): Promise<boolean> {
  const config = await readEmbarkConfig(packageDir);
  return config !== null;
}
