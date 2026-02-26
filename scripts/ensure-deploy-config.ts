import { readdir, readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { spawn } from "node:child_process";
import { join } from "node:path";
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as tty from "node:tty";
import { hasEmbarkConfig } from "./embark-config";
import type { DeployTarget } from "../shared/types/deploy";
import { processPackageDockerfile } from "./generate-dockerfiles";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");
const PROMPT_PATH = join(ROOT, "prompts", "dockerfileGen.prompt.md");

// ── AI CLI types ────────────────────────────────────────────
interface AiCli {
  name: string;
  command: string;
}

interface AiCommand {
  bin: string;
  args: string[];
}

// ── ANSI colors ────────────────────────────────────────────
const COLOR = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
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

async function askDockerfileMethod(): Promise<"ai" | "default" | null> {
  write(`\n${COLOR.bold}${COLOR.blue}? Dockerfile Generation Method${COLOR.reset}\n`);
  const selected = await menuSelect("How do you want to generate the Dockerfile?", [
    "Yes, choose which AI to use (Gemini, Claude, Copilot, Codex)",
    "No, generate default Dockerfile",
  ]);

  if (selected === 0) return "ai";
  if (selected === 1) return "default";
  return null;
}

async function askAiProvider(): Promise<string> {
  write(`\n${COLOR.bold}${COLOR.magenta}🤖 AI Provider Selection${COLOR.reset}\n`);
  const selected = await menuSelect("Which AI CLI do you want to use?", [
    "Gemini",
    "Claude",
    "Copilot",
    "Codex",
  ]);

  const providers = ["gemini", "claude", "copilot", "codex"];
  return providers[selected] ?? "claude";
}

// ── AI Dockerfile Generation ────────────────────────────────
async function listFiles(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;

    if (entry.isDirectory()) {
      const sub = await listFiles(join(directory, entry.name), relativePath);
      files.push(...sub);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

async function loadPromptTemplate(): Promise<string> {
  return readFile(PROMPT_PATH, "utf-8");
}

async function buildPrompt(packageDir: string, packageName: string): Promise<string> {
  const template = await loadPromptTemplate();
  const pkgJsonPath = join(packageDir, "package.json");
  const pkgJson = await readFile(pkgJsonPath, "utf-8");
  const files = await listFiles(packageDir);

  return template
    .replace("{{PACKAGE_NAME}}", packageName)
    .replace("{{PACKAGE_JSON}}", pkgJson)
    .replace("{{FILE_STRUCTURE}}", files.join("\n"));
}

function buildCommand(provider: string, prompt: string): AiCommand {
  const commands: Record<string, AiCommand> = {
    gemini: { bin: "gemini", args: ["-p", prompt] },
    claude: { bin: "claude", args: ["--dangerously-skip-permissions", prompt] },
    copilot: { bin: "copilot", args: ["-p", prompt, "--allow-all"] },
    codex: { bin: "codex", args: ["exec", prompt] },
  };

  const cmd = commands[provider];
  if (!cmd) {
    throw new Error(`Command not defined for AI provider: ${provider}`);
  }
  return cmd;
}

function executeAiCli(provider: string, prompt: string, onData: (chunk: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const { bin, args } = buildCommand(provider, prompt);
    const proc = spawn(bin, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        proc.kill();
        reject(new Error(`${provider} exceeded the 2-minute timeout`));
      }
    }, 120_000);
    timer.unref();

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      onData(text);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      finished = true;
      clearTimeout(timer);

      if (stdout.trim().length > 0) {
        resolve(stdout.trim());
      } else if (code !== 0) {
        reject(new Error(`${provider} exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on("error", (err) => {
      finished = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

function cleanAiResponse(response: string): string {
  let cleaned = response;
  cleaned = cleaned.replace(/^```[\w]*\n?/gm, "").replace(/\n?```$/gm, "");

  const fromIndex = cleaned.indexOf("FROM");
  if (fromIndex > 0) {
    cleaned = cleaned.slice(fromIndex);
  }

  return cleaned.trim() + "\n";
}

async function generateDockerfileWithAi(packageDir: string, packageName: string, provider: string): Promise<boolean> {
  const dockerfilePath = join(packageDir, "Dockerfile");

  try {
    write(`  ${COLOR.dim}⏳ Generating Dockerfile with ${provider}...${COLOR.reset}\n`);

    const prompt = await buildPrompt(packageDir, packageName);
    let output = "";
    let bytesReceived = 0;

    const response = await executeAiCli(provider, prompt, (chunk) => {
      output += chunk;
      bytesReceived += chunk.length;
      // Update progress line with byte counter
      write(`${CURSOR.clearLine}  ${COLOR.dim}⏳ Receiving data... ${COLOR.gray}(${bytesReceived} bytes)${COLOR.reset}`);
    });

    write(`\n`); // Move to next line after progress update

    const dockerfile = cleanAiResponse(response);
    await writeFile(dockerfilePath, dockerfile, "utf-8");

    write(`  ${COLOR.green}✓${COLOR.reset} ${provider.toUpperCase()} generated Dockerfile successfully ${COLOR.gray}(${bytesReceived} bytes received)${COLOR.reset}\n`);
    return true;
  } catch (error) {
    write(`\n`); // Move to next line after progress update
    write(`  ${COLOR.dim}ℹ${COLOR.reset} Could not generate with ${provider}: ${error instanceof Error ? error.message : "Unknown error"}\n`);
    write(`  ${COLOR.dim}→${COLOR.reset} Falling back to default Dockerfile\n`);
    const created = await processPackageDockerfile(packageName, packageDir);
    return created;
  }
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
      write(`\n${COLOR.bold}${COLOR.yellow}↳ Netlify Configuration${COLOR.reset}\n`);

      const netlifyToml = buildNetlifyToml("bun run build", "dist");
      await writeFile(join(packageDir, "netlify.toml"), netlifyToml);
      write(`  ${COLOR.green}✓${COLOR.reset} Created netlify.toml\n`);
      write(
        `  ${COLOR.dim}ℹ${COLOR.reset} Deployment will be configured via Netlify (no GitHub Actions workflow)\n`,
      );

      const wantsDocker = await askYesNo("\n  Generate a Dockerfile for this package? (optional)");
      if (wantsDocker) {
        const method = await askDockerfileMethod();
        if (method === "default") {
          const created = await processPackageDockerfile(packageName, packageDir);
          if (created) write(`  ${COLOR.green}✓${COLOR.reset} Default Dockerfile generated\n`);
        } else if (method === "ai") {
          const aiProvider = await askAiProvider();
          await generateDockerfileWithAi(packageDir, packageName, aiProvider);
        }
      }
    }

    // Handle "Other" target
    if (target === "other") {
      write(`\n${COLOR.bold}${COLOR.yellow}↳ Custom Deploy Configuration${COLOR.reset}\n`);
      write(
        `  ${COLOR.dim}ℹ${COLOR.reset} You'll need to manually configure:\n`,
      );
      write(`    • Your deployment platform\n`);
      write(`    • Dockerfile (if required)\n`);
      write(`    • GitHub Actions workflow (if needed)\n`);

      const wantsDocker = await askYesNo("\n  Generate a Dockerfile for this package? (optional)");
      if (wantsDocker) {
        const method = await askDockerfileMethod();
        if (method === "default") {
          const created = await processPackageDockerfile(packageName, packageDir);
          if (created) write(`  ${COLOR.green}✓${COLOR.reset} Default Dockerfile generated\n`);
        } else if (method === "ai") {
          const aiProvider = await askAiProvider();
          await generateDockerfileWithAi(packageDir, packageName, aiProvider);
        }
      }
    }

    // Handle Cloud Run target
    if (target === "cloud-run") {
      write(`\n${COLOR.bold}${COLOR.yellow}↳ Google Cloud Run Configuration${COLOR.reset}\n`);
      write(`  ${COLOR.dim}ℹ${COLOR.reset} Cloud Run deployment will:\n`);
      write(`    • Auto-generate GitHub Actions workflow\n`);
      write(`    • Auto-generate Dockerfile (optional)\n`);

      const wantsDocker = await askYesNo("\n  Generate a Dockerfile? (recommended for Cloud Run)");
      if (wantsDocker) {
        const method = await askDockerfileMethod();
        if (method === "default") {
          const created = await processPackageDockerfile(packageName, packageDir);
          if (created) write(`  ${COLOR.green}✓${COLOR.reset} Default Dockerfile generated\n`);
        } else if (method === "ai") {
          const aiProvider = await askAiProvider();
          await generateDockerfileWithAi(packageDir, packageName, aiProvider);
        }
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
