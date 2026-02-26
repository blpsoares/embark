import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { readEmbarkConfig, getDeployTarget, isNetlifyPackage } from "../embark-config";

const TEST_DIR = join(import.meta.dirname, "../..", ".test-embark-config");

async function setup() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
}

async function teardown() {
  rmSync(TEST_DIR, { recursive: true, force: true });
}

describe("embark-config", () => {
  beforeEach(setup);
  afterEach(teardown);

  describe("readEmbarkConfig", () => {
    it("should return null when .embark.json does not exist", async () => {
      const config = await readEmbarkConfig(TEST_DIR);
      expect(config).toBeNull();
    });

    it("should return parsed config when .embark.json exists", async () => {
      await writeFile(
        join(TEST_DIR, ".embark.json"),
        JSON.stringify({ deploy: "netlify" }),
      );
      const config = await readEmbarkConfig(TEST_DIR);
      expect(config).toEqual({ deploy: "netlify" });
    });

    it("should parse cloud-run config", async () => {
      await writeFile(
        join(TEST_DIR, ".embark.json"),
        JSON.stringify({ deploy: "cloud-run" }),
      );
      const config = await readEmbarkConfig(TEST_DIR);
      expect(config).toEqual({ deploy: "cloud-run" });
    });
  });

  describe("getDeployTarget", () => {
    it("should return cloud-run when no config exists", async () => {
      const target = await getDeployTarget(TEST_DIR);
      expect(target).toBe("cloud-run");
    });

    it("should return netlify when config says netlify", async () => {
      await writeFile(
        join(TEST_DIR, ".embark.json"),
        JSON.stringify({ deploy: "netlify" }),
      );
      const target = await getDeployTarget(TEST_DIR);
      expect(target).toBe("netlify");
    });

    it("should return cloud-run when config has no deploy field", async () => {
      await writeFile(join(TEST_DIR, ".embark.json"), JSON.stringify({}));
      const target = await getDeployTarget(TEST_DIR);
      expect(target).toBe("cloud-run");
    });
  });

  describe("isNetlifyPackage", () => {
    it("should return false when no config exists", async () => {
      const result = await isNetlifyPackage(TEST_DIR);
      expect(result).toBe(false);
    });

    it("should return true for netlify packages", async () => {
      await writeFile(
        join(TEST_DIR, ".embark.json"),
        JSON.stringify({ deploy: "netlify" }),
      );
      const result = await isNetlifyPackage(TEST_DIR);
      expect(result).toBe(true);
    });

    it("should return false for cloud-run packages", async () => {
      await writeFile(
        join(TEST_DIR, ".embark.json"),
        JSON.stringify({ deploy: "cloud-run" }),
      );
      const result = await isNetlifyPackage(TEST_DIR);
      expect(result).toBe(false);
    });
  });
});
