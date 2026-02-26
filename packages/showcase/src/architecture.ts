const FILE_TREE_CONTENT = `<span class="dir">embark/</span>
<span class="comment"># each folder is an independent app</span>
├── <span class="dir">packages/</span>
<span class="comment"># this website!</span>
│   └── <span class="dir">showcase/</span>
│
<span class="comment"># monorepo automations</span>
├── <span class="dir">scripts/</span>
<span class="comment"># interactive CLI to create packages</span>
│   ├── <span class="file">create-package.ts</span>
<span class="comment"># auto GitHub Actions per package</span>
│   ├── <span class="file">generate-workflows.ts</span>
<span class="comment"># AI-powered Dockerfile generation</span>
│   ├── <span class="file">generate-dockerfiles-ai.ts</span>
<span class="comment"># sync workflows with template</span>
│   ├── <span class="file">sync-workflows.ts</span>
<span class="comment"># remove orphaned workflows</span>
│   ├── <span class="file">cleanup-orphan-workflows.ts</span>
<span class="comment"># auto-update README table</span>
│   ├── <span class="file">update-readme-packages.ts</span>
<span class="comment"># tests for all scripts</span>
│   └── <span class="dir">__tests__/</span>
│
<span class="comment"># generation templates</span>
├── <span class="dir">templates/</span>
<span class="comment"># GitHub Actions base template</span>
│   └── <span class="file">workflow.template.yml</span>
│
<span class="comment"># auto-generated workflows</span>
├── <span class="dir">.github/workflows/</span>
<span class="comment"># git hooks (pre-commit, pre-push)</span>
├── <span class="dir">.husky/</span>
<span class="comment"># root scripts & workspaces</span>
├── <span class="file">package.json</span>
<span class="comment"># TypeScript strict mode</span>
├── <span class="file">tsconfig.json</span>
<span class="comment"># Bun config (test coverage)</span>
└── <span class="file">bunfig.toml</span>`;

export function initArchitecture() {
  const codeEl = document.querySelector("#file-tree code");
  if (!codeEl) return;

  const section = document.getElementById("architecture");
  if (!section) return;

  let revealed = false;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !revealed) {
          revealed = true;
          revealTree(codeEl as HTMLElement);
        }
      }
    },
    { threshold: 0.2 }
  );

  observer.observe(section);
}

function revealTree(element: HTMLElement) {
  const lines = FILE_TREE_CONTENT.split("\n");
  let currentIndex = 0;

  const interval = setInterval(() => {
    if (currentIndex >= lines.length) {
      clearInterval(interval);
      return;
    }

    element.innerHTML += (currentIndex > 0 ? "\n" : "") + lines[currentIndex];
    currentIndex++;
  }, 60);
}
