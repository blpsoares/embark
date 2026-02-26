import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { execSync, spawn } from "node:child_process";
import { join } from "node:path";
import { isNetlifyPackage } from "./embark-config";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");
const PROMPT_PATH = join(ROOT, "prompts", "dockerfileGen.prompt.md");

// ── ANSI colors ────────────────────────────────────────────
const COLOR = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

// ── ANSI cursor ────────────────────────────────────────────
const CURSOR = {
  hide: "\x1b[?25l",
  show: "\x1b[?25h",
  clearLine: "\x1b[2K\r",
  moveUp: "\x1b[1A",
} as const;

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

// ── types ──────────────────────────────────────────────────
interface PackageInfo {
  name: string;
  directory: string;
  packageJson: string;
  packageJsonParsed: PackageJson;
  files: string[];
}

interface PackageJson {
  name?: string;
  main?: string;
  module?: string;
  scripts?: Record<string, string>;
}

interface AiCli {
  name: string;
  command: string;
}

interface AiCommand {
  bin: string;
  args: string[];
}

const AVAILABLE_CLIS: AiCli[] = [
  { name: "Gemini", command: "gemini" },
  { name: "Claude", command: "claude" },
  { name: "Copilot", command: "copilot" },
  { name: "Codex", command: "codex" },
];

// ── utilities ──────────────────────────────────────────────
async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isCliAvailable(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function write(text: string) {
  process.stdout.write(text);
}

// ── spinner with status ────────────────────────────────────
function createSpinner(message: string) {
  let frame = 0;
  let currentText = message;

  const interval = setInterval(() => {
    const symbol = SPINNER[frame % SPINNER.length];
    write(`${CURSOR.clearLine}  ${COLOR.cyan}${symbol}${COLOR.reset} ${currentText}`);
    frame++;
  }, 80);

  return {
    update(newText: string) {
      currentText = newText;
    },
    success(text: string) {
      clearInterval(interval);
      write(`${CURSOR.clearLine}  ${COLOR.green}✓${COLOR.reset} ${text}\n`);
    },
    error(text: string) {
      clearInterval(interval);
      write(`${CURSOR.clearLine}  ${COLOR.red}✗${COLOR.reset} ${text}\n`);
    },
  };
}

// ── fixed interactive menu ─────────────────────────────────
async function readKey(): Promise<string> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(data.toString());
    });
  });
}

function renderMenu(title: string, options: string[], index: number, totalLines: number) {
  for (let i = 0; i < totalLines; i++) {
    write(CURSOR.moveUp + CURSOR.clearLine);
  }

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

async function menuSelect(title: string, options: string[]): Promise<number | null> {
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
    const key = await readKey();

    if (key === "\x1b[A") {
      index = (index - 1 + options.length) % options.length;
    } else if (key === "\x1b[B") {
      index = (index + 1) % options.length;
    } else if (key === "\r" || key === "\n") {
      write(CURSOR.show);
      return index;
    } else if (key === "q" || key === "\x03") {
      write(CURSOR.show);
      return null;
    } else {
      continue;
    }

    renderMenu(title, options, index, totalLines);
  }
}

// ── package scanning ───────────────────────────────────────
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

async function getPackagesWithoutDockerfile(): Promise<PackageInfo[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const packages: PackageInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const packageDir = join(PACKAGES_DIR, entry.name);
    const dockerfilePath = join(packageDir, "Dockerfile");
    const pkgJsonPath = join(packageDir, "package.json");

    if (await exists(dockerfilePath)) continue;
    if (!(await exists(pkgJsonPath))) continue;
    if (await isNetlifyPackage(packageDir)) continue;

    const pkgContent = await readFile(pkgJsonPath, "utf-8");
    const files = await listFiles(packageDir);

    packages.push({
      name: entry.name,
      directory: packageDir,
      packageJson: pkgContent,
      packageJsonParsed: JSON.parse(pkgContent),
      files,
    });
  }

  return packages;
}

async function checkAllPackagesHaveDockerfile(): Promise<string[]> {
  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const withoutDockerfile: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageDir = join(PACKAGES_DIR, entry.name);
    if (await isNetlifyPackage(packageDir)) continue;
    const dockerfilePath = join(packageDir, "Dockerfile");
    if (!(await exists(dockerfilePath))) {
      withoutDockerfile.push(entry.name);
    }
  }

  return withoutDockerfile;
}

