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
        this.sticky.hidden = false;
        this.sticky.classList.add('is-ready');
        this.sticky.inert = true;
        this.observer = new IntersectionObserver(([entry]) => {
          const show = !(entry.isIntersecting || entry.boundingClientRect.bottom > 0);
          this.sticky.classList.toggle('is-visible', show);
          document.body.classList.toggle('rs-sticky-visible', show);
          this.sticky.inert = !show;
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
      document.body.classList.remove('rs-has-sticky', 'rs-sticky-visible');
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

/* Before/after slider. The range input keeps keyboard and screen-reader support. Mouse drags from anywhere;
   on touch, dragging the handle moves the divider and a tap jumps to that point, so swiping the image
   still scrolls the comparison carousel. When the slider isn't inside a scrollable carousel, touch can
   drag from anywhere too. */
if (!customElements.get('roselle-compare')) {
  customElements.define('roselle-compare', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.range = this.querySelector('.rs-compare-range');
      this.handle = this.querySelector('.rs-compare-handle');
      if (!this.range) return;
      this.range.addEventListener('input', () => { this.touched = true; this.setPosition(this.range.value); }, { signal });
      this.addEventListener('pointerdown', (event) => this.onDown(event), { signal });
      this.addEventListener('dragstart', (event) => event.preventDefault(), { signal });
      this.addEventListener('pointermove', (event) => {
        if (!this.dragging) return;
        this.suppressClick = true;
        this.fromPointer(event);
      }, { signal });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.addEventListener(type, () => { this.dragging = false; this.classList.remove('is-dragging'); }, { signal });
      }
      this.addEventListener('click', (event) => {
        if (this.suppressClick) { this.suppressClick = false; return; }
        if (event.target.closest('.rs-compare-handle')) return;
        this.touched = true;
        this.fromPointer(event, true);
      }, { signal });
      const updateMode = () => {
        const track = this.closest('.rs-swipe');
        this.classList.toggle('rs-compare-slider--free', !track || track.scrollWidth <= track.clientWidth + 2);
      };
      updateMode();
      window.addEventListener('resize', updateMode, { passive: true, signal });
      this.setPosition(this.range.value);
      this.hint();
    }
    onDown(event) {
      if (event.button !== 0) return;
      const onHandle = event.target.closest('.rs-compare-handle');
      const free = this.classList.contains('rs-compare-slider--free');
      if (event.pointerType !== 'mouse' && !onHandle && !free) return;
      if (event.pointerType === 'mouse') event.preventDefault();
      this.dragging = true;
      this.touched = true;
      this.classList.add('is-dragging');
      try { this.setPointerCapture(event.pointerId); } catch { /* pointer already released */ }
      this.suppressClick = false;
      if (event.pointerType === 'mouse' || onHandle) this.fromPointer(event);
    }
    fromPointer(event, animate = false) {
      const rect = this.getBoundingClientRect();
      const value = Math.round(Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) * 100);
      this.range.value = String(value);
      this.classList.toggle('is-animating', animate);
      this.setPosition(value);
    }
    setPosition(value) {
      this.style.setProperty('--rs-compare-pos', `${value}%`);
    }
    /* One gentle back-and-forth the first time the slider is seen, to show it can be moved. */
    hint() {
      if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (document.documentElement.classList.contains('shopify-design-mode')) return;
      this.hintObserver = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        this.hintObserver.disconnect();
        const frames = [[0, 50], [700, 38], [1500, 62], [2200, 50]];
        const start = performance.now() + 300;
        const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const step = (now) => {
          if (this.touched || !this.isConnected) return;
          const t = now - start;
          if (t < 0) { requestAnimationFrame(step); return; }
          let i = frames.findIndex(([time]) => time > t);
          if (i === -1) { this.setPosition(50); return; }
          const [t0, v0] = frames[i - 1];
          const [t1, v1] = frames[i];
          this.setPosition((v0 + (v1 - v0) * ease((t - t0) / (t1 - t0))).toFixed(2));
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: 0.6 });
      this.hintObserver.observe(this);
    }
    disconnectedCallback() {
      this.controller?.abort();
      this.hintObserver?.disconnect();
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

/* Reviews marquee: a native horizontal scroller (so touch swipe and keyboard work) that drifts slowly
   on its own. Cards are cloned until one set is wider than the viewport, so the loop has no visible seam.
   Interaction pauses it; it eases back in after a short idle. No autoplay with reduced motion. */
if (!customElements.get('roselle-marquee')) {
  customElements.define('roselle-marquee', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      const { signal } = this.controller;
      this.track = this.querySelector('[data-marquee-track]');
      const cards = this.track ? [...this.track.children] : [];
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!this.track || !cards.length || !this.hasAttribute('data-autoplay') || reduce) return;

      this.classList.add('is-marquee');
      const setWidth = () => this.track.scrollWidth;
      let set = setWidth();
      let guard = 0;
      while (set < this.track.clientWidth * 2 && guard++ < 6) {
        for (const card of cards) {
          const clone = card.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.inert = true;
          clone.removeAttribute('data-shopify-editor-block');
          this.track.append(clone);
        }
        set = setWidth();
      }
      /* Duplicate everything once more so scrollLeft can wrap by exactly one "loop" width. */
      this.loop = this.track.scrollWidth;
      for (const card of [...this.track.children]) {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        clone.removeAttribute('data-shopify-editor-block');
        this.track.append(clone);
      }

      this.speed = Math.max(Number(this.dataset.speed) || 24, 4);
      this.velocity = 0;
      this.paused = false;
      this.position = this.track.scrollLeft;
      const pause = () => { this.paused = true; clearTimeout(this.resumeTimer); };
      const resumeSoon = () => { clearTimeout(this.resumeTimer); this.resumeTimer = setTimeout(() => { this.paused = false; this.position = this.track.scrollLeft; }, 2200); };
      for (const type of ['pointerdown', 'wheel', 'touchstart', 'focusin']) this.track.addEventListener(type, pause, { passive: true, signal });
      for (const type of ['pointerup', 'pointercancel', 'touchend', 'focusout', 'wheel']) this.track.addEventListener(type, resumeSoon, { passive: true, signal });
      this.track.addEventListener('mouseenter', pause, { signal });
      this.track.addEventListener('mouseleave', resumeSoon, { signal });
      this.track.addEventListener('scroll', () => this.wrap(), { passive: true, signal });

      /* Mouse drag on desktop (touch scrolls natively). */
      this.track.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        const startX = event.clientX;
        const startLeft = this.track.scrollLeft;
        this.track.classList.add('is-dragging');
        const move = (e) => { this.track.scrollLeft = startLeft - (e.clientX - startX); };
        const up = () => { this.track.classList.remove('is-dragging'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); resumeSoon(); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }, { signal });

      document.addEventListener('shopify:block:select', (event) => {
        if (this.contains(event.target)) { pause(); event.target.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      }, { signal });
      document.addEventListener('shopify:block:deselect', resumeSoon, { signal });

      this.visible = false;
      this.io = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; if (this.visible) this.start(); });
      this.io.observe(this);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.start(); }, { signal });
    }
    wrap() {
      if (!this.loop) return;
      if (this.track.scrollLeft >= this.loop) { this.track.scrollLeft -= this.loop; this.position -= this.loop; }
      else if (this.track.scrollLeft <= 0 && this.paused) { this.track.scrollLeft += this.loop; this.position += this.loop; }
    }
    start() {
      if (this.frame) return;
      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!this.visible || document.hidden || !this.isConnected) { this.frame = null; return; }
        const target = this.paused ? 0 : this.speed;
        this.velocity += (target - this.velocity) * Math.min(dt * 3, 1);
        if (!this.paused && this.velocity > 0.01) {
          this.position += this.velocity * dt;
          this.track.scrollLeft = this.position;
          this.wrap();
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    }
    disconnectedCallback() {
      this.controller?.abort();
      this.io?.disconnect();
      clearTimeout(this.resumeTimer);
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  });
}

/* Gentle one-time entrance for [data-reveal] blocks. Content is visible without JS, in the Theme Editor
   and with reduced motion; the hidden start state only applies once this script has run. */
(() => {
  const root = document.documentElement;
  if (root.classList.contains('shopify-design-mode') || !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('rs-reveal-ready');
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-revealed');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  const observe = () => document.querySelectorAll('[data-reveal]:not(.is-revealed)').forEach((el) => io.observe(el));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe);
  else observe();
})();

/* Buttons marked [data-roselle-buy] submit the hero's native Shopify product form (same variant, quantity
   and cart flow as the main button). Without JS, or when that form can't be used, they keep their link. */
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-roselle-buy]');
  if (!trigger) return;
  const form = document.querySelector('roselle-purchase form');
  const button = form?.querySelector('button[name="add"]');
  if (!form || !button || button.disabled) return;
  event.preventDefault();
  if (form.requestSubmit) form.requestSubmit(button);
  else button.click();
});
