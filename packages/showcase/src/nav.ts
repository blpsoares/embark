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
    });
  }

  // Close menu when link is clicked
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navToggle?.classList.remove("active");
      navLinks?.classList.remove("active");
    });
  });

  // Close menu when language button is clicked
  const langButtons = document.querySelectorAll(".nav-mobile-lang-toggle .lang-btn");
  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
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