function detectAvailableClis(): AiCli[] {
  return AVAILABLE_CLIS.filter((cli) => isCliAvailable(cli.command));
}

// ── default generation (based on package.json) ─────────────
function resolveEntrypoint(pkg: PackageJson): string {
  if (pkg.scripts?.start) {
    return pkg.scripts.start;
  }
  const entry = pkg.main ?? pkg.module ?? "src/index.ts";
  return `bun run ${entry}`;
}

function buildDefaultDockerfile(pkg: PackageJson): string {
  const cmd = resolveEntrypoint(pkg);
  const parts = cmd.split(" ");
  const hasBuild = !!pkg.scripts?.build;

  const lines: string[] = [
    "FROM oven/bun:latest",
    "WORKDIR /app",
    "",
    "COPY package.json bun.lock* ./",
    "RUN bun install --frozen-lockfile --production",
    "",
    "COPY . .",
  ];

  if (hasBuild) {
    lines.push("", "RUN bun run build");
  }

  lines.push(
    "",
    "EXPOSE 8080",
    "",
    `CMD [${parts.map((p) => `"${p}"`).join(", ")}]`,
    ""
  );

  return lines.join("\n");
}

async function generateDefaultDockerfiles(packages: PackageInfo[]) {
  for (const pkg of packages) {
    const dockerfilePath = join(pkg.directory, "Dockerfile");
    if (await exists(dockerfilePath)) continue;

    const content = buildDefaultDockerfile(pkg.packageJsonParsed);
    await writeFile(dockerfilePath, content, "utf-8");
    write(`  ${COLOR.green}✓${COLOR.reset} ${pkg.name} — default Dockerfile created\n`);
  }
}

// ── AI generation (async) ──────────────────────────────────
let _promptTemplateCache: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (!_promptTemplateCache) {
    _promptTemplateCache = await Bun.file(PROMPT_PATH).text();
  }
  return _promptTemplateCache;
}

async function buildPrompt(pkg: PackageInfo): Promise<string> {
  const template = await loadPromptTemplate();
  return template
    .replace("{{PACKAGE_NAME}}", pkg.name)
    .replace("{{PACKAGE_JSON}}", pkg.packageJson)
    .replace("{{FILE_STRUCTURE}}", pkg.files.join("\n"));
}

function buildCommand(cli: AiCli, prompt: string): AiCommand {
  const commands: Record<string, AiCommand> = {
    gemini: { bin: "gemini", args: ["-p", prompt] },
    claude: { bin: "claude", args: ["--dangerously-skip-permissions", prompt] },
    copilot: { bin: "copilot", args: ["-p", prompt, "--allow-all"] },
    codex: { bin: "codex", args: ["exec", prompt] },
  };

  const cmd = commands[cli.command];
  if (!cmd) {
    throw new Error(`Command not defined for CLI: ${cli.command}`);
  }
  return cmd;
}

