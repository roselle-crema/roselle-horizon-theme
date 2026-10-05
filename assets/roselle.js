/* Progressive enhancement: Shopify's native form remains usable without JavaScript. */
if (!customElements.get('roselle-purchase')) {
  customElements.define('roselle-purchase', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      this.selector = this.querySelector('select[name="id"]');
      this.quantity = this.querySelector('input[name="quantity"]');
      this.sticky = document.querySelector(`[data-roselle-sticky="${this.dataset.formId}"]`);
      this.selector?.addEventListener('change', (event) => this.updateVariant(event), { signal: this.controller.signal });
      this.updateVariant();
      if (this.sticky && 'IntersectionObserver' in window) {
        document.body.classList.add('rs-has-sticky');
        this.observer = new IntersectionObserver(([entry]) => {
          this.sticky.hidden = entry.isIntersecting || entry.boundingClientRect.bottom > 0;
        }, { threshold: 0 });
        this.observer.observe(this);
      }
    }
    updateVariant(event) {
      const option = this.selector?.selectedOptions[0];
      if (!option) return;
      if (event && option.dataset.mediaId) {
        this.closest('.rs-hero')?.querySelector('roselle-gallery')?.showMedia(option.dataset.mediaId);
      }
      this.querySelector('[data-price]').textContent = option.dataset.price;
      const compare = this.querySelector('[data-compare]');
      compare.textContent = option.dataset.compare;
      compare.hidden = !option.dataset.compare;
      this.querySelector('button[name="add"]').disabled = option.disabled;
      this.querySelector('[data-add-label]').textContent = option.disabled ? this.dataset.unavailableLabel : this.dataset.availableLabel;
      if (this.sticky) {
        this.sticky.querySelector('[data-sticky-price]').textContent = option.dataset.price;
        const stickyButton = this.sticky.querySelector('button');
        if (stickyButton) stickyButton.disabled = option.disabled;
      }
      const min = Number(option.dataset.min) || 1;
      const step = Number(option.dataset.step) || 1;
      this.quantity.min = String(min);
      this.quantity.step = String(step);
      if (option.dataset.max) this.quantity.max = option.dataset.max;
      else this.quantity.removeAttribute('max');
      this.quantity.value = String(min);
    }
    disconnectedCallback() {
      this.controller?.abort();
      this.observer?.disconnect();
      document.body.classList.remove('rs-has-sticky');
    }
  });
}

/* Hero gallery: native CSS scroll-snap does the swiping; this only syncs dots/thumbnails and handles clicks. */
if (!customElements.get('roselle-gallery')) {
  customElements.define('roselle-gallery', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.track = this.querySelector('[data-gallery-track]');
      this.slides = [...this.querySelectorAll('[data-gallery-slide]')];
      this.controls = [...this.querySelectorAll('[data-gallery-go]')];
      this.active = 0;
      if (!this.track || this.slides.length < 2) return;

      this.addEventListener('click', (event) => {
        const control = event.target.closest('[data-gallery-go]');
        if (control) this.goTo(Number(control.dataset.galleryGo));
      }, { signal });

      let frame = 0;
      this.track.addEventListener('scroll', () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => this.setActive(this.currentIndex()));
      }, { passive: true, signal });

      /* Theme Editor: show the block that the merchant selects. */
      document.addEventListener('shopify:block:select', (event) => {
        const index = this.slides.findIndex((slide) => slide.contains(event.target) || slide === event.target);
        if (index > -1) this.goTo(index, true);
      }, { signal });
    }
    currentIndex() {
      return Math.round(Math.abs(this.track.scrollLeft) / Math.max(this.track.clientWidth, 1));
    }
    goTo(index, instant = false) {
      const slide = this.slides[index];
      if (!slide) return;
      const reduce = instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const offset = slide.offsetLeft;
      this.track.scrollTo({ left: document.dir === 'rtl' ? -Math.abs(offset) : offset, behavior: reduce ? 'auto' : 'smooth' });
      this.setActive(index);
    }
    showMedia(mediaId) {
      const index = this.slides.findIndex((slide) => slide.dataset.mediaId === String(mediaId));
      if (index > -1) this.goTo(index);
    }
    setActive(index) {
      if (index === this.active) return;
      this.active = index;
      for (const control of this.controls) {
        const isActive = Number(control.dataset.galleryGo) === index;
        if (isActive) control.setAttribute('aria-current', 'true');
        else control.removeAttribute('aria-current');
        if (isActive && control.classList.contains('rs-gallery-thumb') && control.offsetParent) {
          control.parentElement.scrollTo({ left: control.offsetLeft - 8, behavior: 'smooth' });
        }
      }
      this.slides.forEach((slide, i) => {
        if (i !== index) slide.querySelector('video')?.pause();
      });
    }
    disconnectedCallback() {
      this.controller?.abort();
    }
  });
}

