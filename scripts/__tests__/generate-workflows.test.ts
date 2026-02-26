import { describe, test, expect } from "bun:test";
import { exists, processPackageWorkflow, processPackagesWorkflows } from "../generate-workflows";
import { writeFileSync, unlinkSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("exists", () => {
  test("returns true for existing file", async () => {
    const result = await exists(import.meta.path);
    expect(result).toBe(true);
  });

  test("returns true for existing directory", async () => {
    const result = await exists(".");
    expect(result).toBe(true);
  });

  test("returns false for nonexistent path", async () => {
    const result = await exists("/nonexistent/file/that/does/not/exist/xyz123");
    expect(result).toBe(false);
  });

  test("returns false for deleted file", async () => {
    const testFile = join(tmpdir(), `test-${Date.now()}.txt`);
    writeFileSync(testFile, "test");
    expect(await exists(testFile)).toBe(true);
    unlinkSync(testFile);
    expect(await exists(testFile)).toBe(false);
  });
});

describe("placeholder substitution", () => {
  test("template.replaceAll substitutes correctly", () => {
    const template = "name: Deploy __PACKAGE_NAME__\nservice: __PACKAGE_NAME__";
    const placeholder = "__PACKAGE_NAME__";
    const packageName = "showcase";
    const result = template.replaceAll(placeholder, packageName);

    expect(result).toContain("name: Deploy showcase");
    expect(result).toContain("service: showcase");
  });

  test("substitutes multiple occurrences", () => {
    const template = "__PACKAGE_NAME__ __PACKAGE_NAME__ __PACKAGE_NAME__";
    const result = template.replaceAll("__PACKAGE_NAME__", "test");
    expect(result).toBe("test test test");
  });

  test("does not substitute if placeholder does not exist", () => {
    const template = "text without placeholder";
    const result = template.replaceAll("__PACKAGE_NAME__", "showcase");
    expect(result).toBe("text without placeholder");
  });
});

describe("getPackageNames", () => {
  test("lists existing directories", async () => {
    const { getPackageNames } = await import("../generate-workflows");
    const packages = await getPackageNames();
    expect(packages.length).toBeGreaterThan(0);
    expect(Array.isArray(packages)).toBe(true);
  });

  test("returns names without directories", async () => {
    const { getPackageNames } = await import("../generate-workflows");
    const packages = await getPackageNames();
    packages.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  test("includes known packages", async () => {
    const { getPackageNames } = await import("../generate-workflows");
    const packages = await getPackageNames();
    expect(packages).toContain("showcase");
  });

  test("returns only directory names", async () => {
    const { getPackageNames } = await import("../generate-workflows");
    const packages = await getPackageNames();
    // Verify it doesn't include files like .gitignore, package.json, etc
    expect(packages.every((p) => !p.includes("."))).toBe(true);
  });
});

describe("workflow substitution logic", () => {
  const PLACEHOLDER = "__PACKAGE_NAME__";

  test("substitutes all placeholder occurrences", () => {
    const template = `name: Deploy __PACKAGE_NAME__
service: __PACKAGE_NAME__
image: __PACKAGE_NAME__:latest`;
    const result = template.replaceAll(PLACEHOLDER, "my-service");
    expect(result).not.toContain(PLACEHOLDER);
    expect((result.match(/my-service/g) || []).length).toBe(3);
  });

  test("preserves template structure after substitution", () => {
    const template = `name: Deploy __PACKAGE_NAME__

env:
  SERVICE_NAME: __PACKAGE_NAME__

jobs:
  deploy:
    steps:
      - name: Deploy __PACKAGE_NAME__`;
    const result = template.replaceAll(PLACEHOLDER, "showcase");
    expect(result).toContain("name: Deploy showcase");
    expect(result).toContain("SERVICE_NAME: showcase");
    expect(result).toContain("- name: Deploy showcase");
    expect(result.includes("\nenv:\n")).toBe(true);
    expect(result.includes("\njobs:\n")).toBe(true);
  });

  test("works with names containing hyphens", () => {
    const template = "__PACKAGE_NAME__-workflow";
    const result = template.replaceAll(PLACEHOLDER, "my-package");
    expect(result).toBe("my-package-workflow");
  });

  test("substitutes lowercase placeholder correctly", () => {
    const template = "image: gcr.io/project/embark/__PACKAGE_NAME_LOWERCASE__:latest";
    const packageName = "myApp";
    const result = template
      .replaceAll(PLACEHOLDER, packageName)
      .replaceAll("__PACKAGE_NAME_LOWERCASE__", packageName.toLowerCase());

    expect(result).toBe("image: gcr.io/project/embark/myapp:latest");
    expect(result).not.toContain("__PACKAGE_NAME_LOWERCASE__");
  });

  test("substitutes both placeholders in a template", () => {
    const template = `name: Deploy __PACKAGE_NAME__
image: gcr.io/embark/__PACKAGE_NAME_LOWERCASE__:latest`;
    const packageName = "MyService";
    const result = template
      .replaceAll(PLACEHOLDER, packageName)
      .replaceAll("__PACKAGE_NAME_LOWERCASE__", packageName.toLowerCase());

    expect(result).toContain("name: Deploy MyService");
    expect(result).toContain("image: gcr.io/embark/myservice:latest");
  });
});

describe("processPackageWorkflow - I/O integration", () => {
  test("creates workflow when it does not exist", async () => {
    const testDir = join(tmpdir(), `test-workflow-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = `name: Deploy __PACKAGE_NAME__
service: __PACKAGE_NAME__`;

      const result = await processPackageWorkflow("test-svc", template, testDir);
      expect(result).toBe(true);

      const files = readdirSync(testDir);
      expect(files).toContain("test-svc.yml");

      const content = readFileSync(join(testDir, "test-svc.yml"), "utf-8");
      expect(content).toContain("name: Deploy test-svc");
      expect(content).toContain("service: test-svc");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("returns false if workflow already exists", async () => {
    const testDir = join(tmpdir(), `test-workflow-exist-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      writeFileSync(join(testDir, "test-svc.yml"), "name: existing");
      const template = `name: Deploy __PACKAGE_NAME__`;

      const result = await processPackageWorkflow("test-svc", template, testDir);
      expect(result).toBe(false);

      // Verify original file was not modified
      const content = readFileSync(join(testDir, "test-svc.yml"), "utf-8");
      expect(content).toBe("name: existing");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("substitutes placeholders correctly in file", async () => {
    const testDir = join(tmpdir(), `test-workflow-placeholder-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = `name: Deploy __PACKAGE_NAME__
env:
  SERVICE: __PACKAGE_NAME__`;

      await processPackageWorkflow("my-app", template, testDir);

      const content = readFileSync(join(testDir, "my-app.yml"), "utf-8");
      expect(content).toContain("name: Deploy my-app");
      expect(content).toContain("SERVICE: my-app");
      expect(content).not.toContain("__PACKAGE_NAME__");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("creates multiple workflows in sequence", async () => {
    const testDir = join(tmpdir(), `test-workflow-multiple-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = `name: Deploy __PACKAGE_NAME__`;

      const result1 = await processPackageWorkflow("app1", template, testDir);
      const result2 = await processPackageWorkflow("app2", template, testDir);
      const result3 = await processPackageWorkflow("app1", template, testDir); // Second time, should return false

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false); // Already exists

      const files = readdirSync(testDir);
      expect(files).toContain("app1.yml");
      expect(files).toContain("app2.yml");
      expect(files.length).toBe(2);
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("empty template is processed correctly", async () => {
    const testDir = join(tmpdir(), `test-workflow-empty-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = "";
      await processPackageWorkflow("app", template, testDir);

      const content = readFileSync(join(testDir, "app.yml"), "utf-8");
      expect(content).toBe("");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });
});

describe("processPackagesWorkflows", () => {
  test("processes multiple packages and detects changes", async () => {
    const testDir = join(tmpdir(), `test-workflows-batch-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = `name: Deploy __PACKAGE_NAME__`;
      const packages = ["app1", "app2", "app3"];

      const hasChanges = await processPackagesWorkflows(template, packages, testDir);

      expect(hasChanges).toBe(true);
      const files = readdirSync(testDir);
      expect(files).toContain("app1.yml");
      expect(files).toContain("app2.yml");
      expect(files).toContain("app3.yml");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("returns false when all workflows already exist", async () => {
    const testDir = join(tmpdir(), `test-workflows-exist-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = `name: Deploy __PACKAGE_NAME__`;
      const packages = ["app1", "app2"];

      // First time creates the files
      await processPackagesWorkflows(template, packages, testDir);

      // Second time returns false since they already exist
      const hasChanges = await processPackagesWorkflows(template, packages, testDir);
      expect(hasChanges).toBe(false);
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("processes empty list without changes", async () => {
    const testDir = join(tmpdir(), `test-workflows-empty-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = `name: Deploy __PACKAGE_NAME__`;
      const packages: string[] = [];

      const hasChanges = await processPackagesWorkflows(template, packages, testDir);
      expect(hasChanges).toBe(false);

      const files = readdirSync(testDir);
      expect(files.length).toBe(0);
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("processes partially existing packages", async () => {
    const testDir = join(tmpdir(), `test-workflows-partial-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const template = `name: Deploy __PACKAGE_NAME__`;

      // Create first workflow
      await processPackagesWorkflows(template, ["app1"], testDir);

      // Process list with existing and new
      const hasChanges = await processPackagesWorkflows(
        template,
        ["app1", "app2"],
        testDir,
      );

      expect(hasChanges).toBe(true); // There was a change (app2 was created)

      const files = readdirSync(testDir);
      expect(files).toContain("app1.yml");
      expect(files).toContain("app2.yml");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });
});
