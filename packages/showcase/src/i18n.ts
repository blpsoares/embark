type Language = "en" | "pt";

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Hero
    "hero.tagline": "Ship vibe-coded apps with zero config.",
    "hero.sub": "Auto CI/CD &middot; Auto Docker &middot; AI-powered &middot; Cloud Run ready",
    "hero.cta": "Get Started",
    "hero.scroll": "Scroll to explore",

    // Use Cases
    "useCases.title": "Perfect For",
    "useCases.subtitle": 'Embark removes the gap between "it works on my machine" and "it\'s live in production".',
    "useCases.side.title": "Side Projects",
    "useCases.side.desc": "You want to ship your weekend idea, not spend Saturday writing YAML. Clone, code, push — it's live.",
    "useCases.hack.title": "Hackathons",
    "useCases.hack.desc": "48 hours to build and demo. Embark gives you CI/CD, Docker, and deploy from minute zero. Focus on the product.",
    "useCases.micro.title": "Microservices",
    "useCases.micro.desc": "Each package deploys independently with its own workflow. Add a service, delete a service — the monorepo adapts.",
    "useCases.proto.title": "Rapid Prototyping",
    "useCases.proto.desc": "Spin up 5 different API ideas in one repo. Each gets its own pipeline. Kill the ones that don't work, ship the ones that do.",
    "useCases.team.title": "Small Teams",
    "useCases.team.desc": "No DevOps engineer? No problem. Embark enforces quality, generates infra, and keeps your repo clean automatically.",
    "useCases.learn.title": "Learning DevOps",
    "useCases.learn.desc": "See real CI/CD, Docker, and deploy configs generated in front of you. Learn by reading what Embark creates.",

    // Why Embark
    "why.title": "Why Embark?",
    "why.subtitle": "Stop configuring. Start shipping. Embark handles the boring stuff so you can focus on building.",
    "why.stat1.label": "Lines of CI/CD config",
    "why.stat1.detail": "Workflows are auto-generated",
    "why.stat2.label": "% test coverage enforced",
    "why.stat2.detail": "Pre-push hooks guarantee quality",
    "why.stat3.label": "Pre-commit automations",
    "why.stat3.detail": "Everything runs before you even push",
    "why.stat4.label": "AI CLIs supported",
    "why.stat4.detail": "Gemini, Claude, Copilot, Codex",

    // How It Works
    "how.title": "How It Works",
    "how.subtitle": "Three commands. That's it. From zero to deployed.",

    // What Happens on Commit
    "commit.title": "What Happens on Commit",
    "commit.subtitle": "Every <code>git commit</code> triggers a pipeline of automations. No config required.",
    "commit.step1.title": "Generate Workflows",
    "commit.step1.desc": "Scans <code>packages/</code> and creates a GitHub Actions workflow for each new package using the template.",
    "commit.step2.title": "Sync Workflows",
    "commit.step2.desc": "Compares existing workflows with the template. If the template changed, offers to update them interactively.",
    "commit.step3.title": "Cleanup Orphans",
    "commit.step3.desc": "Detects workflows for deleted packages and removes them automatically. No zombie workflows.",
    "commit.step4.title": "Generate Dockerfiles",
    "commit.step4.desc": "Finds packages without Dockerfiles. Choose AI generation (Gemini, Claude, Copilot, Codex) or smart defaults.",
    "commit.step5.title": "Update README",
    "commit.step5.desc": "Auto-updates the packages table in README.md. New packages appear, deleted ones disappear.",

    // Features
    "features.title": "Features",
    "features.subtitle": "Everything you need to ship fast, nothing you don't.",
    "features.bun.title": "Bun All The Way",
    "features.bun.desc": "One runtime for everything — scripts, tests, builds, package management. No Node, no npm, no webpack. Just Bun.",
    "features.ai.title": "AI-Assisted Setup",
    "features.ai.desc": "Plug in your favorite AI CLI — Gemini, Claude, Copilot, or Codex — and get Dockerfiles tailored to your app's stack.",
    "features.deploy.title": "Selective Deploy",
    "features.deploy.desc": "Change one package, deploy one package. Path-filtered CI/CD means no wasted builds, no unnecessary downtime.",
    "features.quality.title": "Quality Gates",
    "features.quality.desc": "Pre-push hooks enforce 77% coverage. You can't ship broken code — the framework literally won't let you.",
    "features.scaffold.title": "Instant Scaffolding",
    "features.scaffold.desc": "One command, two questions, done. The CLI creates the full package structure with config, types, and entrypoint.",

    // Architecture
    "arch.title": "Architecture",
    "arch.subtitle": "A clean, opinionated structure. Every file has a purpose.",

    // Get Started
    "start.title": "Get Started",
    "start.subtitle": "Up and running in under a minute.",
    "start.step1.title": "Clone & Install",
    "start.step1.desc": "Clone the repo and install dependencies with Bun. That's it — no global tools, no config files.",
    "start.step2.title": "Create a Package",
    "start.step2.desc": "Run the interactive CLI. Give it a name and description — the full structure is scaffolded for you.",
    "start.step3.title": "Build Your App",
    "start.step3.desc": "Write your code in <code>packages/my-app/src/</code>. Use any framework — Vite, vanilla, React, whatever you want.",
    "start.step4.title": "Commit & Deploy",
    "start.step4.desc": "Commit your code. Pre-commit hooks auto-generate workflows, Dockerfiles, and update the README. Push to deploy.",

    // Footer
    "footer.tagline": "Ship vibe-coded apps with zero config.",
    "footer.project": "Project",
    "footer.community": "Community",
    "footer.star": "Star on GitHub",
    "footer.built": "Built with Embark, naturally. &copy; 2026",
    "footer.made": 'Made with vibes by <a href="https://github.com/blpsoares" target="_blank" rel="noopener">blpsoares</a>',
  },

  pt: {
    // Hero
    "hero.tagline": "Publique apps vibe-coded com zero config.",
    "hero.sub": "CI/CD auto &middot; Docker auto &middot; IA integrada &middot; Cloud Run pronto",
    "hero.cta": "Começar",
    "hero.scroll": "Role para explorar",

    // Use Cases
    "useCases.title": "Ideal Para",
    "useCases.subtitle": 'Embark elimina a distância entre "funciona na minha máquina" e "está em produção".',
    "useCases.side.title": "Projetos Pessoais",
    "useCases.side.desc": "Você quer publicar sua ideia de fim de semana, não gastar o sábado escrevendo YAML. Clone, code, push — está no ar.",
    "useCases.hack.title": "Hackathons",
    "useCases.hack.desc": "48 horas pra construir e apresentar. Embark te dá CI/CD, Docker e deploy desde o minuto zero. Foque no produto.",
    "useCases.micro.title": "Microsserviços",
    "useCases.micro.desc": "Cada pacote faz deploy independente com seu próprio workflow. Adicione ou remova serviços — o monorepo se adapta.",
    "useCases.proto.title": "Prototipagem Rápida",
    "useCases.proto.desc": "Crie 5 ideias de API diferentes no mesmo repo. Cada uma com seu pipeline. Mate as que não funcionam, publique as que funcionam.",
    "useCases.team.title": "Times Pequenos",
    "useCases.team.desc": "Sem engenheiro DevOps? Sem problema. Embark garante qualidade, gera infra e mantém o repo limpo automaticamente.",
    "useCases.learn.title": "Aprender DevOps",
    "useCases.learn.desc": "Veja configs reais de CI/CD, Docker e deploy sendo geradas na sua frente. Aprenda lendo o que o Embark cria.",

    // Why Embark
    "why.title": "Por que Embark?",
    "why.subtitle": "Pare de configurar. Comece a publicar. Embark cuida da parte chata pra você focar em construir.",
    "why.stat1.label": "Linhas de config CI/CD",
    "why.stat1.detail": "Workflows são auto-gerados",
    "why.stat2.label": "% de cobertura exigida",
    "why.stat2.detail": "Hooks de pre-push garantem qualidade",
    "why.stat3.label": "Automações no pre-commit",
    "why.stat3.detail": "Tudo roda antes de você dar push",
    "why.stat4.label": "CLIs de IA suportadas",
    "why.stat4.detail": "Gemini, Claude, Copilot, Codex",

    // How It Works
    "how.title": "Como Funciona",
    "how.subtitle": "Três comandos. Só isso. Do zero ao deploy.",

    // What Happens on Commit
    "commit.title": "O Que Acontece no Commit",
    "commit.subtitle": "Cada <code>git commit</code> dispara um pipeline de automações. Nenhuma config necessária.",
    "commit.step1.title": "Gerar Workflows",
    "commit.step1.desc": "Escaneia <code>packages/</code> e cria um workflow do GitHub Actions para cada novo pacote usando o template.",
    "commit.step2.title": "Sincronizar Workflows",
    "commit.step2.desc": "Compara workflows existentes com o template. Se o template mudou, oferece atualização interativa.",
    "commit.step3.title": "Limpar Órfãos",
    "commit.step3.desc": "Detecta workflows de pacotes deletados e remove automaticamente. Sem workflows zumbis.",
    "commit.step4.title": "Gerar Dockerfiles",
    "commit.step4.desc": "Encontra pacotes sem Dockerfile. Escolha geração com IA (Gemini, Claude, Copilot, Codex) ou defaults inteligentes.",
    "commit.step5.title": "Atualizar README",
    "commit.step5.desc": "Atualiza automaticamente a tabela de pacotes no README.md. Novos aparecem, deletados somem.",

    // Features
    "features.title": "Funcionalidades",
    "features.subtitle": "Tudo que você precisa pra publicar rápido, nada que não precisa.",
    "features.bun.title": "100% Bun",
    "features.bun.desc": "Um runtime pra tudo — scripts, testes, builds, gerenciamento de pacotes. Sem Node, sem npm, sem webpack. Só Bun.",
    "features.ai.title": "Setup com IA",
    "features.ai.desc": "Conecte sua CLI de IA favorita — Gemini, Claude, Copilot ou Codex — e receba Dockerfiles sob medida pro seu app.",
    "features.deploy.title": "Deploy Seletivo",
    "features.deploy.desc": "Mude um pacote, faça deploy de um pacote. CI/CD com filtro de path significa zero builds desperdiçados.",
    "features.quality.title": "Portões de Qualidade",
    "features.quality.desc": "Hooks de pre-push exigem 77% de cobertura. Você não consegue publicar código quebrado — o framework não deixa.",
    "features.scaffold.title": "Scaffolding Instantâneo",
    "features.scaffold.desc": "Um comando, duas perguntas, pronto. A CLI cria a estrutura completa do pacote com config, tipos e entrypoint.",

    // Architecture
    "arch.title": "Arquitetura",
    "arch.subtitle": "Uma estrutura limpa e opinada. Cada arquivo tem um propósito.",

    // Get Started
    "start.title": "Começar",
    "start.subtitle": "Funcionando em menos de um minuto.",
    "start.step1.title": "Clonar e Instalar",
    "start.step1.desc": "Clone o repo e instale as dependências com Bun. Só isso — sem ferramentas globais, sem arquivos de config.",
    "start.step2.title": "Criar um Pacote",
    "start.step2.desc": "Execute a CLI interativa. Dê um nome e descrição — a estrutura completa é criada pra você.",
    "start.step3.title": "Construa Seu App",
    "start.step3.desc": "Escreva seu código em <code>packages/my-app/src/</code>. Use qualquer framework — Vite, vanilla, React, o que quiser.",
    "start.step4.title": "Commit e Deploy",
    "start.step4.desc": "Faça commit. Os hooks de pre-commit geram workflows, Dockerfiles e atualizam o README. Push pra fazer deploy.",

    // Footer
    "footer.tagline": "Publique apps vibe-coded com zero config.",
    "footer.project": "Projeto",
    "footer.community": "Comunidade",
    "footer.star": "Dar Star no GitHub",
    "footer.built": "Feito com Embark, naturalmente. &copy; 2026",
    "footer.made": 'Feito com vibes por <a href="https://github.com/blpsoares" target="_blank" rel="noopener">blpsoares</a>',
  },
};

