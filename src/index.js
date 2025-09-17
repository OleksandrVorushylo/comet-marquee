import "./style.css";

class CometMarquee {
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
      syncPause: !!options.syncPause,
      repeatCount: options.repeatCount ?? 3,
      develop: !!options.develop,
      forceAnimation: !!options.forceAnimation,
      forceAnimationWidth: options.forceAnimationWidth ?? 2
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

  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(`comet-marquee:${eventName}`, {
      detail: {
        instance: this,
        container: this.container,
        ...detail
      },
      bubbles: true,
      cancelable: true
    });
    this.container.dispatchEvent(event);

    if (this.options.develop) {
      console.log(`[CometMarquee] ${eventName}`, detail);
    }
  }

  getTotalWidth() {
    const widths = this.items.map(el => el.getBoundingClientRect().width);
    return widths.length ? widths.reduce((a, b) => a + b, 0) + this.options.gap * (this.items.length - 1) : 0;
  }

  calculateDimensions() {
    this.containerWidth = this.container.getBoundingClientRect().width;
    this.contentWidth = this.getTotalWidth();
    this.shouldAnimate = this.contentWidth > this.containerWidth + 1;

    if (this.options.forceAnimation && !this.shouldAnimate) {
      this.shouldAnimate = true;
      this.forceAnimationEnabled = true;

      this.dispatchEvent('force-animation-enabled', {
        originalContentWidth: this.contentWidth,
        containerWidth: this.containerWidth
      });
    } else {
      this.forceAnimationEnabled = false;
    }

    this.dispatchEvent('dimensions-calculated', {
      containerWidth: this.containerWidth,
      contentWidth: this.contentWidth,
      shouldAnimate: this.shouldAnimate,
      forceAnimationEnabled: this.forceAnimationEnabled
    });
  }

  calculateForceAnimationClones() {
    if (!this.forceAnimationEnabled || !this.items.length) return 0;

    const targetWidth = window.innerWidth * this.options.forceAnimationWidth;

    const singleSetWidth = this.contentWidth;

    const setsNeeded = Math.ceil(targetWidth / singleSetWidth);

    const clonesNeeded = Math.max(0, (setsNeeded - 1) * this.items.length);

    this.dispatchEvent('force-animation-calculated', {
      targetWidth,
      singleSetWidth,
      setsNeeded,
      clonesNeeded
    });

    return clonesNeeded;
  }

  setupContent() {
    this.content.style.willChange = 'transform';

    const existingClones = this.content.querySelectorAll('.comet-marquee-clone');
    existingClones.forEach(n => n.remove());

    if (!this.shouldAnimate) {
      this.content.style.transform = 'translate3d(0,0,0)';
      this.content.style.width = 'auto';
      this.currentTranslate = 0;

      this.dispatchEvent('animation-not-needed');
      return;
    }

    this.dispatchEvent('clones-creating');

    let repeatCount;
    let clonedItems = [];

    if (this.forceAnimationEnabled) {
      const forceClonesCount = this.calculateForceAnimationClones();
      repeatCount = Math.ceil(forceClonesCount / this.items.length);

      for (let i = 0; i < forceClonesCount; i++) {
        const originalIndex = i % this.items.length;
        const clone = this.items[originalIndex].cloneNode(true);
        clone.classList.add('comet-marquee-clone');
        this.content.appendChild(clone);
        clonedItems.push(clone);
      }
    } else {
      repeatCount = Math.max(this.options.repeatCount, Math.ceil((this.containerWidth * this.options.repeatCount) / this.contentWidth));

      for (let r = 0; r < repeatCount; r++) {
        this.items.forEach(item => {
          const clone = item.cloneNode(true);
          clone.classList.add('comet-marquee-clone');
          this.content.appendChild(clone);
          clonedItems.push(clone);
        });
      }
    }

    this.dispatchEvent('clones-created', {
      cloneCount: clonedItems.length,
      repeatCount,
      clonedItems,
      forceAnimationEnabled: this.forceAnimationEnabled
    });

    const totalItems = this.items.length + clonedItems.length;
    const allElements = [...this.items, ...clonedItems];
    const totalWidthWithClones = allElements.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) +
        this.options.gap * (totalItems - 1);

    this.content.style.width = `${totalWidthWithClones}px`;

    let shift = 0;
    if (this.options.initialShift === true) {
      shift = this.containerWidth;
    } else if (typeof this.options.initialShift === 'number') {
      shift = this.options.initialShift;
    }

    if (this.options.reverse) {
      if (this.forceAnimationEnabled) {
        this.currentTranslate = -(clonedItems.length / this.items.length * this.contentWidth) + shift;
      } else {
        this.currentTranslate = -(this.contentWidth * repeatCount) + shift;
      }
    } else {
      this.currentTranslate = -shift;
    }
    this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;

    this.dispatchEvent('content-setup', {
      totalWidth: this.content.style.width,
      initialTranslate: this.currentTranslate,
      forceAnimationEnabled: this.forceAnimationEnabled
    });
  }

  init() {
    this.dispatchEvent('init-start');

    this.calculateDimensions();
    this.setupContent();
    this.startAnimation();

    this.dispatchEvent('init-complete');
  }

  startAnimation() {
    if (!this.shouldAnimate) {
      this.dispatchEvent('animation-skipped');
      return;
    }

    this.isAnimating = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    cancelAnimationFrame(this.animationId);

    this.dispatchEvent('animation-started');

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
          this.dispatchEvent('animation-cycle', { direction: 'reverse' });
        }
      } else {
        this.currentTranslate -= this.options.speed * dt;
        if (this.currentTranslate <= -totalContentWidth) {
          this.currentTranslate += totalContentWidth;
          this.dispatchEvent('animation-cycle', { direction: 'forward' });
        }
      }

      this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;
    }

    this.animationId = requestAnimationFrame(this.animate);
  }

  pause() {
    const wasPaused = this.isPaused;
    this.isPaused = true;

    if (!wasPaused) {
      this.dispatchEvent('animation-paused');
    }

    if (this.options.syncPause && window.__allCometMarqueeInstances) {
      window.__allCometMarqueeInstances.forEach(inst => {
        if (inst !== this) {
          inst.isPaused = true;
        }
      });
    }
  }

  resume() {
    this.calculateDimensions();
    if (!this.shouldAnimate) {
      this.stop();
      return;
    }

    const wasPaused = this.isPaused;
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      if (!this.isAnimating) {
        this.isAnimating = true;
        this.startAnimation();
      } else if (wasPaused) {
        this.dispatchEvent('animation-resumed');
      }
    }

    if (this.options.syncPause && window.__allCometMarqueeInstances) {
      window.__allCometMarqueeInstances.forEach(inst => {
        if (inst !== this && inst.isPaused) {
          inst.calculateDimensions();
          if (inst.shouldAnimate) {
            inst.isPaused = false;
            inst.lastTime = performance.now();
            if (!inst.isAnimating) {
              inst.isAnimating = true;
              inst.startAnimation();
            }
          }
        }
      });
    }
  }

  stop() {
    const wasAnimating = this.isAnimating;
    this.isAnimating = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;

    if (wasAnimating) {
      this.dispatchEvent('animation-stopped');
    }
  }

  refresh() {
    this.dispatchEvent('refresh-start');

    this.stop();
    this.items = Array.from(this.content.children).filter(c => !c.classList.contains('comet-marquee-clone'));
    this.init();

    this.dispatchEvent('refresh-complete');
  }

  bindEvents() {
    this.dispatchEvent('events-bound');

    const setupAdaptivePause = () => {
      const desktop = window.innerWidth >= 1024;
      this.container.removeEventListener('mouseenter', this._hoverPause);
      this.container.removeEventListener('mouseleave', this._hoverResume);
      this.container.removeEventListener('click', this._clickToggle);
      document.removeEventListener('click', this._documentClick);

      if (desktop) {
        this._hoverPause = () => {
          this.dispatchEvent('hover-pause');
          this.pause();
        };
        this._hoverResume = () => {
          this.dispatchEvent('hover-resume');
          this.resume();
        };
        this.container.addEventListener('mouseenter', this._hoverPause);
        this.container.addEventListener('mouseleave', this._hoverResume);
      } else {
        this._clickToggle = (e) => {
          e.stopPropagation();
          if (this.isPaused) {
            this.dispatchEvent('click-resume');
            this.resume();
          } else {
            this.dispatchEvent('click-pause');
            this.pause();
          }
        };
        this._documentClick = (e) => {
          if (!this.container.contains(e.target) && this.isPaused) {
            this.dispatchEvent('outside-click-resume');
            this.resume();
          }
        };
        this.container.addEventListener('click', this._clickToggle);
        document.addEventListener('click', this._documentClick);
      }
    };

    if (this.options.adaptivePause) {
      setupAdaptivePause();
      this._resizeHandler = () => {
        this.dispatchEvent('adaptive-pause-resize');
        setupAdaptivePause();
      };
      window.addEventListener('resize', this._resizeHandler);
    } else {
      if (this.options.pauseOnHover) {
        this._hoverPause = () => {
          this.dispatchEvent('hover-pause');
          this.pause();
        };
        this._hoverResume = () => {
          this.dispatchEvent('hover-resume');
          this.resume();
        };
        this.container.addEventListener('mouseenter', this._hoverPause);
        this.container.addEventListener('mouseleave', this._hoverResume);
      }
      if (this.options.pauseOnClick) {
        this._clickToggle = (e) => {
          e.stopPropagation();
          if (this.isPaused) {
            this.dispatchEvent('click-resume');
            this.resume();
          } else {
            this.dispatchEvent('click-pause');
            this.pause();
          }
        };
        this._documentClick = (e) => {
          if (!this.container.contains(e.target) && this.isPaused) {
            this.dispatchEvent('outside-click-resume');
            this.resume();
          }
        };
        this.container.addEventListener('click', this._clickToggle);
        document.addEventListener('click', this._documentClick);
      }
    }

    if (this.options.pauseOnInvisible) {
      this.io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.dispatchEvent('visibility-resume');
            this.resume();
          } else {
            this.dispatchEvent('visibility-pause');
            this.pause();
          }
        });
      }, { threshold: 0.1, rootMargin: '0px' });
      this.io.observe(this.container);
    }

    this.ro = new ResizeObserver(() => {
      this.dispatchEvent('container-resized');
      this.refresh();
    });
    this.ro.observe(this.container);

    window.addEventListener('orientationchange', () => {
      this.dispatchEvent('orientation-change');
      setTimeout(() => this.refresh(), 100);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.dispatchEvent('document-visible');
        this.resume();
      } else if (this.options.pauseOnInvisible) {
        this.dispatchEvent('document-hidden');
        this.pause();
      }
    });

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._motionChangeHandler = () => {
      if (mql.matches) {
        this.dispatchEvent('reduced-motion-on');
        this.pause();
      } else {
        this.dispatchEvent('reduced-motion-off');
        this.resume();
      }
    };
    if (mql.matches) this.pause();
    if (mql.addEventListener) {
      mql.addEventListener('change', this._motionChangeHandler);
    }
  }

  addItem(itemHtml) {
    this.dispatchEvent('item-adding', { itemHtml });

    const temp = document.createElement('div');
    temp.innerHTML = itemHtml;
    const newItem = temp.firstElementChild;

    const firstClone = this.content.querySelector('.comet-marquee-clone');
    if (firstClone) this.content.insertBefore(newItem, firstClone);
    else this.content.appendChild(newItem);

    this.refresh();

    this.dispatchEvent('item-added', { newItem });
  }

  removeItem() {
    const originals = Array.from(this.content.children).filter(c => !c.classList.contains('comet-marquee-clone'));
    if (originals.length > 0) {
      const removedItem = originals[originals.length - 1];

      this.dispatchEvent('item-removing', { removedItem });

      removedItem.remove();
      this.refresh();

      this.dispatchEvent('item-removed');
    }
  }

  destroy() {
    this.dispatchEvent('destroy-start');

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
    document.removeEventListener('visibilitychange', this._visibilityHandler);

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.removeEventListener) {
      mql.removeEventListener('change', this._motionChangeHandler);
    }

    this.dispatchEvent('destroy-complete');
  }
}

export default CometMarquee;

if (typeof window !== 'undefined') {
  if (window.cometMarquee && window.cometMarquee.CometMarquee) {
    window.CometMarquee = window.cometMarquee.CometMarquee;
  } else {
    window.CometMarquee = CometMarquee;
  }
}