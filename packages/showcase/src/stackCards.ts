export function initStackCards() {
  const cards = document.querySelectorAll<HTMLElement>(".stack-card");

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const index = Array.from(cards).indexOf(el);
          setTimeout(() => {
            el.classList.add("visible");
          }, index * 100);
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
