/**
 * Initialize main navigation menu with:
 * - Mobile hamburger toggle
 * - Active section highlighting on scroll
 * - Scroll effect styling
 * - Smooth scroll behavior
 */

export function initNav(): void {
  const nav = document.getElementById("main-nav") as HTMLElement | null;
  const navToggle = document.getElementById("nav-toggle") as HTMLButtonElement | null;
  const navLinks = document.getElementById("nav-links") as HTMLElement | null;
  const navItems = document.querySelectorAll(".nav-links a");

  // Mobile hamburger toggle
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      navToggle.classList.toggle("active");
      navLinks?.classList.toggle("active");

      // Adjust scroll progress bar position when menu opens/closes
      updateScrollProgressPosition();
    });
  }

  // Update scroll progress bar position based on menu state
  function updateScrollProgressPosition(): void {
    const scrollProgress = document.getElementById("scroll-progress");
    if (!scrollProgress) return;

    // Only adjust on mobile
    if (window.innerWidth <= 768) {
      if (navLinks?.classList.contains("active")) {
        // Menu is open - position bar below the menu
        const navHeight = nav?.offsetHeight || 60;
        const menuHeight = navLinks.offsetHeight || 0;
        scrollProgress.style.top = `${navHeight + menuHeight}px`;
      } else {
        // Menu is closed - position bar below the nav
        const navHeight = nav?.offsetHeight || 60;
        scrollProgress.style.top = `${navHeight}px`;
      }
    } else {
      // Desktop - always at top
      scrollProgress.style.top = "0px";
    }
  }

  // Update on window resize
  window.addEventListener("resize", updateScrollProgressPosition);

  // Initial position update
  updateScrollProgressPosition();

  // Close menu when link is clicked
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navToggle?.classList.remove("active");
      navLinks?.classList.remove("active");
    });
  });

  // Update active link and nav styling on scroll
  function updateActiveLink(): void {
    let current = "";
    const sections = document.querySelectorAll("section[id]");

    // Add scrolled class to nav
    if (nav) {
      if (window.scrollY > 10) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    }

    sections.forEach((section) => {
      const sectionTop = (section as HTMLElement).offsetTop;
      const sectionHeight = (section as HTMLElement).clientHeight;

      if (window.scrollY >= sectionTop - 150) {
        current = section.getAttribute("id") || "";
      }
    });

    navItems.forEach((item) => {
      item.classList.remove("active");
      if (item.getAttribute("href") === `#${current}`) {
        item.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", updateActiveLink, { passive: true });
  updateActiveLink(); // Call once on init
}
