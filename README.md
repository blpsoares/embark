<p align="center">
  <img src=".github/logo.png" alt="Embark" width="300" />
</p>

<p align="center">
  Ship <strong>vibe-coded apps</strong> with zero-config CI/CD, Docker, and Cloud Run, Netlify or another of your choice deployment.
</p>


<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-818cf8?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Bun-1.3.9-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tests-117%20passing-brightgreen?style=for-the-badge" alt="Tests pass" />
  <img src="https://img.shields.io/badge/coverage-77%25-yellow?style=for-the-badge" alt="Coverage" />
</p>
---

## What is Embark?

A monorepo framework that automates everything between **code** and **production**. Create a package, commit, push — it's deployed. Each package in the monorepo is published individually: a push only deploys new or changed packages, not everything.

### Key Concepts

- **One push ≠ deploy everything** — Only packages with actual changes are built and deployed. The rest stay untouched.
- **Each package = its own pipeline** — Every package gets a dedicated GitHub Actions workflow with path filters.
- **Choose your infra** — Cloud Run with auto-generated Docker + CI/CD, Netlify with just a config file, or bring your own. Per package.
- **Zero config** — Workflows, Dockerfiles, and README are auto-generated on commit. You just write code.
- **AI-Powered setup** — Connect your favorite AI (Claude, Gemini, Copilot) to auto-generate Dockerfiles tailored to your stack.
- **Embed anywhere** — Deploy frontend packages to Netlify or static hosts and embed them via `<iframe>` in any system, site, or dashboard.
- **Dev + AI teamwork** — Code with your team while AI handles boilerplate, tests, and deployment pipelines. Stay in control.

## Stack

| Tool | Role |
|------|------|
| [Bun](https://bun.sh) | Runtime, bundler, test runner, package manager |
| TypeScript | Strict mode, no `any` |
| GitHub Actions | Auto-generated CI/CD per package |
| Docker | Auto-generated Dockerfiles (AI or default) |
| Cloud Run | Serverless container deploy |
| Netlify | Static/JAMstack deploy (no Docker needed) |
| Husky | Git hooks (pre-commit & pre-push) |

## Getting Started

```bash
# clone & install
git clone https://github.com/blpsoares/embark.git
cd embark
bun install

# create a new package (interactive)
bun run new-package

# commit — automations run automatically
git add . && git commit -m "feat: my new app"

# push — only changed packages deploy
git push origin main
```

## Creating a New Package

```bash
bun run new-package
```

The CLI will:
1. Ask for a **name** (camelCase or kebab-case)
2. Ask for a **description**
3. Ask for a **deploy target** (Cloud Run or Netlify)
4. Create the complete structure:
   - `packages/<name>/` with `src/index.ts`, `package.json`, `tsconfig.json`
   - `.embark.json` with deploy config
   - `netlify.toml` (if Netlify was chosen)
5. Auto-add to git

Then just commit — pre-commit hooks handle workflows, Dockerfiles, and README.

## Deploy Targets

### Cloud Run (default)

Auto-generates a GitHub Actions workflow and Dockerfile. On push, builds a Docker image and deploys to Cloud Run.

```json
// .embark.json
{ "deploy": "cloud-run" }
```

### Netlify

No workflow, no Dockerfile. Just a `netlify.toml`. Connect the repo on Netlify and every push auto-deploys.

```json
// .embark.json
{ "deploy": "netlify" }
```

### Other (custom)

For packages deployed elsewhere (Vercel, Fly.io, AWS, etc.). No workflow, no Dockerfile — you manage your own pipeline.

```json
// .embark.json
{ "deploy": "other" }
```

You can **mix all three** in the same monorepo — APIs on Cloud Run, frontends on Netlify, custom infra elsewhere.

## Pre-commit Hooks

On `git commit`, these scripts run automatically:

| Order | Script | What it does |
|-------|--------|-------------|
| 1 | `ensure-deploy-config.ts` | Asks deploy target for packages missing `.embark.json` |
| 2 | `generate-workflows.ts` | Creates GitHub Actions workflow for new packages |
| 3 | `sync-workflows.ts` | Syncs existing workflows with template |
| 4 | `cleanup-orphan-workflows.ts` | Removes workflows for deleted/external packages |
| 5 | `generate-dockerfiles-ai.ts` | Generates Dockerfiles (AI or default) |
| 6 | `update-readme-packages.ts` | Updates the packages table below |
| 7 | `update-version-badge.ts` | Syncs version badge in README |

## Pre-push Hooks

On `git push`, the full test suite runs. Push is blocked if tests fail.

## Structure

```
embark/
├── packages/                  # each folder is an independent app
│   └── showcase/              # showcase website
├── scripts/                   # monorepo automations
│   ├── create-package.ts      # interactive CLI to create packages
│   ├── embark-config.ts       # shared deploy config reader
│   ├── ensure-deploy-config.ts # interactive prompt for missing .embark.json
│   ├── generate-workflows.ts  # auto GitHub Actions per package
│   ├── generate-dockerfiles.ts # default Dockerfile generation
│   ├── generate-dockerfiles-ai.ts # AI-powered Dockerfile generation
│   ├── sync-workflows.ts      # sync workflows with template
│   ├── cleanup-orphan-workflows.ts # remove orphaned workflows
│   ├── update-readme-packages.ts   # auto-update README table
│   ├── update-version-badge.ts     # sync version badge
│   └── __tests__/             # tests for all scripts
├── templates/
│   └── workflow.template.yml  # GitHub Actions base template
├── .github/workflows/         # auto-generated workflows (1 per package)
└── .husky/                    # git hooks
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `new-package` | `bun run new-package` | Interactively create a new package |
| `test` | `bun run test` | Run script tests with coverage |
| `sync-workflows` | `bun run sync-workflows` | Sync workflows with template |

## Tests

```bash
# run all tests with coverage
bun run test

# run a specific test
bun test scripts/__tests__/create-package.test.ts
```

Coverage threshold: **77%** (configured in `bunfig.toml`)

## Deploy (Cloud Run)

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
    → Build Docker image (only for changed packages)
      → Push to Artifact Registry
        → Deploy to Cloud Run
```

**Unchanged packages are never rebuilt or redeployed.**

## Packages

<!-- PACKAGES:START -->
| Package | Description |
|---------|-------------|
| `showcase` | Embark showcase website — ship vibe-coded apps with zero-config CI/CD |
<!-- PACKAGES:END -->

---

<p align="center">
  <img src=".github/logo.png" alt="Embark" width="64" style="display:block;margin:0.5rem auto 0.5rem;" />
  Made with vibes by <a href="https://github.com/blpsoares">@blpsoares</a>
</p>
