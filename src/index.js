import "./style.css";

export class CometMarquee {
  constructor(selector, options = {}) {
    if (typeof selector === 'string') {
      this.containers = Array.from(document.querySelectorAll(selector));
    } else if (selector instanceof HTMLElement) {
      this.containers = [selector];
    } else if (selector instanceof NodeList || Array.isArray(selector)) {
      this.containers = Array.from(selector);
    } else {
      throw new Error('CometMarquee: invalid selector');
    }

    this.instances = this.containers.map((container, idx) =>
        new CometMarqueeInstance(container, options, idx)
    );
  }

  start() { this.instances.forEach(i => i.startAnimation()); }
  stop() { this.instances.forEach(i => i.stop()); }
  pause() { this.instances.forEach(i => i.pause()); }
  resume() { this.instances.forEach(i => i.resume()); }
  refresh() { this.instances.forEach(i => i.refresh()); }
  addItem(html) { this.instances.forEach(i => i.addItem(html)); }
  removeItem() { this.instances.forEach(i => i.removeItem()); }
}

class CometMarqueeInstance {
  constructor(container, options = {}, idx = 0) {
    this.container = container;
    this.content = container.querySelector('.comet-marquee-content');
    this.items = Array.from(this.content.children);

    const cs = getComputedStyle(this.content);
    const parsedGap = parseFloat(cs.gap || cs.columnGap || '0');

    this.options = {
      speed: options.speed ?? 50,
      gap: options.gap ?? (Number.isFinite(parsedGap) ? parsedGap : 0),
      pauseOnHover: !!options.pauseOnHover,
      pauseOnClick: !!options.pauseOnClick,
      adaptivePause: !!options.adaptivePause,
      reverse: !!options.reverse,
      initialShift: options.initialShift ?? false,
      pauseOnInvisible: !!options.pauseOnInvisible,
      syncPause: !!options.syncPause
    };

    if (!window.__allCometMarqueeInstances) window.__allCometMarqueeInstances = [];
    window.__allCometMarqueeInstances.push(this);

    this.isAnimating = false;
    this.isPaused = false;
    this.animationId = null;
    this.currentTranslate = 0;
    this.contentWidth = 0;
    this.containerWidth = 0;
    this.lastTime = 0;
    this.idx = idx;

    this.init();
    this.bindEvents();
  }

  getTotalWidth() {
    const widths = this.items.map(el => el.getBoundingClientRect().width);
    return widths.length ? widths.reduce((a, b) => a + b, 0) + this.options.gap * (this.items.length - 1) : 0;
  }

  calculateDimensions() {
    this.containerWidth = this.container.getBoundingClientRect().width;
    this.contentWidth = this.getTotalWidth();
    this.shouldAnimate = this.contentWidth > this.containerWidth + 1;
  }

  setupContent() {
    this.content.style.willChange = 'transform';

    this.content.querySelectorAll('.comet-marquee-clone').forEach(n => n.remove());

    if (!this.shouldAnimate) {
      this.content.style.transform = 'translate3d(0,0,0)';
      this.content.style.width = 'auto';
      this.currentTranslate = 0;
      return;
    }

    const repeatCount = Math.max(2, Math.ceil((this.containerWidth * 2) / this.contentWidth));
    for (let r = 0; r < repeatCount; r++) {
      this.items.forEach(item => {
        const clone = item.cloneNode(true);
        clone.classList.add('comet-marquee-clone');
        this.content.appendChild(clone);
      });
    }

    const totalItems = this.items.length * (repeatCount + 1);
    this.content.style.width = `${this.contentWidth * (repeatCount + 1) + this.options.gap * (totalItems - 1)}px`;

    let shift = 0;
    if (this.options.initialShift === true) {
      shift = this.containerWidth;
    } else if (typeof this.options.initialShift === 'number') {
      shift = this.options.initialShift;
    }

    if (this.options.reverse) {
      this.currentTranslate = -(this.contentWidth * repeatCount) + shift;
    } else {
      this.currentTranslate = -shift;
    }
    this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;
  }

  init() {
    this.calculateDimensions();
    this.setupContent();
    this.startAnimation();
  }

  startAnimation() {
    if (!this.shouldAnimate) return;
    this.isAnimating = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    cancelAnimationFrame(this.animationId);
    this.animate();
  }

  animate = (currentTime) => {
    if (!this.isAnimating) return;
    if (!currentTime) currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.isPaused) {
      const totalContentWidth = this.content.getBoundingClientRect().width;

      if (this.options.reverse) {
        this.currentTranslate += this.options.speed * dt;
        if (this.currentTranslate >= 0) {
          this.currentTranslate -= totalContentWidth;
        }
      } else {
        this.currentTranslate -= this.options.speed * dt;
        if (this.currentTranslate <= -totalContentWidth) {
          this.currentTranslate += totalContentWidth;
        }
      }

      this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;
    }

