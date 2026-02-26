export function initPipeline() {
  const steps = document.querySelectorAll<HTMLElement>(".pipeline-step");

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const index = Array.from(steps).indexOf(el);
          setTimeout(() => {
            el.classList.add("visible");
          }, index * 200);
          observer.unobserve(el);
        }
      }
    },
    { threshold: 0.2 }
  );

  for (const step of steps) {
    observer.observe(step);
  }
}
