export function initGetStarted() {
  // Reveal cards on scroll
  const cards = document.querySelectorAll<HTMLElement>(".get-started-card");

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const index = Array.from(cards).indexOf(el);
          setTimeout(() => {
            el.classList.add("visible");
          }, index * 150);
          observer.unobserve(el);
        }
      }
    },
    { threshold: 0.2 }
  );

  for (const card of cards) {
    observer.observe(card);
  }

  // Copy buttons
  const copyButtons = document.querySelectorAll<HTMLButtonElement>(".copy-btn");

  for (const btn of copyButtons) {
    btn.addEventListener("click", () => {
      const codeBlock = btn.closest(".code-block");
      const code = codeBlock?.querySelector("code")?.textContent ?? "";

      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = "✅";
        btn.classList.add("copied");

        setTimeout(() => {
          btn.textContent = "📋";
          btn.classList.remove("copied");
        }, 2000);
      });
    });
  }
}
