export function initScrollProgress() {
  const progressBar = document.getElementById("scroll-progress");
  if (!progressBar) return;

  // Update immediately on load
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar!.style.width = `${progress}%`;
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  // Initial update
  updateProgress();
}
