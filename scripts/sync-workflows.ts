import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");
const TEMPLATE_PATH = join(ROOT, "templates", "workflow.template.yml");
const PLACEHOLDER = "__PACKAGE_NAME__";
const PLACEHOLDER_LOWERCASE = "__PACKAGE_NAME_LOWERCASE__";

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  inverse: "\x1b[7m",
  bold: "\x1b[1m",
};

// ANSI cursor control
const cursor = {
  hide: "\x1b[?25l",
  show: "\x1b[?25h",
  clearLine: "\x1b[2K\r",
  moveUp: "\x1b[1A",
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function generateExpectedContent(template: string, packageName: string): string {
  return template
    .replaceAll(PLACEHOLDER, packageName)
    .replaceAll(PLACEHOLDER_LOWERCASE, packageName.toLowerCase());
}

function wasCustomized(currentContent: string, expectedContent: string): boolean {
  return currentContent !== expectedContent;
}

async function getWorkflowNames(workflowsDir: string): Promise<string[]> {
  if (!(await exists(workflowsDir))) {
    return [];
  }

  const entries = await readdir(workflowsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".yml"))
    .map((e) => e.name.replace(".yml", ""));
}

function displayDiff(currentContent: string, expectedContent: string): void {
  const currentLines = currentContent.split("\n");
  const expectedLines = expectedContent.split("\n");

  console.log(`\n${colors.gray}─ Differences:${colors.reset}\n`);

  let currentIdx = 0;
  let expectedIdx = 0;

  while (currentIdx < currentLines.length || expectedIdx < expectedLines.length) {
    const current = currentLines[currentIdx];
    const expected = expectedLines[expectedIdx];

    if (current === expected) {
      currentIdx++;
      expectedIdx++;
    } else if (!expected || (current && !expectedLines.slice(expectedIdx).includes(current))) {
      // Removed line
      if (current) {
        console.log(`${colors.red}─ ${current}${colors.reset}`);
      }
      currentIdx++;
    } else {
      // Added line
      if (expected) {
        console.log(`${colors.green}+ ${expected}${colors.reset}`);
      }
      expectedIdx++;
    }
  }

  console.log(`\n${colors.gray}─────────────────${colors.reset}\n`);
}

// Interactive menu function with arrow navigation (not covered by tests as it requires real stdin)
async function selectOption(options: string[], title: string, clearScreen: boolean = true): Promise<number> {
  const totalLines = options.length + 3;
  const stdin = process.stdin;
  const isTTY = stdin.isTTY;

  if (isTTY) {
    stdin.setRawMode(true);
  }

  process.stdout.write(cursor.hide);

  const write = (text: string) => {
    process.stdout.write(text);
  };

  const render = (index: number) => {
    // Clear previous lines
    for (let i = 0; i < totalLines; i++) {
      write(cursor.moveUp + cursor.clearLine);
    }

    write(`  ${colors.blue}${title}${colors.reset}\n`);
    write(`  ${colors.gray}↑/↓ navigate  │  Enter select  │  q cancel${colors.reset}\n`);
    write(`\n`);

    for (let i = 0; i < options.length; i++) {
      if (i === index) {
        write(`  ${colors.green}${colors.bold}❯ ${options[i]}${colors.reset}\n`);
      } else {
        write(`  ${colors.gray}  ${options[i]}${colors.reset}\n`);
      }
    }
  };

  return new Promise((resolve, reject) => {
    let selected = 0;

    // Show initial menu
    write(`  ${colors.blue}${title}${colors.reset}\n`);
    write(`  ${colors.gray}↑/↓ navigate  │  Enter select  │  q cancel${colors.reset}\n`);
    write(`\n`);

    for (let i = 0; i < options.length; i++) {
      if (i === selected) {
        write(`  ${colors.green}${colors.bold}❯ ${options[i]}${colors.reset}\n`);
      } else {
        write(`  ${colors.gray}  ${options[i]}${colors.reset}\n`);
      }
    }

    const cleanup = () => {
      stdin.removeListener("data", onData);
      write(cursor.show);
      if (isTTY) {
        try {
          stdin.setRawMode(false);
        } catch {
          // Ignore errors when restoring raw mode
        }
      }
    };

    const onData = (buffer: Buffer) => {
      const key = buffer.toString();

      if (key === "\x1b[A" || key === "k" || key === "w") {
        // Arrow up
        selected = (selected - 1 + options.length) % options.length;
        render(selected);
      } else if (key === "\x1b[B" || key === "j" || key === "s") {
        // Arrow down
        selected = (selected + 1) % options.length;
        render(selected);
      } else if (key === "\r" || key === "\n") {
        // Enter
        cleanup();
        resolve(selected);
      } else if (key === "q" || key === "\x03") {
        // Q or Ctrl+C
        cleanup();
        reject(new Error("Operation cancelled by user"));
      }
    };

    stdin.on("data", onData);
  });
}

