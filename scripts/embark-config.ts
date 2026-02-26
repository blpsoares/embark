import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DeployTarget, EmbarkConfig } from "../shared/types/deploy";

export type { DeployTarget, EmbarkConfig };

export async function readEmbarkConfig(packageDir: string): Promise<EmbarkConfig | null> {
  const configPath = join(packageDir, ".embark.json");
  try {
    await access(configPath);
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content) as EmbarkConfig;
    return config;
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
