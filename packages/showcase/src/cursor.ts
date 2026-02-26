export function initCursor() {
  if (window.innerWidth <= 768) return;

  const cursorEl = document.getElementById("custom-cursor");
  const glowEl = document.getElementById("cursor-glow");
  if (!cursorEl || !glowEl) return;

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;

  const cursorStyle = cursorEl.style;
  const glowStyle = glowEl.style;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Smooth follow
  function animate() {
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;

    cursorStyle.left = `${cursorX}px`;
    cursorStyle.top = `${cursorY}px`;
    glowStyle.left = `${cursorX}px`;
    glowStyle.top = `${cursorY}px`;

    requestAnimationFrame(animate);
  }

  animate();

  // Hover effects on interactive elements
  const interactiveElements = document.querySelectorAll("a, button, .feature-card, .stack-card, .get-started-card");

  for (const el of interactiveElements) {
    el.addEventListener("mouseenter", () => {
      cursorEl.classList.add("hover");
    });

    el.addEventListener("mouseleave", () => {
      cursorEl.classList.remove("hover");
    });
  }
}