export async function syncWorkflows(
  workflowsDir: string = WORKFLOWS_DIR,
  templatePath: string = TEMPLATE_PATH,
  acceptAll?: boolean,
): Promise<{ updated: number; skipped: number }> {
  if (!(await exists(templatePath))) {
    console.log(`${colors.red}[sync-workflows] template not found${colors.reset}`);
    return { updated: 0, skipped: 0 };
  }

  const template = await readFile(templatePath, "utf-8");
  const workflows = await getWorkflowNames(workflowsDir);

  let updated = 0;
  let skipped = 0;
  const customized: string[] = [];

  // First pass: detect customizations
  for (const workflow of workflows) {
    const workflowPath = join(workflowsDir, `${workflow}.yml`);
    const currentContent = await readFile(workflowPath, "utf-8");
    const expectedContent = generateExpectedContent(template, workflow);

    if (wasCustomized(currentContent, expectedContent)) {
      customized.push(workflow);
    }
  }

  // If no customizations, all good
  if (customized.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  // If acceptAll was passed explicitly, use it directly
  let mode: "all" | "one_by_one" = "one_by_one";

  if (acceptAll !== undefined) {
    mode = acceptAll ? "all" : "one_by_one";
  } else {
    // Ask the user which mode to use
    const modeIndex = await selectOption(
      ["Overwrite all", "Overwrite one by one"],
      "Customized workflows found",
    );
    mode = modeIndex === 0 ? "all" : "one_by_one";
  }

  // If chose "overwrite one by one", show list of customized
  if (mode === "one_by_one") {
    console.log(
      `${colors.yellow}⚠️  ${customized.length} customized workflow(s):${colors.reset}`,
    );
    customized.forEach((w) => {
      console.log(`  ${colors.gray}→${colors.reset} ${w}.yml`);
    });
    console.log("");
  }

  // Second pass: update
  for (const workflow of workflows) {
    const workflowPath = join(workflowsDir, `${workflow}.yml`);
    const currentContent = await readFile(workflowPath, "utf-8");
    const expectedContent = generateExpectedContent(template, workflow);

    if (wasCustomized(currentContent, expectedContent)) {
      let approve = mode === "all";

      if (mode === "one_by_one") {
        console.log(`\n${colors.blue}📄 ${workflow}.yml${colors.reset}`);
        displayDiff(currentContent, expectedContent);

        const index = await selectOption(
          [`${colors.green}✓ Approve${colors.reset}`, `${colors.red}✗ Reject${colors.reset}`],
          `Overwrite ${colors.blue}${workflow}.yml${colors.reset}?`,
          false, // Don't clear screen to preserve the diff
        );
        approve = index === 0;
      }

      if (approve) {
        await writeFile(workflowPath, expectedContent, "utf-8");
        console.log(`${colors.green}✅ ${workflow}.yml updated${colors.reset}`);
        updated++;
      } else {
        console.log(`${colors.gray}⏭️  ${workflow}.yml skipped${colors.reset}`);
        skipped++;
      }
    }
  }

  if (updated > 0) {
    execSync("git add .github/workflows/", { cwd: ROOT, stdio: "inherit" });
  }

  return { updated, skipped };
}

async function main() {
  const acceptAll = process.argv.includes("--accept-all");
  const acceptAllExplicit = acceptAll ? true : undefined;

  console.log(`\n${colors.blue}🔄 Syncing workflows with template...${colors.reset}\n`);

  const { updated, skipped } = await syncWorkflows(
    WORKFLOWS_DIR,
    TEMPLATE_PATH,
    acceptAllExplicit,
  );

  console.log("");

  if (updated === 0 && skipped === 0) {
    console.log(
      `${colors.green}✨ All workflows are in sync with the template${colors.reset}`,
    );
  } else {
    if (updated > 0) {
      console.log(`${colors.green}[sync-workflows] ${updated} updated${colors.reset}`);
    }
    if (skipped > 0) {
      console.log(`${colors.gray}[sync-workflows] ${skipped} skipped${colors.reset}`);
    }
  }

  console.log("");

  // Close stdin and clean up resources
  const stdin = process.stdin;
  if (stdin.isTTY) {
    try {
      stdin.setRawMode(false);
    } catch {
      // Ignore errors
    }
  }
  stdin.removeAllListeners();
  stdin.pause();
}

if (import.meta.main) {
  main().catch((error) => {
    // Restore terminal in case of error
    const stdin = process.stdin;
    if (stdin.isTTY) {
      try {
        stdin.setRawMode(false);
      } catch {
        // Ignore errors when restoring
      }
    }
    stdin.removeAllListeners();
    stdin.pause();

    console.error("[sync-workflows] error:", error.message);
    process.exit(1);
  });
}

export { generateExpectedContent, wasCustomized, getWorkflowNames };
