export function initControlCards() {
  const cards = document.querySelectorAll<HTMLElement>(".control-card");

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
    { threshold: 0.1 }
  );

  for (const card of cards) {
    observer.observe(card);
  }
}
