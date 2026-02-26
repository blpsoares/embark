import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import * as readline from "node:readline";

const ROOT = join(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT, "packages");

function validateCamelCase(name: string): boolean {
  // Accepts camelCase and kebab-case, then converts to camelCase if needed
  return /^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$/.test(name);
}

function convertToCamelCase(name: string): string {
  return name
    .split("-")
    .map((part, idx) =>
      idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

async function getInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createPackage() {
  console.log("📦 Package Creator - embark\n");

  // Ask for project name
  let projectName = "";
  while (!projectName || !validateCamelCase(projectName)) {
    projectName = await getInput("📝 Project name (camelCase or kebab-case): ");

    if (!projectName || !validateCamelCase(projectName)) {
      console.log(
        "❌ Invalid name. Use only letters, numbers, and hyphens (e.g. my-package)\n",
      );
    }
  }

  const camelCaseName = convertToCamelCase(projectName);

  // Ask for description
  const description = await getInput("\n📄 Project description: ");

  if (!description) {
    console.log("❌ Description is required\n");
    process.exit(1);
  }

  // Create package directory
  const packageDir = join(PACKAGES_DIR, camelCaseName);
  const srcDir = join(packageDir, "src");

  console.log(`\n🚀 Creating package: ${camelCaseName}`);

  try {
    // Create directories
    await mkdir(packageDir, { recursive: true });
    await mkdir(srcDir, { recursive: true });
    console.log(`  ✓ Created directory: packages/${camelCaseName}`);

    // Create tsconfig.json
    const tsconfig = {
      extends: "../../tsconfig.json",
      compilerOptions: {
        composite: true,
        outDir: "./dist",
      },
      include: ["src/**/*"],
    };

    await writeFile(join(packageDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n");
    console.log(`  ✓ Created: tsconfig.json`);

    // Create package.json
    const packageJson = {
      name: `@embark/${camelCaseName}`,
      description,
      version: "0.0.1",
      private: true,
      type: "module",
    };

    await writeFile(
      join(packageDir, "package.json"),
      JSON.stringify(packageJson, null, 2) + "\n",
    );
    console.log(`  ✓ Created: package.json`);

    // Create src/index.ts
    const indexTs = `// ${camelCaseName}\n\nexport function hello(): string {\n  return "Hello from ${camelCaseName}";\n}\n`;

    await writeFile(join(srcDir, "index.ts"), indexTs);
    console.log(`  ✓ Created: src/index.ts`);

    // Git add
    try {
      execSync(`git add packages/${camelCaseName}/`, { cwd: ROOT, stdio: "inherit" });
    } catch {
      console.log(
        `  ⚠ Warning: Could not add to git automatically`,
      );
    }

    console.log(`\n✅ Package created successfully!\n`);
    console.log(`Next steps:`);
    console.log(`  1. Edit packages/${camelCaseName}/src/index.ts`);
    console.log(`  2. Run: bun install`);
    console.log(`  3. Commit your changes\n`);
  } catch (error) {
    console.error(`\n❌ Error creating package:`, error);
    process.exit(1);
  }
}

if (import.meta.main) {
  createPackage().catch((error) => {
    console.error("[create-package] error:", error);
    process.exit(1);
  });
}
