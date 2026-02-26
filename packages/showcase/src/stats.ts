export function initStats() {
  const cards = document.querySelectorAll<HTMLElement>(".stat-card");

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const index = Array.from(cards).indexOf(el);
          setTimeout(() => {
            el.classList.add("visible");
            const numberEl = el.querySelector<HTMLElement>(".stat-number");
            if (numberEl) {
              animateNumber(numberEl);
            }
          }, index * 150);
          observer.unobserve(el);
        }
      }
    },
    { threshold: 0.3 }
  );

  for (const card of cards) {
    observer.observe(card);
  }
}

function animateNumber(element: HTMLElement) {
  const target = parseInt(element.dataset.target ?? "0", 10);
  const duration = 1200;
  const start = performance.now();

  function update(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);

    element.textContent = current.toString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
