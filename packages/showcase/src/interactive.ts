let isSimulationRunning = false;

export function initInteractive() {
  const section = document.getElementById("try-it");
  if (!section) return;

  const terminal = document.getElementById("interactive-terminal");
  const terminalHeader = terminal?.parentElement?.querySelector(".terminal-header");

  // Remove old refresh button if exists
  const oldRefreshBtn = terminalHeader?.querySelector(".terminal-refresh-btn");
  if (oldRefreshBtn) {
    oldRefreshBtn.remove();
  }

  if (terminalHeader) {
    const refreshBtn = document.createElement("button");
    refreshBtn.className = "terminal-refresh-btn";
    refreshBtn.innerHTML = "🔄";
    refreshBtn.title = "Reset simulation";
    refreshBtn.onclick = async () => {
      if (terminal && !isSimulationRunning) {
        isSimulationRunning = true;
        terminal.innerHTML = "";
        try {
          await startSimulation();
        } finally {
          isSimulationRunning = false;
        }
      }
    };
    terminalHeader.appendChild(refreshBtn);
  }

  let started = false;

  const observer = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !started && !isSimulationRunning) {
          started = true;
          isSimulationRunning = true;
          try {
            await startSimulation();
          } finally {
            isSimulationRunning = false;
          }
        }
      }
    },
    { threshold: 0.5 }
  );

  observer.observe(section);
}

interface TerminalLine {
  type: "output" | "question" | "option" | "selected" | "info";
  content: string;
  class?: string;
}

