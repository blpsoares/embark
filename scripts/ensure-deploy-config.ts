import { readdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as tty from "node:tty";
import { hasEmbarkConfig } from "./embark-config";
import type { DeployTarget } from "../shared/types/deploy";
import { processPackageDockerfile } from "./generate-dockerfiles";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

// ── ANSI colors ────────────────────────────────────────────
const COLOR = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
} as const;

// ── ANSI cursor ────────────────────────────────────────────
const CURSOR = {
  hide: "\x1b[?25l",
  show: "\x1b[?25h",
  clearLine: "\x1b[2K\r",
  moveUp: "\x1b[1A",
} as const;

let TTY_IN: tty.ReadStream | null = null;
let TTY_OUT: fs.WriteStream | null = null;

function tryInitTty() {
  if (TTY_IN && TTY_OUT) return;
  try {
    const fd = fs.openSync("/dev/tty", "r+");
    const inStream = new tty.ReadStream(fd);
    const outStream = fs.createWriteStream(null as any, { fd });
    TTY_IN = inStream;
    TTY_OUT = outStream;
  } catch {
    // TTY not available (e.g., in CI or some hook environments)
  }
}

function write(text: string) {
  process.stdout.write(text);
}

async function readKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Prefer using the process stdin when it's a TTY
    if (typeof process.stdin.setRawMode === "function" && process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", (data) => {
        try {
          process.stdin.setRawMode(false);
        } catch {}
        process.stdin.pause();
        resolve(data.toString());
      });
    } else {
      reject(new Error("TTY not available"));
    }
  });
}

function renderMenu(
  title: string,
  options: string[],
  index: number,
  totalLines: number,
) {
  write(`${CURSOR.moveUp.repeat(totalLines)}`);
  write(`  ${title}\n`);
  write(`  ${COLOR.dim}↑/↓ navigate  │  Enter select  │  q cancel${COLOR.reset}\n`);
  write(`\n`);

  for (let i = 0; i < options.length; i++) {
    if (i === index) {
      write(`  ${COLOR.cyan}${COLOR.bold}❯ ${options[i]}${COLOR.reset}\n`);
    } else {
      write(`  ${COLOR.gray}  ${options[i]}${COLOR.reset}\n`);
    }
  }
}

async function menuSelect(title: string, options: string[]): Promise<number> {
  // If raw mode isn't available (e.g., non-TTY or some CI/hook environments),
  // fall back to a numbered prompt using readline.
  if (typeof process.stdin.setRawMode !== "function" || !process.stdin.isTTY) {
    write(`${title}\n`);
    for (let i = 0; i < options.length; i++) {
      write(`  ${i + 1}. ${options[i]}\n`);
    }
    write(`\n`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(`Choose [1-${options.length}] (default 1): `, (answer) => {
        rl.close();
        const n = parseInt(answer.trim(), 10);
        if (Number.isFinite(n) && n >= 1 && n <= options.length) {
          resolve(n - 1);
        } else {
          resolve(0);
        }
      });
    });
  }

  const totalLines = options.length + 3;

  write(CURSOR.hide);
  write(`  ${title}\n`);
  write(`  ${COLOR.dim}↑/↓ navigate  │  Enter select  │  q cancel${COLOR.reset}\n`);
  write(`\n`);

  let index = 0;

  for (let i = 0; i < options.length; i++) {
    if (i === index) {
      write(`  ${COLOR.cyan}${COLOR.bold}❯ ${options[i]}${COLOR.reset}\n`);
    } else {
      write(`  ${COLOR.gray}  ${options[i]}${COLOR.reset}\n`);
    }
  }

  while (true) {
    let key: string;
    try {
      key = await readKey();
    } catch (err) {
      // If raw mode failed mid-loop, fall back to numeric prompt
      write(CURSOR.show);
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      return new Promise((resolve) => {
        rl.question(`Choose [1-${options.length}] (default 1): `, (answer) => {
          rl.close();
          const n = parseInt(answer.trim(), 10);
          if (Number.isFinite(n) && n >= 1 && n <= options.length) {
            resolve(n - 1);
          } else {
            resolve(0);
          }
        });
      });
    }

    if (key === "\x1b[A") {
      index = (index - 1 + options.length) % options.length;
    } else if (key === "\x1b[B") {
      index = (index + 1) % options.length;
    } else if (key === "\r" || key === "\n") {
      write(CURSOR.show);
      return index;
    } else if (key === "q" || key === "\x03") {
      write(CURSOR.show);
      return 0; // Default to first option on cancel
    } else {
      continue;
    }

    renderMenu(title, options, index, totalLines);
  }
}

async function askYesNo(question: string): Promise<boolean> {
  const selected = await menuSelect(`${question}`, ["Yes", "No"]);
  return selected === 0;
}

