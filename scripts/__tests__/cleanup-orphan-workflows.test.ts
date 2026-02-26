import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { rmSync } from "node:fs";
import {
  getPackageNames,
  getWorkflowNames,
  exists,
  cleanOrphanWorkflows,
} from "../cleanup-orphan-workflows";

const TEST_DIR = join(import.meta.dirname, "../..", ".test-cleanup");
const TEST_PACKAGES_DIR = join(TEST_DIR, "packages");
const TEST_WORKFLOWS_DIR = join(TEST_DIR, ".github", "workflows");

async function setupTest() {
  if (await exists(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  await mkdir(TEST_PACKAGES_DIR, { recursive: true });
  await mkdir(TEST_WORKFLOWS_DIR, { recursive: true });
}

async function teardownTest() {
  if (await exists(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe("cleanup-orphan-workflows", () => {
  describe("getPackageNames", () => {
    beforeEach(setupTest);
    afterEach(teardownTest);

    it("should return empty array if no packages", async () => {
      const packages = await getPackageNames(TEST_PACKAGES_DIR);
      expect(packages).toEqual([]);
    });

    it("should return names of package directories", async () => {
      await mkdir(join(TEST_PACKAGES_DIR, "showcase"), { recursive: true });
      await mkdir(join(TEST_PACKAGES_DIR, "dashboard"), { recursive: true });

      const packages = await getPackageNames(TEST_PACKAGES_DIR);
      expect(packages.sort()).toEqual(["dashboard", "showcase"]);
    });
  });

  describe("getWorkflowNames", () => {
    beforeEach(setupTest);
    afterEach(teardownTest);

    it("should return empty array if no workflows", async () => {
      const workflows = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(workflows).toEqual([]);
    });

    it("should return workflow names (without .yml)", async () => {
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "");
      await writeFile(join(TEST_WORKFLOWS_DIR, "dashboard.yml"), "");
      await writeFile(join(TEST_WORKFLOWS_DIR, "README.md"), "");

      const workflows = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(workflows.sort()).toEqual(["dashboard", "showcase"]);
    });

    it("should ignore non-.yml files", async () => {
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "");
      await writeFile(join(TEST_WORKFLOWS_DIR, "README.md"), "");
      await writeFile(join(TEST_WORKFLOWS_DIR, "file.txt"), "");

      const workflows = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(workflows).toEqual(["showcase"]);
    });
  });

  describe("cleanOrphanWorkflows", () => {
    beforeEach(setupTest);
    afterEach(teardownTest);

    it("should delete orphan workflows", async () => {
      await mkdir(join(TEST_PACKAGES_DIR, "showcase"), { recursive: true });
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "name: showcase");
      await writeFile(join(TEST_WORKFLOWS_DIR, "deleted-app.yml"), "name: deleted");

      const result = await cleanOrphanWorkflows(TEST_PACKAGES_DIR, TEST_WORKFLOWS_DIR, TEST_DIR);
      expect(result).toBe(true);

      const remaining = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(remaining).toEqual(["showcase"]);
    });

    it("should return false when no orphans exist", async () => {
      await mkdir(join(TEST_PACKAGES_DIR, "showcase"), { recursive: true });
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "name: showcase");

      const result = await cleanOrphanWorkflows(TEST_PACKAGES_DIR, TEST_WORKFLOWS_DIR, TEST_DIR);
      expect(result).toBe(false);
    });

    it("should handle empty directories", async () => {
      const result = await cleanOrphanWorkflows(TEST_PACKAGES_DIR, TEST_WORKFLOWS_DIR, TEST_DIR);
      expect(result).toBe(false);
    });

    it("should delete workflows for netlify packages", async () => {
      await mkdir(join(TEST_PACKAGES_DIR, "my-site"), { recursive: true });
      await writeFile(
        join(TEST_PACKAGES_DIR, "my-site", ".embark.jsonc"),
        JSON.stringify({ deploy: "netlify" }),
      );
      await writeFile(join(TEST_WORKFLOWS_DIR, "my-site.yml"), "name: my-site");

      const result = await cleanOrphanWorkflows(TEST_PACKAGES_DIR, TEST_WORKFLOWS_DIR, TEST_DIR);
      expect(result).toBe(true);

      const remaining = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(remaining).not.toContain("my-site");
    });

    it("should keep workflows for cloud-run packages", async () => {
      await mkdir(join(TEST_PACKAGES_DIR, "api"), { recursive: true });
      await writeFile(
        join(TEST_PACKAGES_DIR, "api", ".embark.jsonc"),
        JSON.stringify({ deploy: "cloud-run" }),
      );
      await writeFile(join(TEST_WORKFLOWS_DIR, "api.yml"), "name: api");

      const result = await cleanOrphanWorkflows(TEST_PACKAGES_DIR, TEST_WORKFLOWS_DIR, TEST_DIR);
      expect(result).toBe(false);

      const remaining = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(remaining).toContain("api");
    });
  });

  describe("exists", () => {
    it("should return true for paths that exist", async () => {
      const result = await exists(import.meta.dir);
      expect(result).toBe(true);
    });

    it("should return false for paths that don't exist", async () => {
      const result = await exists("/tmp/path-that-does-not-exist-xyz-12345");
      expect(result).toBe(false);
    });
  });
});
