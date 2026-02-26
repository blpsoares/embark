# Fluxo de comandos e commits

Este arquivo lista os comandos que você pode executar localmente, com mensagens de commit "bonitinhas" (semânticas) para cada passo. Use conforme necessário.

## 1) Preparar trabalhos locais

- Atualizar branch local e criar branch de trabalho:

```bash
git checkout -b feat/add-embark-config-showcase
git pull origin dev
```

- Rodar os testes rápidos/local (ajuste conforme seu runner):

```bash
bun run test
```

## 2) Rodar prompts interativos antes do commit

Esses comandos abrem prompts interativos para `ensure-deploy-config` e geração de Dockerfile (AI ou default).

```bash
# Pergunta deploy target (interativo)
bun run scripts/ensure-deploy-config.ts

# Gera Dockerfiles (vai mostrar menu; fallback numérico quando raw-mode não estiver disponível)
bun run scripts/generate-dockerfiles-ai.ts
```

Resposta esperada nos prompts:
- Escolha o `deploy target` para cada pacote (use setas ou número).
- Quando o target for `netlify` ou `other`, confirme se deseja gerar Dockerfile.
- Se escolher geração com AI, escolha a CLI desejada.

## 3) Commitar mudanças (mensagens sugeridas)

- Commit para adicionar `.embark.json` e `netlify.toml` (se aplicável):

```bash
git add packages/*/.embark.json packages/*/netlify.toml
git commit -m "feat(deploy): add .embark.json and netlify.toml for <package>"
```

- Commit para adicionar Dockerfile(s) gerados (AI ou default):

```bash
git add packages/*/Dockerfile
git commit -m "chore(docker): add Dockerfile for <package> (generated)"
```

- Se você alterou o `README.md` manualmente (por exemplo atualizar badge):

```bash
git add README.md
git commit -m "docs(readme): update version badge to vX.Y.Z"
```

- Commit genérico para misc changes:

```bash
git add -A
git commit -m "chore: apply local fixes and config"
```

Observação: substitua `<package>` pelo nome do pacote alvo, e `vX.Y.Z` pela versão se aplicável.

## 4) Push e abrir PR

```bash
git push --set-upstream origin feat/add-embark-config-showcase
# abra o PR pela interface do GitHub e siga seu fluxo normal (review + merge)
```

## 5) Após merge para `main`

- Se configurarmos workflow para rodar no `pull_request` closed/merged, ele pode:
  - Fazer o bump da versão (`package.json`) automaticamente e commitar/pusar;
  - Atualizar o badge no `README.md` com a nova versão.

Se preferir que a Action faça o bump automaticamente (commit direto para `main`) você precisa permitir que Actions escrevam em `main` nas regras de proteção de branch, ou usar a estratégia de abrir um PR de release (recomendado quando a branch é protegida).

## 6) Comandos úteis adicionais

- Ver status do repositório:

```bash
git status --short
```

- Visualizar diffs antes do commit:

```bash
git add -p
```

- Criar commit com mensagem guiada (conventional):

```bash
# exemplo manual
git commit -m "fix(showcase): correct carousel momentum handling"
```

## 7) Mensagens de commit sugeridas (resumo)

- `feat(...)`: nova funcionalidade (ex: `feat(showcase): add continuous carousel`)
- `fix(...)`: correção (ex: `fix(carousel): prevent jump at high speed`)
- `chore(...)`: manutenções e scripts (ex: `chore(docker): add default Dockerfile`)
- `docs(...)`: documentação e README (ex: `docs(readme): update version badge`)

---

Se quiser, eu posso:
- Gerar um `release` script (por exemplo `scripts/release.sh`) que automatize alguns desses passos;
- Criar a Action que abre um PR de release em vez de commitar direto para `main` (mais compatível com branch protected);
- Gerar exemplos de mensagens `semantic-release`/`conventional-commits`.

Me diga se quer que eu adicione o `release.sh` ou que gere o workflow de PR de release.