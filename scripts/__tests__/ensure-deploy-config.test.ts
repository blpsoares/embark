import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { getPackagesWithoutConfig } from "../ensure-deploy-config";

const TEST_DIR = join(import.meta.dirname, "../..", ".test-ensure-deploy");

async function setup() {
  rmSync(TEST_DIR, { recursive: true, force: true });
  await mkdir(TEST_DIR, { recursive: true });
}

async function teardown() {
  rmSync(TEST_DIR, { recursive: true, force: true });
}

describe("ensure-deploy-config", () => {
  beforeEach(setup);
  afterEach(teardown);

  describe("getPackagesWithoutConfig", () => {
    it("should return empty array when no packages exist", async () => {
      const result = await getPackagesWithoutConfig(TEST_DIR);
      expect(result).toEqual([]);
    });

    it("should return package names that lack .embark.jsonc", async () => {
      await mkdir(join(TEST_DIR, "my-app"), { recursive: true });
      await mkdir(join(TEST_DIR, "my-api"), { recursive: true });

      const result = await getPackagesWithoutConfig(TEST_DIR);
      expect(result).toContain("my-app");
      expect(result).toContain("my-api");
      expect(result).toHaveLength(2);
    });

    it("should not return packages that have .embark.jsonc", async () => {
      await mkdir(join(TEST_DIR, "has-config"), { recursive: true });
      await writeFile(
        join(TEST_DIR, "has-config", ".embark.jsonc"),
        JSON.stringify({ deploy: "cloud-run" }),
      );

      await mkdir(join(TEST_DIR, "no-config"), { recursive: true });

      const result = await getPackagesWithoutConfig(TEST_DIR);
      expect(result).toEqual(["no-config"]);
    });

    it("should return empty when all packages have config", async () => {
      await mkdir(join(TEST_DIR, "pkg-a"), { recursive: true });
      await writeFile(
        join(TEST_DIR, "pkg-a", ".embark.jsonc"),
        JSON.stringify({ deploy: "netlify" }),
      );

      await mkdir(join(TEST_DIR, "pkg-b"), { recursive: true });
      await writeFile(
        join(TEST_DIR, "pkg-b", ".embark.jsonc"),
        JSON.stringify({ deploy: "other" }),
      );

      const result = await getPackagesWithoutConfig(TEST_DIR);
      expect(result).toEqual([]);
    });

    it("should ignore files (non-directories) in packages dir", async () => {
      await writeFile(join(TEST_DIR, "not-a-package.txt"), "hello");
      await mkdir(join(TEST_DIR, "real-pkg"), { recursive: true });

      const result = await getPackagesWithoutConfig(TEST_DIR);
      expect(result).toEqual(["real-pkg"]);
    });
  });
});
