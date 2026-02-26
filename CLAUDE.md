# Embark

Monorepo framework for shipping vibe-coded apps with zero-config CI/CD, Docker, and Cloud Run deployment.

## Project Principles

- **Code in English** — variable names, functions, comments
- **Mandatory tests for new scripts and functions** — minimum coverage 77%
- **No `types: any`** — only in extremely necessary cases
- **Everything with Bun** — scripts, installs, builds, tests

## Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript (strict mode, no `any`)
- **Workspaces:** Bun workspaces (`packages/*`)
- **CI/CD:** GitHub Actions + Docker + Google Cloud Run
- **Hooks:** Husky (pre-commit for automations)
- **Tests:** Bun test with coverage

## Structure

```
embark/
├── packages/                  # Each subfolder is an independent app
│   └── showcase/              # Showcase website
│
├── scripts/                   # Monorepo automations
│   ├── create-package.ts      # CLI to create a new package
│   ├── embark-config.ts       # Shared deploy config reader (.embark.json)
│   ├── ensure-deploy-config.ts # Interactive prompt for missing .embark.json
│   ├── generate-workflows.ts  # Generates GitHub Actions workflows per package
│   ├── generate-dockerfiles.ts # Generates default Dockerfiles
│   ├── generate-dockerfiles-ai.ts # CLI with AI for Dockerfiles
│   ├── cleanup-orphan-workflows.ts # Removes workflows for deleted packages
│   ├── sync-workflows.ts      # Syncs workflows with template
│   ├── update-readme-packages.ts # Updates packages table in README
│   └── __tests__/             # Script tests
│
├── templates/                 # Templates for auto generation
│   └── workflow.template.yml  # Base for GitHub Actions workflows
│
├── .github/workflows/         # Auto-generated workflows
│
├── .husky/pre-commit          # Hooks executed before each commit
│
├── bunfig.toml               # Bun config (coverage threshold)
├── tsconfig.json             # TypeScript config (strict)
└── package.json              # Root scripts
```

## Getting Started

### Install dependencies

```bash
bun install
```

### Run scripts for a specific package

```bash
bun run --filter @embark/showcase dev
bun run --filter @embark/showcase test
```

### Run root scripts

```bash
# Create new package (interactive)
bun run new-package

# Run automation script tests
bun run test

# Sync workflows with template
bun run sync-workflows
```

## Creating a New Package

### Option 1: Interactive script (recommended)

```bash
bun run new-package
```

The script will:
1. Ask for a name (accepts `camelCase` or `kebab-case`)
2. Ask for a description
3. Create the complete structure with:
   - `packages/<package>` folder
   - `src/index.ts` with placeholder
   - `package.json` with name `@embark/<package>`
   - `tsconfig.json` extending root
4. Auto-add to git

### Option 2: Manual

```bash
mkdir packages/my-app
cd packages/my-app
bun init
```

Configure `package.json`:

```json
{
  "name": "@embark/my-app",
  "description": "Package description",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "bun run src/index.ts",
    "test": "bun test"
  }
}
```

Configure `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Commit — the pre-commit hooks handle the rest:
- Generates `.github/workflows/my-app.yml`
- Generates `Dockerfile` (with AI or default)
- Updates `README.md`

## Adding New Automation Scripts

### Expected structure

Always in English, no `any`:

```typescript
// scripts/my-new-script.ts
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

async function executeScript(): Promise<void> {
  console.log("🔧 Executing my script...");
  // your code here
}

await executeScript();
```

### Mandatory tests

Create a corresponding test file:

```typescript
// scripts/__tests__/my-new-script.test.ts
import { describe, it, expect, beforeEach } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

describe("my new script", () => {
  const testDir = join(import.meta.dirname, "..temp");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should do something useful", async () => {
    expect(true).toBe(true);
  });
});
```

Run tests:

```bash
bun run test  # Test everything with coverage
bun test scripts/__tests__/my-new-script.test.ts  # Specific test
```

**Minimum coverage:** 77% (configured in `bunfig.toml`)

## Code Conventions

### Names and variables

```typescript
// ✅ English
const clientCount = 10;
function calculateAverage(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

### Explicit types

```typescript
// ✅ Clear types
const users: string[] = [];
const map: Map<string, number> = new Map();
function process(data: Record<string, unknown>): void {}

// ❌ No any
const users: any[] = [];
function process(data: any): void {}
```

### Imports and exports

```typescript
// ✅ Import exactly what you need
import { join } from "node:path";
import { calculateAverage } from "./utilities";
```

## Repository Rules

### Mandatory Dockerfile

Every package **must** have a `Dockerfile`. The pre-commit hook ensures this automatically.

### Existing files are not overwritten

If a package already has a `Dockerfile` or workflow, they are **not modified**. Manual customizations are preserved.

### Selective Deploy

Each workflow has a `paths` filter:

```yaml
on:
  push:
    paths:
      - "packages/showcase/**"  # only triggers if this folder changes
```

## Git Hooks (Husky)

On commit, these scripts run automatically in order:

### 1. `ensure-deploy-config.ts`

Scans `packages/` for any package missing `.embark.json`. Interactively asks the user to choose a deploy target (Cloud Run, Netlify, or Other).

### 2. `generate-workflows.ts`

Scans `packages/` and generates workflows for new packages in `.github/workflows/`, using the template `templates/workflow.template.yml`. Skips packages with external deploy targets (netlify/other).

### 3. `sync-workflows.ts`

Syncs existing workflows with the template. Offers options to overwrite all or review one by one.

### 4. `cleanup-orphan-workflows.ts`

Removes workflows whose packages have been deleted or switched to external deploy, and adds the removal to the commit automatically.

### 5. `generate-dockerfiles-ai.ts`

Identifies packages without `Dockerfile` and offers two options:
- **Yes** — choose an AI CLI, sends a prompt with the `package.json` and file structure, receives the Dockerfile
- **No** — generates a default Dockerfile based on `package.json` scripts

Skips packages with external deploy targets (netlify/other).

### 6. `update-readme-packages.ts`

Updates the packages table in `README.md` automatically when there are new packages or removals.

## TypeScript & Config

### tsconfig.json (root)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "module": "Preserve",
    "moduleResolution": "bundler"
  }
}
```

### bunfig.toml

```toml
[test]
coverageThreshold = 0.77
```

## Tests

### Run all tests with coverage

```bash
bun run test
```

### Available tests

- `create-package.test.ts` — package validation and creation
- `generate-workflows.test.ts` — workflow generation
- `generate-dockerfiles.test.ts` — Dockerfile generation
- `cleanup-orphan-workflows.test.ts` — orphan workflow cleanup
- `sync-workflows.test.ts` — workflow synchronization
- `update-readme-packages.test.ts` — README update

## Deploy & CI/CD

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_SA_KEY` | Service account JSON (deploy) |
| `GCP_REGION` | Cloud Run region (e.g. `us-central1`) |

### Deploy flow

```
git push main
  ↓
GitHub Actions detects which packages/ changed
  ↓
Build Docker image
  ↓
Push to Artifact Registry
  ↓
Deploy to Cloud Run
```

Only changed packages are deployed (thanks to `paths` filters).