    this.animationId = requestAnimationFrame(this.animate);
  }

  pause() {
    this.isPaused = true;
    if (this.options.syncPause && window.__allCometMarqueeInstances) {
      window.__allCometMarqueeInstances.forEach(inst => {
        if (inst !== this) {
          inst.isPaused = true;
        }
      });
    }
  }

  resume() {
    if (!this.shouldAnimate) return;
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      if (!this.isAnimating) {
        this.isAnimating = true;
        this.animate();
      }
    }

    if (this.options.syncPause && window.__allCometMarqueeInstances) {
      window.__allCometMarqueeInstances.forEach(inst => {
        if (inst !== this && inst.isPaused) {
          inst.isPaused = false;
          inst.lastTime = performance.now();
          if (!inst.isAnimating) {
            inst.isAnimating = true;
            inst.animate();
          }
        }
      });
    }
  }

  stop() {
    this.isAnimating = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  refresh() {
    this.stop();
    this.items = Array.from(this.content.children).filter(c => !c.classList.contains('comet-marquee-clone'));
    this.init();
  }

  bindEvents() {
    const setupAdaptivePause = () => {
      const desktop = window.innerWidth >= 1024;
      this.container.removeEventListener('mouseenter', this._hoverPause);
      this.container.removeEventListener('mouseleave', this._hoverResume);
      this.container.removeEventListener('click', this._clickToggle);
      document.removeEventListener('click', this._documentClick);

      if (desktop) {
        this._hoverPause = () => this.pause();
        this._hoverResume = () => this.resume();
        this.container.addEventListener('mouseenter', this._hoverPause);
        this.container.addEventListener('mouseleave', this._hoverResume);
      } else {
        this._clickToggle = (e) => {
          e.stopPropagation();
          this.isPaused ? this.resume() : this.pause();
        };
        this._documentClick = (e) => {
          if (!this.container.contains(e.target) && this.isPaused) this.resume();
        };
        this.container.addEventListener('click', this._clickToggle);
        document.addEventListener('click', this._documentClick);
      }
    };

    if (this.options.adaptivePause) {
      setupAdaptivePause();
      this._resizeHandler = () => setupAdaptivePause();
      window.addEventListener('resize', this._resizeHandler);
    } else {
      if (this.options.pauseOnHover) {
        this._hoverPause = () => this.pause();
        this._hoverResume = () => this.resume();
        this.container.addEventListener('mouseenter', this._hoverPause);
        this.container.addEventListener('mouseleave', this._hoverResume);
      }
      if (this.options.pauseOnClick) {
        this._clickToggle = (e) => {
          e.stopPropagation();
          this.isPaused ? this.resume() : this.pause();
        };
        this._documentClick = (e) => {
          if (!this.container.contains(e.target) && this.isPaused) this.resume();
        };
        this.container.addEventListener('click', this._clickToggle);
        document.addEventListener('click', this._documentClick);
      }
    }

    if (this.options.pauseOnInvisible) {
      this.io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.resume();
          } else {
            this.pause();
          }
        });
      }, { threshold: 0.1 });
      this.io.observe(this.container);
    }

    this.ro = new ResizeObserver(() => this.refresh());
    this.ro.observe(this.container);

    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.refresh(), 100);
    });

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._motionChangeHandler = () => mql.matches ? this.pause() : this.resume();
    if (mql.matches) this.pause();
    if (mql.addEventListener) {
      mql.addEventListener('change', this._motionChangeHandler);
    }
  }

  addItem(itemHtml) {
    const temp = document.createElement('div');
    temp.innerHTML = itemHtml;
    const newItem = temp.firstElementChild;

    const firstClone = this.content.querySelector('.comet-marquee-clone');
    if (firstClone) this.content.insertBefore(newItem, firstClone);
    else this.content.appendChild(newItem);

    this.refresh();
  }

  removeItem() {
    const originals = Array.from(this.content.children).filter(c => !c.classList.contains('comet-marquee-clone'));
    if (originals.length > 0) {
      originals[originals.length - 1].remove();
      this.refresh();
    }
  }

  destroy() {
    this.stop();

    if (window.__allCometMarqueeInstances) {
      const index = window.__allCometMarqueeInstances.indexOf(this);
      if (index > -1) {
        window.__allCometMarqueeInstances.splice(index, 1);
      }
    }

    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();

    this.container.removeEventListener('mouseenter', this._hoverPause);
    this.container.removeEventListener('mouseleave', this._hoverResume);
    this.container.removeEventListener('click', this._clickToggle);
    document.removeEventListener('click', this._documentClick);
    window.removeEventListener('resize', this._resizeHandler);

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.removeEventListener) {
      mql.removeEventListener('change', this._motionChangeHandler);
    }
  }
}