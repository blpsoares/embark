interface CarouselConfig {
  itemsPerView: number;
  autoplayInterval: number;
  transitionDuration: number;
}

export class FeatureCarousel {
  private track!: HTMLElement;
  private slides: HTMLElement[] = [];
  private indicators: HTMLElement[] = [];
  private currentIndex: number = 0;
  private itemsPerView: number = 3;
  private autoplayInterval: number = 5000;
  private autoplayTimer: number | null = null;
  private isDragging: boolean = false;
  private dragStart: number = 0;

  constructor(config: CarouselConfig = { itemsPerView: 3, autoplayInterval: 5000, transitionDuration: 600 }) {
    this.track = document.getElementById("featureCarousel") as HTMLElement;
    this.itemsPerView = config.itemsPerView;
    this.autoplayInterval = config.autoplayInterval;

    if (!this.track) return;

    this.slides = Array.from(this.track.querySelectorAll<HTMLElement>(".carousel-slide"));

    const prevBtn = document.querySelector<HTMLButtonElement>(".carousel-prev");
    const nextBtn = document.querySelector<HTMLButtonElement>(".carousel-next");
    const indicatorsContainer = document.getElementById("featureIndicators");

    if (prevBtn) prevBtn.addEventListener("click", () => this.prev());
    if (nextBtn) nextBtn.addEventListener("click", () => this.next());

    // Create indicators
    if (indicatorsContainer) {
      const totalSlides = this.slides.length;
      const totalPages = Math.ceil(totalSlides / this.itemsPerView);

      for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement("div");
        dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
        dot.addEventListener("click", () => this.goToPage(i));
        indicatorsContainer.appendChild(dot);
        this.indicators.push(dot);
      }
    }

    // Responsive
    this.updateResponsive();
    window.addEventListener("resize", () => this.updateResponsive());

    // Mouse events
    this.track.addEventListener("mouseenter", () => this.stopAutoplay());
    this.track.addEventListener("mouseleave", () => this.startAutoplay());

    // Drag/swipe
    this.track.addEventListener("mousedown", (e) => this.onDragStart(e));
    document.addEventListener("mousemove", (e) => this.onDragMove(e));
    document.addEventListener("mouseup", () => this.onDragEnd());

    this.updateIndicators();
    this.startAutoplay();
  }

  private updateResponsive(): void {
    const width = window.innerWidth;
    if (width < 768) {
      this.itemsPerView = 1;
    } else if (width < 1024) {
      this.itemsPerView = 2;
    } else {
      this.itemsPerView = 3;
    }
  }

  private updatePosition(): void {
    const gap = 1.5; // rem
    const gapPx = gap * 16; // Assuming 16px = 1rem
    const slideWidth = (this.track.offsetWidth - gapPx * (this.itemsPerView - 1)) / this.itemsPerView;
    const offset = -(this.currentIndex * (slideWidth + gapPx));

    this.track.style.transform = `translateX(${offset}px)`;
    this.updateIndicators();
  }

  private updateIndicators(): void {
    if (this.indicators.length === 0) return;

    this.indicators.forEach((dot, index) => {
      dot.classList.toggle("active", index === this.currentIndex);
    });
  }

  private next(): void {
    const maxIndex = Math.max(0, this.slides.length - this.itemsPerView);
    this.currentIndex = (this.currentIndex + 1) % (maxIndex + 1);
    this.updatePosition();
    this.resetAutoplay();
  }

  private prev(): void {
    const maxIndex = Math.max(0, this.slides.length - this.itemsPerView);
    this.currentIndex = (this.currentIndex - 1 + maxIndex + 1) % (maxIndex + 1);
    this.updatePosition();
    this.resetAutoplay();
  }

  private goToPage(pageIndex: number): void {
    this.currentIndex = pageIndex;
    this.updatePosition();
    this.resetAutoplay();
  }

  private startAutoplay(): void {
    if (this.autoplayTimer !== null) return;

    this.autoplayTimer = window.setInterval(() => {
      this.next();
    }, this.autoplayInterval);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer !== null) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  private resetAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  private onDragStart(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStart = e.clientX;
    this.stopAutoplay();
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const delta = e.clientX - this.dragStart;
    if (Math.abs(delta) > 50) {
      if (delta > 0) {
        this.prev();
      } else {
        this.next();
      }
      this.isDragging = false;
    }
  }

  private onDragEnd(): void {
    this.isDragging = false;
    this.startAutoplay();
  }
}

export function initCarousel(): void {
  new FeatureCarousel({
    itemsPerView: 3,
    autoplayInterval: 5000,
    transitionDuration: 600,
  });
}
