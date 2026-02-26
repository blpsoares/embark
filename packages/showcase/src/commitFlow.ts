export function initCommitFlow() {
  const section = document.getElementById("commit-examples");
  if (!section) return;

  let started = false;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !started) {
          started = true;
          animateCommitFlows();
        }
      }
    },
    { threshold: 0.5 }
  );

  observer.observe(section);
}

function animateCommitFlows() {
  // Animate left terminal
  const leftLines = document.querySelectorAll<HTMLElement>(
    "#terminal-left .terminal-line"
  );
  for (const line of leftLines) {
    const delay = parseInt(line.dataset.delay ?? "0", 10);
    const textEl = line.querySelector<HTMLElement>("[data-text]");
    const text = textEl?.dataset.text ?? "";

    setTimeout(() => {
      line.classList.add("visible");

      if (textEl && text) {
        typeText(textEl, text);
      }
    }, delay);
  }

  // Animate right terminal
  const rightLines = document.querySelectorAll<HTMLElement>(
    "#terminal-right .terminal-line"
  );
  for (const line of rightLines) {
    const delay = parseInt(line.dataset.delay ?? "0", 10);
    const textEl = line.querySelector<HTMLElement>("[data-text]");
    const text = textEl?.dataset.text ?? "";

    setTimeout(() => {
      line.classList.add("visible");

      if (textEl && text) {
        typeText(textEl, text);
      }
    }, delay);
  }
}

function typeText(element: HTMLElement, text: string) {
  let i = 0;
  element.textContent = "";

  const interval = setInterval(() => {
    element.textContent += text[i] ?? "";
    i++;
    if (i >= text.length) {
      clearInterval(interval);
    }
  }, 50);
}
