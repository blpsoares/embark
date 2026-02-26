export function initAiSetup() {
  const section = document.getElementById("ai-setup");
  if (!section) return;

  let started = false;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !started) {
          started = true;
          animateAiSetup();
        }
      }
    },
    { threshold: 0.1 }
  );

  observer.observe(section);
}

function animateAiSetup() {
  const cards = document.querySelectorAll<HTMLElement>(
    "#ai-setup .ai-setup-card"
  );

  cards.forEach((card, index) => {
    // Stagger animation
    const delay = index * 100;
    setTimeout(() => {
      card.classList.add("visible");
    }, delay);
  });

  // Animate copy buttons
  const copyButtons = document.querySelectorAll<HTMLButtonElement>(
    "#ai-setup .copy-btn"
  );

  copyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const codeBlock = btn.parentElement?.querySelector("code");
      if (!codeBlock) return;

      const text = codeBlock.textContent || "";
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = "✓";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      });
    });
  });
}