function executeAiCli(cli: AiCli, prompt: string, onData: (chunk: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const { bin, args } = buildCommand(cli, prompt);
    const proc = spawn(bin, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        proc.kill();
        reject(new Error(`${cli.name} exceeded the 2-minute timeout`));
      }
    }, 120_000);
    timer.unref();

    proc.stdout.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      onData(text);
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      finished = true;
      clearTimeout(timer);

      if (stdout.trim().length > 0) {
        resolve(stdout.trim());
      } else if (code !== 0) {
        reject(new Error(`${cli.name} exited with code ${code}: ${stderr}`));
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

// ── commit blocking ────────────────────────────────────────
function blockCommit(reason: string): never {
  write(`\n  ${COLOR.red}✗ Commit blocked: ${reason}${COLOR.reset}\n\n`);
  process.exit(1);
}

// ── main ───────────────────────────────────────────────────
async function main() {
  write(`\n  ${COLOR.bold}🐳 Dockerfile Verification${COLOR.reset}\n`);
  write(`  ${COLOR.dim}${"─".repeat(40)}${COLOR.reset}\n\n`);

  // step 1: scan
  const sp1 = createSpinner("Scanning packages...");
  const packagesWithoutDockerfile = await getPackagesWithoutDockerfile();

  if (packagesWithoutDockerfile.length === 0) {
    sp1.success("All packages have a Dockerfile");
    write("\n");
    return;
  }

  const names = packagesWithoutDockerfile.map((p) => p.name).join(", ");
  sp1.success(`${packagesWithoutDockerfile.length} package(s) without Dockerfile: ${COLOR.yellow}${names}${COLOR.reset}`);

  // step 2: detect CLIs
  write("\n");
  const sp2 = createSpinner("Looking for installed AI CLIs...");
  const availableClis = detectAvailableClis();

  if (availableClis.length === 0) {
    sp2.success(`No AI CLI found — generating default Dockerfiles`);
    write("\n");
    await generateDefaultDockerfiles(packagesWithoutDockerfile);
    execSync("git add packages/*/Dockerfile", { cwd: ROOT, stdio: "ignore" });
    write("\n");
    return;
  }

  const cliNamesStr = availableClis.map((c) => c.name).join(", ");
  sp2.success(`Available CLIs: ${COLOR.cyan}${cliNamesStr}${COLOR.reset}`);

  // step 3: ask user
  write("\n");
  const answer = await menuSelect(
    "🤖 Do you want to generate Dockerfiles with AI?",
    ["Yes, choose which AI to use", "No, generate default Dockerfile"]
  );

  if (answer === null || answer === 1) {
    write("\n");
    await generateDefaultDockerfiles(packagesWithoutDockerfile);
    execSync("git add packages/*/Dockerfile", { cwd: ROOT, stdio: "ignore" });
    write("\n");
    return;
  }

  // step 4: select CLI
  write("\n");
  const availableNames = availableClis.map((c) => c.name);
  const cliIndex = await menuSelect(
    "🧠 Which AI CLI do you want to use?",
    availableNames
  );

  if (cliIndex === null) {
    write("\n");
    await generateDefaultDockerfiles(packagesWithoutDockerfile);
    execSync("git add packages/*/Dockerfile", { cwd: ROOT, stdio: "ignore" });
    write("\n");
    return;
  }

  const chosenCli = availableClis[cliIndex];
  if (!chosenCli) {
    write("\n");
    await generateDefaultDockerfiles(packagesWithoutDockerfile);
    execSync("git add packages/*/Dockerfile", { cwd: ROOT, stdio: "ignore" });
    write("\n");
    return;
  }

  // step 5: generate Dockerfiles with AI
  write(`\n  ${COLOR.bold}Generating with ${chosenCli.name}${COLOR.reset}\n`);
  write(`  ${COLOR.dim}${"─".repeat(40)}${COLOR.reset}\n\n`);

  for (let i = 0; i < packagesWithoutDockerfile.length; i++) {
    const pkg = packagesWithoutDockerfile[i]!;
    const progress = `[${i + 1}/${packagesWithoutDockerfile.length}]`;

    const sp = createSpinner(`${progress} ${pkg.name} — sending prompt to ${chosenCli.name}...`);

    try {
      let bytesReceived = 0;

      const aiResponse = await executeAiCli(chosenCli, await buildPrompt(pkg), (chunk) => {
        bytesReceived += chunk.length;
        sp.update(`${progress} ${pkg.name} — receiving response (${bytesReceived} bytes)...`);
      });

      sp.update(`${progress} ${pkg.name} — saving Dockerfile...`);
      const dockerfile = cleanAiResponse(aiResponse);

      const dockerfilePath = join(pkg.directory, "Dockerfile");
      await writeFile(dockerfilePath, dockerfile, "utf-8");

      sp.success(`${progress} ${pkg.name} — Dockerfile created`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sp.error(`${progress} ${pkg.name} — ${msg}`);
    }
  }

  execSync("git add packages/*/Dockerfile", { cwd: ROOT, stdio: "ignore" });

  // final verification
  write("\n");
  const sp7 = createSpinner("Final verification...");
  const stillWithoutDockerfile = await checkAllPackagesHaveDockerfile();

  if (stillWithoutDockerfile.length > 0) {
    const missing = stillWithoutDockerfile.join(", ");
    sp7.error(`Packages still without Dockerfile: ${missing}`);
    blockCommit("Not all packages have a Dockerfile.");
  }

  sp7.success("All packages have a Dockerfile");
  write("\n");
}

main().catch((error) => {
  write(CURSOR.show);
  write(`\n  ${COLOR.red}[generate-dockerfiles-ai] error: ${error}${COLOR.reset}\n`);
  process.exit(1);
});