async function startSimulation() {
  const terminal = document.getElementById("interactive-terminal");
  if (!terminal) return;

  let selectedIndex = 0;
  let selectedDeploy = "";

  const addLine = (line: TerminalLine) => {
    const div = document.createElement("div");
    div.className = `terminal-line output ${line.class || ""}`;
    div.innerHTML = `<span>${escapeHtml(line.content)}</span>`;
    terminal.appendChild(div);
    div.classList.add("visible");

    // Auto-scroll to bottom after render
    setTimeout(() => {
      terminal.scrollTop = terminal.scrollHeight;
    }, 0);
  };

  const showMenu = async (question: string, options: string[]): Promise<number> => {
    return new Promise((resolve) => {
      // Add question
      addLine({
        type: "question",
        content: question,
        class: "processing",
      });

      // Add options
      const optionLines = options.map((opt, i) => ({
        index: i,
        element: null as HTMLElement | null,
      }));

      options.forEach((opt, i) => {
        const div = document.createElement("div");
        div.className = `terminal-line output option ${i === 0 ? "focused" : ""}`;
        div.innerHTML = `<span>${i + 1}. ${escapeHtml(opt)}</span>`;
        terminal.appendChild(div);
        div.classList.add("visible");
        optionLines[i]!.element = div;
      });

      // Add navigation instructions
      const instructionsDiv = document.createElement("div");
      instructionsDiv.className = "terminal-line output info";
      instructionsDiv.innerHTML = `<span>↑/↓ navigate  │  Enter select</span>`;
      terminal.appendChild(instructionsDiv);
      instructionsDiv.classList.add("visible");

      setTimeout(() => {
        terminal.scrollTop = terminal.scrollHeight;
      }, 0);

      let currentIndex = 0;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const newIndex =
            event.key === "ArrowUp"
              ? Math.max(0, currentIndex - 1)
              : Math.min(options.length - 1, currentIndex + 1);

          optionLines[currentIndex]?.element?.classList.remove("focused");
          optionLines[newIndex]?.element?.classList.add("focused");
          currentIndex = newIndex;

          optionLines[newIndex]?.element?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        } else if (event.key === "Enter") {
          event.preventDefault();
          document.removeEventListener("keydown", handleKeyDown);

          // Remove focused class and mark as selected
          optionLines.forEach((line) => {
            line.element?.classList.remove("focused");
          });
          optionLines[currentIndex]?.element?.classList.add("selected");

          setTimeout(() => {
            resolve(currentIndex);
          }, 300);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
    });
  };

  // Start simulation
  await new Promise((r) => setTimeout(r, 500));

  addLine({
    type: "output",
    content: '🚀 Package "my-app" needs a deploy configuration',
    class: "rocket",
  });

  await new Promise((r) => setTimeout(r, 800));

  // Choose deploy target
  const deployIndex = await showMenu("Choose deploy target:", [
    "Google Cloud Run (generates workflow + Dockerfile)",
    "Netlify (no CI/CD or Docker needed)",
    "Other (custom deploy — manual configuration)",
  ]);

  await new Promise((r) => setTimeout(r, 600));

  const targets = ["cloud-run", "netlify", "other"];
  selectedDeploy = targets[deployIndex] ?? "cloud-run";

  // Show config created
  addLine({
    type: "output",
    content: `✓ Created .embark.jsonc for my-app (deploy: ${selectedDeploy})`,
    class: "success",
  });

  await new Promise((r) => setTimeout(r, 600));

  // Handle Cloud Run
  if (selectedDeploy === "cloud-run") {
    addLine({
      type: "info",
      content: "↳ Google Cloud Run Configuration",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 400));

    addLine({
      type: "output",
      content: "  ℹ Cloud Run deployment will:",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 200));

    addLine({
      type: "output",
      content: "    • Auto-generate GitHub Actions workflow",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 200));

    addLine({
      type: "output",
      content: "    • Auto-generate Dockerfile (optional)",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 600));

    // Ask for Dockerfile
    const wantsDocker = await showMenu("Generate a Dockerfile? (recommended for Cloud Run)", [
      "Yes",
      "No",
    ]);

    await new Promise((r) => setTimeout(r, 600));

    if (wantsDocker === 0) {
      // Ask for method
      const methodIndex = await showMenu(
        "Dockerfile Generation Method: How do you want to generate the Dockerfile?",
        [
          "Yes, choose which AI to use (Gemini, Claude, Copilot, Codex)",
          "No, generate default Dockerfile",
        ]
      );

      await new Promise((r) => setTimeout(r, 600));

      if (methodIndex === 0) {
        // Ask for AI provider
        const aiIndex = await showMenu("Which AI CLI do you want to use?", [
          "Gemini",
          "Claude",
          "Copilot",
          "Codex",
        ]);

        await new Promise((r) => setTimeout(r, 600));

        const aiProviders = ["Gemini", "Claude", "Copilot", "Codex"];
        const selectedAi = aiProviders[aiIndex] ?? "Claude";

        addLine({
          type: "output",
          content: `  ${selectedAi === "Claude" ? "⏳ Generating Dockerfile with Claude..." : "⏳ Generating Dockerfile..."}`,
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 1000));

        addLine({
          type: "output",
          content: "  ⏳ Receiving data... (2048 bytes)",
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 1200));

        addLine({
          type: "output",
          content: `✓ ${selectedAi.toUpperCase()} generated Dockerfile successfully (2048 bytes received)`,
          class: "success",
        });

        await new Promise((r) => setTimeout(r, 600));
      } else {
        // Default Dockerfile
        addLine({
          type: "output",
          content: "  ⏳ Generating default Dockerfile...",
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 800));

        addLine({
          type: "output",
          content: "✓ Default Dockerfile generated",
          class: "success",
        });

        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  // Handle Netlify
  if (selectedDeploy === "netlify") {
    addLine({
      type: "info",
      content: "↳ Netlify Configuration",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 400));

    addLine({
      type: "output",
      content: "✓ Created netlify.toml",
      class: "success",
    });

    await new Promise((r) => setTimeout(r, 400));

    addLine({
      type: "output",
      content: "  ℹ Deployment will be configured via Netlify (no GitHub Actions workflow)",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 600));

    // Ask for optional Dockerfile
    const wantsDocker = await showMenu(
      "Generate a Dockerfile for this package? (optional)",
      ["Yes", "No"]
    );

    await new Promise((r) => setTimeout(r, 600));

    if (wantsDocker === 0) {
      const methodIndex = await showMenu(
        "Dockerfile Generation Method: How do you want to generate the Dockerfile?",
        [
          "Yes, choose which AI to use (Gemini, Claude, Copilot, Codex)",
          "No, generate default Dockerfile",
        ]
      );

      await new Promise((r) => setTimeout(r, 600));

      if (methodIndex === 0) {
        const aiIndex = await showMenu("Which AI CLI do you want to use?", [
          "Gemini",
          "Claude",
          "Copilot",
          "Codex",
        ]);

        await new Promise((r) => setTimeout(r, 600));

        const aiProviders = ["Gemini", "Claude", "Copilot", "Codex"];
        const selectedAi = aiProviders[aiIndex] ?? "Claude";

        addLine({
          type: "output",
          content: `  ⏳ Generating Dockerfile with ${selectedAi}...`,
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 1000));

        addLine({
          type: "output",
          content: "  ⏳ Receiving data... (2048 bytes)",
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 1200));

        addLine({
          type: "output",
          content: `✓ ${selectedAi.toUpperCase()} generated Dockerfile successfully (2048 bytes received)`,
          class: "success",
        });

        await new Promise((r) => setTimeout(r, 600));
      } else {
        addLine({
          type: "output",
          content: "  ⏳ Generating default Dockerfile...",
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 800));

        addLine({
          type: "output",
          content: "✓ Default Dockerfile generated",
          class: "success",
        });

        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  // Handle Other
  if (selectedDeploy === "other") {
    addLine({
      type: "info",
      content: "↳ Custom Deploy Configuration",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 400));

    addLine({
      type: "output",
      content: "  ℹ You'll need to manually configure:",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 200));

    addLine({
      type: "output",
      content: "    • Your deployment platform",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 200));

    addLine({
      type: "output",
      content: "    • Dockerfile (if required)",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 200));

    addLine({
      type: "output",
      content: "    • GitHub Actions workflow (if needed)",
      class: "info",
    });

    await new Promise((r) => setTimeout(r, 600));

    const wantsDocker = await showMenu(
      "Generate a Dockerfile for this package? (optional)",
      ["Yes", "No"]
    );

    await new Promise((r) => setTimeout(r, 600));

    if (wantsDocker === 0) {
      const methodIndex = await showMenu(
        "Dockerfile Generation Method: How do you want to generate the Dockerfile?",
        [
          "Yes, choose which AI to use (Gemini, Claude, Copilot, Codex)",
          "No, generate default Dockerfile",
        ]
      );

      await new Promise((r) => setTimeout(r, 600));

      if (methodIndex === 0) {
        const aiIndex = await showMenu("Which AI CLI do you want to use?", [
          "Gemini",
          "Claude",
          "Copilot",
          "Codex",
        ]);

        await new Promise((r) => setTimeout(r, 600));

        const aiProviders = ["Gemini", "Claude", "Copilot", "Codex"];
        const selectedAi = aiProviders[aiIndex] ?? "Claude";

        addLine({
          type: "output",
          content: `  ⏳ Generating Dockerfile with ${selectedAi}...`,
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 1000));

        addLine({
          type: "output",
          content: "  ⏳ Receiving data... (2048 bytes)",
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 1200));

        addLine({
          type: "output",
          content: `✓ ${selectedAi.toUpperCase()} generated Dockerfile successfully (2048 bytes received)`,
          class: "success",
        });

        await new Promise((r) => setTimeout(r, 600));
      } else {
        addLine({
          type: "output",
          content: "  ⏳ Generating default Dockerfile...",
          class: "processing",
        });

        await new Promise((r) => setTimeout(r, 800));

        addLine({
          type: "output",
          content: "✓ Default Dockerfile generated",
          class: "success",
        });

        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  // Final steps
  await new Promise((r) => setTimeout(r, 800));

  addLine({
    type: "output",
    content: "✓ Packages added to git staging",
    class: "success",
  });

  await new Promise((r) => setTimeout(r, 600));

  addLine({
    type: "output",
    content: "[main 1a2b3c4] feat: my-app",
    class: "default",
  });

  // Mark simulation as complete
  isSimulationRunning = false;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char);
}
