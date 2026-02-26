import { describe, test, expect } from "bun:test";
import { resolveEntrypoint, buildDockerfile, processPackageDockerfile } from "../generate-dockerfiles";
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

interface PackageJson {
  name?: string;
  main?: string;
  module?: string;
  scripts?: Record<string, string>;
}

describe("resolveEntrypoint", () => {
  test("returns scripts.start if available", () => {
    const pkg: PackageJson = {
      scripts: { start: "bun run src/server.ts" },
    };
    expect(resolveEntrypoint(pkg)).toBe("bun run src/server.ts");
  });

  test("returns bun run <main> if no start script", () => {
    const pkg: PackageJson = {
      main: "dist/index.js",
    };
    expect(resolveEntrypoint(pkg)).toBe("bun run dist/index.js");
  });

  test("returns bun run <module> if no start or main", () => {
    const pkg: PackageJson = {
      module: "dist/index.mjs",
    };
    expect(resolveEntrypoint(pkg)).toBe("bun run dist/index.mjs");
  });

  test("returns bun run src/index.ts as default", () => {
    const pkg: PackageJson = {};
    expect(resolveEntrypoint(pkg)).toBe("bun run src/index.ts");
  });

  test("ignores main and module if scripts.start exists", () => {
    const pkg: PackageJson = {
      scripts: { start: "custom-start" },
      main: "dist/index.js",
      module: "dist/index.mjs",
    };
    expect(resolveEntrypoint(pkg)).toBe("custom-start");
  });
});

describe("buildDockerfile", () => {
  test("contains base oven/bun:latest", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain("FROM oven/bun:latest");
  });

  test("contains EXPOSE 8080", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain("EXPOSE 8080");
  });

  test("contains WORKDIR /app", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain("WORKDIR /app");
  });

  test("does not contain RUN bun run build when hasBuild = false", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).not.toContain("RUN bun run build");
  });

  test("contains RUN bun run build when hasBuild = true", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, true);
    expect(dockerfile).toContain("RUN bun run build");
  });

  test("generates correct CMD for simple entrypoint", () => {
    const pkg: PackageJson = {
      scripts: { start: "node index.js" },
    };
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain('CMD ["node", "index.js"]');
  });

  test("generates correct CMD for multi-word entrypoint", () => {
    const pkg: PackageJson = {
      scripts: { start: "bun run src/server.ts" },
    };
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain('CMD ["bun", "run", "src/server.ts"]');
  });

  test("contains COPY package.json bun.lock*", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain("COPY package.json bun.lock*");
  });

  test("contains RUN bun install --frozen-lockfile --production", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain("RUN bun install --frozen-lockfile --production");
  });

  test("contains AS base in base image", () => {
    const pkg: PackageJson = {};
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain("FROM oven/bun:latest AS base");
  });

  test("organizes lines correctly", () => {
    const pkg: PackageJson = {
      scripts: { start: "node index.js", build: "npm run build" },
    };
    const dockerfile = buildDockerfile(pkg, true);
    const lines = dockerfile.split("\n");

    // Verify order of main sections
    const idxFrom = lines.findIndex((l) => l.startsWith("FROM"));
    const idxWorkdir = lines.findIndex((l) => l.startsWith("WORKDIR"));
    const idxCopy = lines.findIndex((l) => l.startsWith("COPY"));
    const idxRun = lines.findIndex((l) => l.startsWith("RUN bun install"));
    const idxBuild = lines.findIndex((l) => l.includes("RUN bun run build"));
    const idxExpose = lines.findIndex((l) => l.startsWith("EXPOSE"));
    const idxCmd = lines.findIndex((l) => l.startsWith("CMD"));

    expect(idxFrom).toBeLessThan(idxWorkdir);
    expect(idxWorkdir).toBeLessThan(idxCopy);
    expect(idxCopy).toBeLessThan(idxRun);
    expect(idxRun).toBeLessThan(idxBuild);
    expect(idxBuild).toBeLessThan(idxExpose);
    expect(idxExpose).toBeLessThan(idxCmd);
  });

  test("CMD with spaces in entrypoint", () => {
    const pkg: PackageJson = {
      scripts: { start: "node --experimental-modules index.js" },
    };
    const dockerfile = buildDockerfile(pkg, false);
    expect(dockerfile).toContain('CMD ["node", "--experimental-modules", "index.js"]');
  });
});

describe("processPackageDockerfile - I/O integration", () => {
  test("creates Dockerfile when package.json exists", async () => {
    const testDir = join(tmpdir(), `test-docker-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const pkg = {
        name: "test-pkg",
        scripts: { start: "bun run src/index.ts" },
      };
      writeFileSync(join(testDir, "package.json"), JSON.stringify(pkg));

      const result = await processPackageDockerfile("test-pkg", testDir);
      expect(result).toBe(true);

      const files = readdirSync(testDir);
      expect(files).toContain("Dockerfile");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("returns false if Dockerfile already exists", async () => {
    const testDir = join(tmpdir(), `test-docker-exist-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const pkg = {
        name: "test-pkg",
        scripts: { start: "bun run src/index.ts" },
      };
      writeFileSync(join(testDir, "package.json"), JSON.stringify(pkg));
      writeFileSync(join(testDir, "Dockerfile"), "FROM ubuntu");

      const result = await processPackageDockerfile("test-pkg", testDir);
      expect(result).toBe(false);
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("returns false if package.json does not exist", async () => {
    const testDir = join(tmpdir(), `test-no-pkg-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const result = await processPackageDockerfile("test-pkg", testDir);
      expect(result).toBe(false);
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });

  test("generates Dockerfile with build step when scripts.build exists", async () => {
    const testDir = join(tmpdir(), `test-docker-build-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const pkg = {
        name: "test-pkg",
        scripts: { start: "bun run src/index.ts", build: "bun run build" },
      };
      writeFileSync(join(testDir, "package.json"), JSON.stringify(pkg));

      await processPackageDockerfile("test-pkg", testDir);

      const dockerfile = readFileSync(join(testDir, "Dockerfile"), "utf-8");
      expect(dockerfile).toContain("RUN bun run build");
    } finally {
      Bun.spawnSync(["rm", "-rf", testDir]);
    }
  });
});
