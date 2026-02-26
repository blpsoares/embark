export function initTerminal() {
  const section = document.getElementById("how-it-works");
  if (!section) return;

  let started = false;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !started) {
          started = true;
          animateTerminal();
        }
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(section);
}

function animateTerminal() {
  const section = document.getElementById("how-it-works");
  if (!section) return;

  const lines = section.querySelectorAll<HTMLElement>(".terminal-line");

  for (const line of lines) {
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
