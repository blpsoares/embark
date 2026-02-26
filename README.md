# Embark

A monorepo framework for shipping **vibe-coded apps** with zero-config CI/CD, Docker, and Cloud Run deployment. Create a package, commit, push — it's deployed.

## Stack

- **Runtime:** [Bun](https://bun.sh)
- **Language:** TypeScript (strict mode)
- **Workspaces:** Bun workspaces (`packages/*`)
- **CI/CD:** GitHub Actions + Docker + Google Cloud Run
- **Hooks:** Husky (pre-commit & pre-push)

## Root Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `new-package` | `bun run new-package` | Interactively create a new package |
| `test` | `bun run test` | Run script tests with coverage |
| `sync-workflows` | `bun run sync-workflows` | Sync workflows with template |

## Structure

```
embark/
├── packages/                  # each folder is an independent app
│   └── showcase/              # showcase website
├── scripts/                   # monorepo automations
│   ├── create-package.ts      # interactive CLI to create packages
│   ├── generate-workflows.ts  # auto GitHub Actions per package
│   ├── generate-dockerfiles-ai.ts # AI-powered Dockerfile generation
│   ├── sync-workflows.ts      # sync workflows with template
│   ├── cleanup-orphan-workflows.ts # remove orphaned workflows
│   ├── update-readme-packages.ts # auto-update README table
│   └── __tests__/             # tests for all scripts
├── templates/
│   └── workflow.template.yml  # GitHub Actions base template
├── .github/workflows/         # auto-generated workflows (1 per package)
└── .husky/                    # git hooks
```

## Getting Started

```bash
# install dependencies
bun install

# run a script for a specific package
bun run --filter @embark/showcase dev

# create a new package (interactive)
bun run new-package
```

## Creating a New Package

The easiest way is the interactive script:

```bash
bun run new-package
```

The script will:
1. Ask for a name (accepts camelCase or kebab-case)
2. Ask for a description
3. Create the complete structure:
   - `packages/<name>/` directory
   - `src/index.ts` with placeholder
   - `package.json` scoped as `@embark/<name>`
   - `tsconfig.json` extending root
4. Auto-add to git

Then just commit — the pre-commit hooks handle the rest:
- Generates `.github/workflows/<name>.yml`
- Generates `Dockerfile` (with AI or default)
- Updates the packages table in this README

## Repository Rules

### Mandatory Dockerfile

Every package **must** have a `Dockerfile`. The pre-commit hook enforces this automatically.

### Existing files are not overwritten

If a package already has a `Dockerfile` or workflow, the generation scripts **won't modify them**. Manual customizations are preserved.

### Selective Deploy

Each package has its own workflow with `paths` filter. When you push to `main`:
- Changed `packages/showcase/**` → only showcase deploys
- Changed multiple packages → only those deploy

## Pre-commit Hooks

On `git commit`, Husky runs these scripts in order:

1. **`generate-workflows.ts`** — Generates workflows for new packages
2. **`sync-workflows.ts`** — Syncs existing workflows with template
3. **`cleanup-orphan-workflows.ts`** — Removes workflows for deleted packages
4. **`generate-dockerfiles-ai.ts`** — Generates Dockerfiles (AI or default) for packages missing them
5. **`update-readme-packages.ts`** — Updates the packages table below

## Pre-push Hooks

On `git push`, tests run automatically. Push is blocked if tests fail.

## Tests

```bash
# run all tests with coverage
bun run test

# run a specific test
bun test scripts/__tests__/create-package.test.ts
```

Coverage threshold: **77%** (configured in `bunfig.toml`)

## Deploy

Each package is deployed separately to **Google Cloud Run** via GitHub Actions.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GCP_SA_KEY` | Service account JSON (deploy permissions) |
| `GCP_REGION` | Cloud Run region (e.g. `us-central1`) |

### Deploy Flow

```
commit → push to main
  → GitHub Actions detects which packages/ changed
    → Build Docker image
      → Push to Artifact Registry
        → Deploy to Cloud Run
```

## Packages

<!-- PACKAGES:START -->
| Package | Description |
|---------|-------------|
| `showcase` | Embark showcase website — ship vibe-coded apps with zero-config CI/CD |
<!-- PACKAGES:END -->
