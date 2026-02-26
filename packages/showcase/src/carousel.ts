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

  // Continuous scroll state
  private position: number = 0; // px
  private autoScrollSpeed: number = 100; // px per second (tweakable)
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private originalSlideCount: number = 0;
  private slideWidth: number = 0;
  private gapPx: number = 0;
  // timing config (from constructor)
  private autoplayInterval: number = 5000;
  private transitionDuration: number = 600;

  // momentum / pointer tracking
  private velocity: number = 0; // px per second
  private lastPointerX: number | null = null;
  private lastPointerTime: number | null = null;

  // Drag state
  private isDragging: boolean = false;
  private dragStart: number = 0;
  private dragStartPos: number = 0;

  constructor(config: CarouselConfig = { itemsPerView: 3, autoplayInterval: 5000, transitionDuration: 600 }) {
    this.track = document.getElementById("featureCarousel") as HTMLElement;
    this.itemsPerView = config.itemsPerView;
    this.autoplayInterval = config.autoplayInterval;

    if (!this.track) return;

    // initial slides (before cloning)
    this.slides = Array.from(this.track.querySelectorAll<HTMLElement>(".carousel-slide"));

    // Hint to the browser for smoother transforms
    this.track.style.willChange = 'transform';
    this.originalSlideCount = this.slides.length;

    // clone slides to allow seamless infinite scrolling
    // create two extra copies (total 3 sets: original + clone + clone) so we can start
    // the ticker in the middle set and loop seamlessly without a visible jump
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.originalSlideCount; i++) {
        const slide = this.slides[i];
        if (!slide) continue;
        const clone = slide.cloneNode(true) as HTMLElement;
        clone.classList.add("carousel-slide-clone");
        this.track.appendChild(clone);
      }
    }

    // refresh slides collection (now includes clones)
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

    // Responsive and sizing
    this.updateResponsive();
    this.recalcSizes();
    window.addEventListener("resize", () => {
      this.updateResponsive();
      this.recalcSizes();
    });

    // Mouse events: pause on hover
    this.track.addEventListener("mouseenter", () => this.stopAutoplay());
    this.track.addEventListener("mouseleave", () => this.startAutoplay());

    // Drag/swipe (mouse)
    this.track.addEventListener("mousedown", (e) => this.onDragStart(e));
    document.addEventListener("mousemove", (e) => this.onDragMove(e));
    document.addEventListener("mouseup", () => this.onDragEnd());

    // Touch events (mobile) — passive:false so we can preventDefault and control touch dragging
    this.track.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    this.track.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    this.track.addEventListener("touchend", () => this.onDragEnd());

    this.updateIndicators();
    // start in the middle copy so we have identical content before and after
    // recalcSizes will normalize position; ensure animation starts from middle set
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

  private recalcSizes(): void {
    // compute pixel sizes used by the continuous scroller
    const gap = 1.5; // rem
    this.gapPx = gap * 16;
    const viewport = this.track.parentElement as HTMLElement || this.track;
    const viewportWidth = viewport.offsetWidth;
    this.slideWidth = (viewportWidth - this.gapPx * (this.itemsPerView - 1)) / this.itemsPerView;

    // expose viewport width to CSS so slides keep their original visual width
    viewport.style.setProperty('--carousel-viewport-width', `${viewportWidth}px`);

    // compute original track width (one set width) used to normalize looping position
    const originalTrackWidth = this.slideWidth * this.originalSlideCount + this.gapPx * Math.max(0, this.originalSlideCount - 1);
    // if this is the first calculation, start the ticker in the middle set
    if (this.position === 0) {
      this.position = -originalTrackWidth; // start showing the middle (second) set
    }
    // normalize into the expected looping interval using modulo math
    this.position = this.normalizePosition(this.position, originalTrackWidth);
  }

  private normalizePosition(pos: number, originalTrackWidth?: number): number {
    const o = originalTrackWidth ?? (this.slideWidth * this.originalSlideCount + this.gapPx * Math.max(0, this.originalSlideCount - 1));
    if (o === 0) return 0;
    // Normalize into interval (-2o, -o] using a stable modulo expression.
    // Use double modulo to ensure positive remainder in JS.
    const mod = ((pos + 2 * o) % o + o) % o; // in [0, o)
    return mod - 2 * o; // maps to [-2o, -o)
  }

  // keep for compatibility with indicator/page navigation (not used by continuous loop)
  private updatePosition(): void {
    const offset = -(this.currentIndex * (this.slideWidth + this.gapPx));
    this.position = this.normalizePosition(offset);
    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    this.updateIndicators();
  }

  private updateIndicators(): void {
    if (this.indicators.length === 0) return;
    // compute page index based on current normalized position
    const slideStep = this.slideWidth + this.gapPx;
    const activeIndex = Math.floor(Math.abs(Math.round(this.position / slideStep)) / this.itemsPerView);
    this.indicators.forEach((dot, index) => {
      dot.classList.toggle("active", index === activeIndex);
    });
  }

  private next(): void {
    // jump forward one slide (respect original slide width)
    const step = this.slideWidth + this.gapPx;
    this.position = this.normalizePosition(this.position - step);
    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    this.resetAutoplay();
  }

  private prev(): void {
    const step = this.slideWidth + this.gapPx;
    this.position = this.normalizePosition(this.position + step);
    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    this.resetAutoplay();
  }

  private goToPage(pageIndex: number): void {
    const step = this.slideWidth + this.gapPx;
    const target = -(pageIndex * this.itemsPerView * step);
    this.position = this.normalizePosition(target);
    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    this.resetAutoplay();
  }

  private startAutoplay(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = null;
    this.rafId = window.requestAnimationFrame((t) => this.animate(t));
  }

  private stopAutoplay(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.lastTimestamp = null;
    }
  }

  private resetAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  private animate(timestamp: number): void {
    if (this.lastTimestamp === null) this.lastTimestamp = timestamp;
    const dt = (timestamp - (this.lastTimestamp || timestamp)) / 1000;
    this.lastTimestamp = timestamp;
    const originalTrackWidth = this.slideWidth * this.originalSlideCount + this.gapPx * Math.max(0, this.originalSlideCount - 1);

    if (!this.isDragging) {
      // base continuous scroll (to the left)
      this.position -= this.autoScrollSpeed * dt;

      // apply momentum velocity (from swipe) with friction
      if (Math.abs(this.velocity) > 0.1) {
        this.position += this.velocity * dt;
        // exponential decay for smooth slowing
        const friction = 5; // tweak for feel
        this.velocity *= Math.exp(-friction * dt);
      }

      // normalize position into (-2w, -w] using stable modulo math
      if (originalTrackWidth > 0) {
        this.position = this.normalizePosition(this.position, originalTrackWidth);
      }
    }

    // use translate3d for GPU compositing and subpixel precision
    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    this.rafId = window.requestAnimationFrame((t) => this.animate(t));
  }

  private onDragStart(e: MouseEvent): void {
    e.preventDefault();
    this.isDragging = true;
    this.dragStart = e.clientX;
    this.dragStartPos = this.position;
    this.lastPointerX = e.clientX;
    this.lastPointerTime = performance.now();
    this.velocity = 0;
    // prevent text selection while dragging
    document.body.style.userSelect = 'none';
    (document.body as HTMLElement).style.webkitUserSelect = 'none';
    this.stopAutoplay();
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const clientX = e.clientX;
    const delta = clientX - this.dragStart;
    this.position = this.dragStartPos + delta;
    // compute instantaneous pointer velocity
    if (this.lastPointerX !== null && this.lastPointerTime !== null) {
      const now = performance.now();
      const dt = Math.max(1, now - this.lastPointerTime) / 1000; // seconds
      const dx = clientX - this.lastPointerX;
      this.velocity = dx / dt;
      this.lastPointerX = clientX;
      this.lastPointerTime = now;
    }
    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
  }

  // touch handlers
  private onTouchStart(e: TouchEvent): void {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    this.isDragging = true;
    const clientX = touch.clientX;
    this.dragStart = clientX;
    this.dragStartPos = this.position;
    this.lastPointerX = clientX;
    this.lastPointerTime = performance.now();
    this.velocity = 0;
    // prevent selection during touch drag
    document.body.style.userSelect = 'none';
    (document.body as HTMLElement).style.webkitUserSelect = 'none';
    this.stopAutoplay();
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging) return;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    if (!touch) return;
    const clientX = touch.clientX;
    const delta = clientX - this.dragStart;
    this.position = this.dragStartPos + delta;
    // compute instantaneous pointer velocity
    if (this.lastPointerX !== null && this.lastPointerTime !== null) {
      const now = performance.now();
      const dt = Math.max(1, now - this.lastPointerTime) / 1000;
      const dx = clientX - this.lastPointerX;
      this.velocity = dx / dt;
      this.lastPointerX = clientX;
      this.lastPointerTime = now;
    }
    // use subpixel values (no rounding) to avoid perceptible jumps
    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    e.preventDefault();
  }

  private onDragEnd(): void {
    this.isDragging = false;
    // clear pointer trackers so subsequent drags start fresh
    this.lastPointerX = null;
    this.lastPointerTime = null;
    // restore selection
    document.body.style.userSelect = '';
    (document.body as HTMLElement).style.webkitUserSelect = '';
    // keep current velocity (set by last move) and resume animation
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
