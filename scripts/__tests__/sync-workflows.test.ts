import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { rmSync } from "node:fs";
import {
  generateExpectedContent,
  wasCustomized,
  getWorkflowNames,
  syncWorkflows,
} from "../sync-workflows";

const TEST_DIR = join(import.meta.dirname, "../..", ".test-sync");
const TEST_WORKFLOWS_DIR = join(TEST_DIR, ".github", "workflows");
const TEST_TEMPLATE = join(TEST_DIR, "templates", "workflow.template.yml");

async function exists(path: string): Promise<boolean> {
  try {
    await Bun.file(path).exists();
    return true;
  } catch {
    return false;
  }
}

async function setupTest() {
  if (await exists(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  await mkdir(TEST_WORKFLOWS_DIR, { recursive: true });
  await mkdir(join(TEST_DIR, "templates"), { recursive: true });
}

async function teardownTest() {
  if (await exists(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe("sync-workflows", () => {
  describe("generateExpectedContent", () => {
    it("substitutes placeholders correctly", () => {
      const template = "name: Deploy __PACKAGE_NAME__\nservice: __PACKAGE_NAME_LOWERCASE__";
      const result = generateExpectedContent(template, "myPackage");

      expect(result).toContain("name: Deploy myPackage");
      expect(result).toContain("service: mypackage");
    });

    it("keeps template unchanged if no placeholder", () => {
      const template = "name: Deploy\nsteps: []";
      const result = generateExpectedContent(template, "myPackage");

      expect(result).toBe(template);
    });
  });

  describe("wasCustomized", () => {
    it("returns false when contents are equal", () => {
      const content = "name: Deploy\nsteps: []";
      const result = wasCustomized(content, content);

      expect(result).toBe(false);
    });

    it("returns true when contents differ", () => {
      const current = "name: Deploy\nsteps: []";
      const expected = "name: Deploy\nsteps: []\nextra: new";
      const result = wasCustomized(current, expected);

      expect(result).toBe(true);
    });
  });

  describe("getWorkflowNames", () => {
    beforeEach(setupTest);
    afterEach(teardownTest);

    it("returns empty array if no workflows", async () => {
      const result = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(result).toEqual([]);
    });

    it("returns workflow names without .yml", async () => {
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "");
      await writeFile(join(TEST_WORKFLOWS_DIR, "dashboard.yml"), "");

      const result = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(result.sort()).toEqual(["dashboard", "showcase"]);
    });

    it("ignores non-.yml files", async () => {
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "");
      await writeFile(join(TEST_WORKFLOWS_DIR, "README.md"), "");

      const result = await getWorkflowNames(TEST_WORKFLOWS_DIR);
      expect(result).toEqual(["showcase"]);
    });
  });

  describe("syncWorkflows", () => {
    beforeEach(setupTest);
    afterEach(teardownTest);

    it("returns 0 updated and 0 skipped when everything is in sync", async () => {
      const template = "name: Deploy __PACKAGE_NAME__";
      await writeFile(TEST_TEMPLATE, template);
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), template.replace("__PACKAGE_NAME__", "showcase"));

      const result = await syncWorkflows(TEST_WORKFLOWS_DIR, TEST_TEMPLATE, true);

      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it("updates workflows when template changes", async () => {
      const previousTemplate = "name: Deploy __PACKAGE_NAME__";
      const newTemplate = "name: Deploy __PACKAGE_NAME__\ndescription: New";

      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), previousTemplate.replace("__PACKAGE_NAME__", "showcase"));
      await writeFile(TEST_TEMPLATE, newTemplate);

      const result = await syncWorkflows(TEST_WORKFLOWS_DIR, TEST_TEMPLATE, true);

      expect(result.updated).toBe(1);

      const updatedContent = await readFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "utf-8");
      expect(updatedContent).toContain("New");
    });

    it("returns 0 when template does not exist", async () => {
      const fakeTemplatePath = join(TEST_DIR, "does-not-exist.yml");
      const result = await syncWorkflows(TEST_WORKFLOWS_DIR, fakeTemplatePath, true);

      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it("overwrites customized workflows when acceptAll is true", async () => {
      const template = "name: Deploy __PACKAGE_NAME__";
      const customizedContent = "name: Deploy showcase\ncustom: true";

      await writeFile(TEST_TEMPLATE, template);
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), customizedContent);

      const result = await syncWorkflows(TEST_WORKFLOWS_DIR, TEST_TEMPLATE, true);

      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it("detects multiple customized workflows", async () => {
      const template = "name: Deploy __PACKAGE_NAME__";

      await writeFile(TEST_TEMPLATE, template);
      await writeFile(join(TEST_WORKFLOWS_DIR, "showcase.yml"), "name: Deploy showcase\ncustom: 1");
      await writeFile(join(TEST_WORKFLOWS_DIR, "dashboard.yml"), "name: Deploy dashboard\ncustom: 2");

      const result = await syncWorkflows(TEST_WORKFLOWS_DIR, TEST_TEMPLATE, true);

      expect(result.updated).toBe(2);
    });
  });
});
