export function initFeatures() {
  const cards = document.querySelectorAll<HTMLElement>(".feature-card");

  // Reveal on scroll
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

  // 3D tilt effect
  for (const card of cards) {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
    });
  }
}
