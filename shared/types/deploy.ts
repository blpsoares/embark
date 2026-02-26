/**
 * Shared deployment target configuration type
 * Used across all packages in the monorepo
 */

export type DeployTarget = "cloud-run" | "netlify" | "other";

export interface EmbarkConfig {
  deploy: DeployTarget;
}