function buildNetlifyToml(buildCommand: string, publishDir: string): string {
  return `[build]
  command = "${buildCommand}"
  publish = "${publishDir}"
`;
}

export async function getPackagesWithoutConfig(
  packagesDir = PACKAGES_DIR,
): Promise<string[]> {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const missing: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgDir = join(packagesDir, entry.name);
    if (!(await hasEmbarkConfig(pkgDir))) {
      missing.push(entry.name);
    }
  }

  return missing;
}

async function ensureDeployConfig() {
  tryInitTty();
  const missing = await getPackagesWithoutConfig();

  if (missing.length === 0) {
    console.log("[ensure-deploy-config] all packages have .embark.jsonc");
    return;
  }

  let hasChanges = false;

  for (const packageName of missing) {
    const packageDir = join(PACKAGES_DIR, packageName);

    // Show interactive menu for deploy target
    write(`\n${COLOR.bold}🚀 Package "${packageName}" needs a deploy configuration${COLOR.reset}\n`);
    const targetIndex = await menuSelect("Choose deploy target:", [
      "Google Cloud Run (generates workflow + Dockerfile)",
      "Netlify (no CI/CD or Docker needed)",
      "Other (custom deploy — manual configuration)",
    ]);

    const targets: DeployTarget[] = ["cloud-run", "netlify", "other"];
    const target = targets[targetIndex];

    // Write .embark.jsonc
    const config = { deploy: target };
    const configContent = `// This file is auto-generated by Embark. Do not remove or edit manually.
// Your deploy configuration is maintained here.
${JSON.stringify(config, null, 2)}
`;
    await writeFile(join(packageDir, ".embark.jsonc"), configContent);
    write(`  ${COLOR.green}✓${COLOR.reset} Created .embark.jsonc for ${COLOR.cyan}${packageName}${COLOR.reset} (deploy: ${COLOR.bold}${target}${COLOR.reset})\n`);

    // Handle Netlify target
    if (target === "netlify") {
      const netlifyToml = buildNetlifyToml("bun run build", "dist");
      await writeFile(join(packageDir, "netlify.toml"), netlifyToml);
      write(`  ${COLOR.green}✓${COLOR.reset} Created netlify.toml for ${COLOR.cyan}${packageName}${COLOR.reset}\n`);
      write(
        `  ${COLOR.dim}ℹ${COLOR.reset} Netlify deployment will be configured separately (no GitHub Actions workflow needed)\n`,
      );

      const wantsDocker = await askYesNo("  Generate a Dockerfile for this package? (optional)");
      if (wantsDocker) {
        const created = await processPackageDockerfile(packageName, packageDir);
        if (created) write(`  ${COLOR.green}✓${COLOR.reset} Dockerfile generated for ${COLOR.cyan}${packageName}${COLOR.reset}\n`);
      }
    }

    // Handle "Other" target
    if (target === "other") {
      write(
        `  ${COLOR.dim}ℹ${COLOR.reset} Custom deploy configuration detected. You'll need to:\n`,
      );
      write(`    • Configure your deployment platform manually\n`);
      write(`    • Add Dockerfile if your platform requires it\n`);
      write(`    • Add GitHub Actions workflow if needed\n\n`);

      const wantsDocker = await askYesNo("  Generate a Dockerfile for this package? (optional)");
      if (wantsDocker) {
        const created = await processPackageDockerfile(packageName, packageDir);
        if (created) write(`  ${COLOR.green}✓${COLOR.reset} Dockerfile generated for ${COLOR.cyan}${packageName}${COLOR.reset}\n`);
      }
    }

    // Handle Cloud Run target
    if (target === "cloud-run") {
      write(`  ${COLOR.dim}ℹ${COLOR.reset} Google Cloud Run deployment will:\n`);
      write(`    • Auto-generate GitHub Actions workflow\n`);
      write(`    • Auto-generate Dockerfile (optional)\n\n`);

      const wantsDocker = await askYesNo("  Generate a Dockerfile? (recommended for Cloud Run)");
      if (wantsDocker) {
        const created = await processPackageDockerfile(packageName, packageDir);
        if (created) write(`  ${COLOR.green}✓${COLOR.reset} Dockerfile generated for ${COLOR.cyan}${packageName}${COLOR.reset}\n`);
      }
    }

    hasChanges = true;
  }

  if (hasChanges) {
    try {
      execSync("git add packages/*/.embark.jsonc", { cwd: ROOT, stdio: "ignore" });
      execSync("git add packages/*/netlify.toml", { cwd: ROOT, stdio: "ignore" });
      execSync("git add packages/*/Dockerfile", { cwd: ROOT, stdio: "ignore" });
    } catch {
      // Some globs may not match, that's ok
    }
  }
}

if (import.meta.main) {
  ensureDeployConfig().catch((error) => {
    console.error("[ensure-deploy-config] error:", error);
    process.exit(1);
  });
}
