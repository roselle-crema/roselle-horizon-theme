/* Progressive enhancement: Shopify's native form remains usable without JavaScript. */
if (!customElements.get('roselle-purchase')) {
  customElements.define('roselle-purchase', class extends HTMLElement {
    connectedCallback() {
      this.controller = new AbortController();
      this.selector = this.querySelector('select[name="id"]');
      this.quantity = this.querySelector('input[name="quantity"]');
      this.sticky = document.querySelector(`[data-roselle-sticky="${this.dataset.formId}"]`);
      this.selector?.addEventListener('change', () => this.updateVariant(), { signal: this.controller.signal });
      this.updateVariant();
      if (this.sticky && 'IntersectionObserver' in window) {
        document.body.classList.add('rs-has-sticky');
        this.observer = new IntersectionObserver(([entry]) => {
          this.sticky.hidden = entry.isIntersecting || entry.boundingClientRect.bottom > 0;
        }, { threshold: 0 });
        this.observer.observe(this);
      }
    }
    updateVariant() {
      const option = this.selector?.selectedOptions[0];
      if (!option) return;
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