const STORAGE_KEY = "embark-lang";

function getStoredLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "pt" || stored === "en") return stored;
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith("pt") ? "pt" : "en";
}

function applyTranslations(lang: Language) {
  const dict = translations[lang];

  const elements = document.querySelectorAll<HTMLElement>("[data-i18n]");
  for (const el of elements) {
    const key = el.getAttribute("data-i18n");
    if (key && dict[key]) {
      el.innerHTML = dict[key];
    }
  }

  const htmlElements = document.querySelectorAll<HTMLElement>("[data-i18n-html]");
  for (const el of htmlElements) {
    const key = el.getAttribute("data-i18n-html");
    if (key && dict[key]) {
      el.innerHTML = dict[key];
    }
  }

  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
}

function updateToggleButtons(lang: Language) {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".lang-btn");
  for (const btn of buttons) {
    btn.classList.toggle("active", btn.dataset["lang"] === lang);
  }
}

export function initI18n() {
  const lang = getStoredLanguage();
  applyTranslations(lang);
  updateToggleButtons(lang);

  const toggle = document.getElementById("lang-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>(".lang-btn");
    if (!btn) return;

    const newLang = btn.dataset["lang"] as Language;
    if (!newLang) return;

    localStorage.setItem(STORAGE_KEY, newLang);
    applyTranslations(newLang);
    updateToggleButtons(newLang);
  });
}