/* Before/after slider: a native range input gives keyboard and screen-reader support; pointer events let mouse and touch drag from anywhere on the image. */
if (!customElements.get('roselle-compare')) {
  customElements.define('roselle-compare', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.range = this.querySelector('.rs-compare-range');
      if (!this.range) return;
      this.range.addEventListener('input', () => this.setPosition(this.range.value), { signal });
      this.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        this.dragging = true;
        try { this.setPointerCapture(event.pointerId); } catch { /* pointer already released */ }
        /* On touch, wait for a horizontal move so a vertical page scroll doesn't jump the divider. */
        if (event.pointerType === 'mouse') this.fromPointer(event);
      }, { signal });
      this.addEventListener('pointermove', (event) => {
        if (this.dragging) this.fromPointer(event);
      }, { signal });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.addEventListener(type, () => { this.dragging = false; }, { signal });
      }
      this.setPosition(this.range.value);
    }
    fromPointer(event) {
      const rect = this.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const value = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
      this.range.value = String(value);
      this.setPosition(value);
    }
    setPosition(value) {
      this.style.setProperty('--rs-compare-pos', `${value}%`);
    }
    disconnectedCallback() {
      this.controller?.abort();
    }
  });
}

/* Ingredient carousel: CSS scroll-snap does the swiping; this wires arrows, dots and Theme Editor block selection. */
if (!customElements.get('roselle-carousel')) {
  customElements.define('roselle-carousel', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.track = this.querySelector('[data-carousel-track]');
      this.items = [...this.querySelectorAll('[data-carousel-item]')];
      this.prev = this.querySelector('[data-carousel-prev]');
      this.next = this.querySelector('[data-carousel-next]');
      this.dots = [...this.querySelectorAll('[data-carousel-go]')];
      if (!this.track || this.items.length < 2) return;

      this.prev?.addEventListener('click', () => this.step(-1), { signal });
      this.next?.addEventListener('click', () => this.step(1), { signal });
      this.addEventListener('click', (event) => {
        const dot = event.target.closest('[data-carousel-go]');
        if (dot) this.goTo(Number(dot.dataset.carouselGo));
      }, { signal });

      let frame = 0;
      this.track.addEventListener('scroll', () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => this.update());
      }, { passive: true, signal });
      window.addEventListener('resize', () => this.update(), { passive: true, signal });

      document.addEventListener('shopify:block:select', (event) => {
        const index = this.items.findIndex((item) => item === event.target || item.contains(event.target));
        if (index > -1) this.goTo(index, true);
      }, { signal });

      this.update();
    }
    offsetOf(index) {
      const first = this.items[0];
      return this.items[index].offsetLeft - first.offsetLeft;
    }
    currentIndex() {
      const left = Math.abs(this.track.scrollLeft);
      let closest = 0;
      this.items.forEach((_, i) => {
        if (Math.abs(this.offsetOf(i) - left) < Math.abs(this.offsetOf(closest) - left)) closest = i;
      });
      return closest;
    }
    step(direction) {
      this.goTo(Math.min(Math.max(this.currentIndex() + direction, 0), this.items.length - 1));
    }
    goTo(index, instant = false) {
      const reduce = instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.track.scrollTo({ left: this.offsetOf(index), behavior: reduce ? 'auto' : 'smooth' });
    }
    update() {
      const max = this.track.scrollWidth - this.track.clientWidth;
      const left = Math.abs(this.track.scrollLeft);
      if (this.prev) this.prev.disabled = left <= 2;
      if (this.next) this.next.disabled = left >= max - 2;
      const current = left >= max - 2 ? this.items.length - 1 : this.currentIndex();
      this.dots.forEach((dot, i) => {
        if (i === current) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }
    disconnectedCallback() {
      this.controller?.abort();
    }
  });
}
