import "./style.css";

/**
 * @typedef {object} CometMarqueeOptions
 * @property {number} [speed=50] - Scrolling speed in pixels per second.
 * @property {number} [gap] - Space between items in pixels. Auto-detected from CSS if not specified.
 * @property {boolean} [pauseOnHover=false] - Pause marquee on mouse hover.
 * @property {boolean} [pauseOnClick=false] - Pause/resume marquee on click, resume on click outside container.
 * @property {boolean} [adaptivePause=false] - Automatically use hover behavior on desktop (≥1024px) and click behavior on mobile (<1024px).
 * @property {boolean} [reverse=false] - Reverse scrolling direction (right to left becomes left to right).
 * @property {boolean|number} [initialShift=false] - Initial content offset: `true` shifts by container width, number shifts by specified pixels.
 * @property {boolean} [pauseOnInvisible=false] - Pause animation when marquee is not visible in viewport (uses IntersectionObserver).
 * @property {boolean} [syncPause=false] - Synchronize pause/resume across all CometMarquee instances on the page.
 * @property {number} [repeatCount=3] - Number of content repetitions for seamless scrolling. Increase for short content, decrease for performance with many items.
 * @property {boolean} [develop=false] - Enable debug console logging for all events.
 * @property {boolean} [forceAnimation=false] - Force animation even when content fits within container width.
 * @property {number} [forceAnimationWidth=2] - Width multiplier (relative to window width) used for forced animation calculations.
 * @property {boolean|number} [fadeEdges=false] - Enables fade blurring at the edges. If true, then it will always blur, if for example 1900, then it will blur starting from 1900px (for cases when you need to blur at high resolutions).
 */

/**
 * Global array to track all CometMarquee instances for synchronization.
 * @type {CometMarqueeInstance[]}
 */
if (!window.__allCometMarqueeInstances) window.__allCometMarqueeInstances = [];

/**
 * Represents the main CometMarquee class that manages multiple marquee instances.
 */
class CometMarquee {
  /**
   * Creates an instance of CometMarquee.
   * @param {string|HTMLElement|NodeList|HTMLElement[]} selector - The CSS selector, HTMLElement, NodeList, or array of HTMLElements for the marquee containers.
   * @param {CometMarqueeOptions} [options={}] - Configuration options for the marquee.
   */
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

    /**
     * Array of CometMarqueeInstance objects managed by this CometMarquee.
     * @type {CometMarqueeInstance[]}
     */
    this.instances = this.containers.map((container, idx) =>
        new CometMarqueeInstance(container, options, idx)
    );
  }

  /**
   * Starts the animation for all managed marquee instances.
   */
  start() { this.instances.forEach(i => i.startAnimation()); }

  /**
   * Stops the animation completely for all managed marquee instances.
   */
  stop() { this.instances.forEach(i => i.stop()); }

  /**
   * Pauses the animation for all managed marquee instances.
   */
  pause() { this.instances.forEach(i => i.pause()); }

  /**
   * Resumes the animation for all managed marquee instances.
   */
  resume() { this.instances.forEach(i => i.resume()); }

  /**
   * Refreshes (recalculates dimensions, rebuilds clones, and restarts animation)
   * all managed marquee instances.
   */
  refresh() { this.instances.forEach(i => i.refresh()); }

  /**
   * Adds a new item to all managed marquee instances.
   * @param {string} html - The HTML string of the new item.
   */
  addItem(html) { this.instances.forEach(i => i.addItem(html)); }

  /**
   * Removes the last original item from all managed marquee instances.
   */
  removeItem() { this.instances.forEach(i => i.removeItem()); }
}

/**
 * Represents a single instance of a CometMarquee.
 */
class CometMarqueeInstance {
  /**
   * Creates an instance of CometMarqueeInstance.
   * @param {HTMLElement} container - The DOM element that serves as the marquee container.
   * @param {CometMarqueeOptions} [options={}] - Configuration options for this marquee instance.
   * @param {number} [idx=0] - The index of this instance in a multi-instance setup.
   */
  constructor(container, options = {}, idx = 0) {
    /**
     * The DOM element that serves as the marquee container.
     * @type {HTMLElement}
     */
    this.container = container;
    /**
     * The DOM element containing the marquee content.
     * @type {HTMLElement}
     */
    this.content = container.querySelector('.comet-marquee-content');
    /**
     * Array of original marquee items (excluding clones).
     * @type {HTMLElement[]}
     */
    this.items = Array.from(this.content.children);

    const cs = getComputedStyle(this.content);
    const parsedGap = parseFloat(cs.gap || cs.columnGap || '0');

    /**
     * Configuration options for this marquee instance.
     * @type {CometMarqueeOptions}
     */
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
      forceAnimationWidth: options.forceAnimationWidth ?? 2,
      fadeEdges: options.fadeEdges ?? false
    };

    window.__allCometMarqueeInstances.push(this);

    /** @type {boolean} */
    this.isAnimating = false;
    /** @type {boolean} */
    this.isPaused = false;
    /** @type {number|null} */
    this.animationId = null;
    /** @type {number} */
    this.currentTranslate = 0;
    /** @type {number} */
    this.contentWidth = 0;
    /** @type {number} */
    this.containerWidth = 0;
    /** @type {DOMHighResTimeStamp} */
    this.lastTime = 0;
    /** @type {number} */
    this.idx = idx;
    /** @type {IntersectionObserver|null} */
    this.io = null;
    /** @type {ResizeObserver|null} */
    this.ro = null;
    /** @type {Function|null} */
    this._hoverPause = null;
    /** @type {Function|null} */
    this._hoverResume = null;
    /** @type {Function|null} */
    this._clickToggle = null;
    /** @type {Function|null} */
    this._documentClick = null;
    /** @type {Function|null} */
    this._resizeHandler = null;
    /** @type {Function|null} */
    this._fadeEdgesResizeHandler = null;
    /** @type {Function|null} */
    this._visibilityHandler = null; // This was not used, but added for completeness if it were.
    /** @type {Function|null} */
    this._motionChangeHandler = null;
    /** @type {boolean} */
    this.forceAnimationEnabled = false;

    // Added Logic: track previous container width to avoid infinite loops
    this.lastContainerRectWidth = 0;
    this.refreshTimeout = null;

    this.init();
    this.bindEvents();
  }

  /**
   * Dispatches a custom event on the marquee container.
   * @param {string} eventName - The name of the event to dispatch (e.g., 'animation-started').
   * @param {object} [detail={}] - Custom detail object to pass with the event.
   */
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

  /**
   * Calculates the total width of the original content items, including gaps.
   * @returns {number} The total width of the content.
   */
  getTotalWidth() {
    const widths = this.items.map(el => el.getBoundingClientRect().width);
    return widths.length ? widths.reduce((a, b) => a + b, 0) + this.options.gap * (this.items.length - 1) : 0;
  }

  /**
   * Calculates the container and content dimensions and determines if animation is needed.
   * Dispatches 'dimensions-calculated' and 'force-animation-enabled' events.
   */
  calculateDimensions() {
    this.containerWidth = this.container.getBoundingClientRect().width;
    this.contentWidth = this.getTotalWidth();
    // Use Math.ceil or tolerance to avoid float precision issues during loops
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

  /**
   * Calculates the number of clones needed for force animation based on target width.
   * Dispatches 'force-animation-calculated' event.
   * @returns {number} The number of clones needed.
   */
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

  /**
   * Applies or removes fade edge styling based on `fadeEdges` option and window width.
   * Dispatches 'fade-edges-applied' or 'fade-edges-removed' events.
   */
  applyFadeEdges() {
    const { fadeEdges } = this.options;

    if (fadeEdges === false) {
      this.container.classList.remove('is-fade-edges');
      this.dispatchEvent('fade-edges-removed');
      return;
    }

    if (fadeEdges === true) {
      this.container.classList.add('is-fade-edges');
      this.dispatchEvent('fade-edges-applied', { condition: 'always' });
      return;
    }

    if (typeof fadeEdges === 'number') {
      const currentWidth = window.innerWidth;
      if (currentWidth >= fadeEdges) {
        this.container.classList.add('is-fade-edges');
        this.dispatchEvent('fade-edges-applied', {
          condition: 'breakpoint',
          breakpoint: fadeEdges,
          currentWidth
        });
      } else {
        this.container.classList.remove('is-fade-edges');
        this.dispatchEvent('fade-edges-removed', {
          condition: 'breakpoint',
          breakpoint: fadeEdges,
          currentWidth
        });
      }
    }
  }

  /**
   * Sets up the content for animation, including cloning items and setting initial translation.
   * Dispatches 'clones-creating', 'clones-created', 'animation-not-needed', and 'content-setup' events.
   */
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

  /**
   * Initializes the marquee instance by calculating dimensions, setting up content, applying fade edges, and starting animation.
   * Dispatches 'init-start' and 'init-complete' events.
   */
  init() {
    this.dispatchEvent('init-start');

    this.container.classList.add('is-init-comet-marquee');

    this.calculateDimensions();
    this.setupContent();
    this.applyFadeEdges();
    this.startAnimation();

    this.dispatchEvent('init-complete');
  }

  /**
   * Starts or restarts the marquee animation.
   * Dispatches 'animation-skipped' and 'animation-started' events.
   */
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

  /**
   * The animation loop function, called by requestAnimationFrame.
   * @param {DOMHighResTimeStamp} currentTime - The current time provided by requestAnimationFrame.
   * @private
   */
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

  /**
   * Pauses the marquee animation. If `syncPause` is enabled, pauses all other instances.
   * Dispatches 'animation-paused' event.
   */
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

  /**
   * Resumes the marquee animation. If `syncPause` is enabled, resumes all other instances.
   * Dispatches 'animation-resumed' event.
   */
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

  /**
   * Stops the marquee animation completely and cancels animation frames.
   * Dispatches 'animation-stopped' event.
   */
  stop() {
    const wasAnimating = this.isAnimating;
    this.isAnimating = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;

    if (wasAnimating) {
      this.dispatchEvent('animation-stopped');
    }
  }

  /**
   * Recalculates dimensions, rebuilds clones, and restarts the animation.
   * Dispatches 'refresh-start' and 'refresh-complete' events.
   */
  refresh() {
    this.dispatchEvent('refresh-start');

    this.stop();
    this.items = Array.from(this.content.children).filter(c => !c.classList.contains('comet-marquee-clone'));
    this.init();

    this.dispatchEvent('refresh-complete');
  }

  /**
   * Binds all necessary event listeners for interaction, visibility, and responsiveness.
   * Dispatches 'events-bound' event.
   * @private
   */
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

    this.ro = new ResizeObserver((entries) => {
      // FIX: Check if width actually changed to prevent infinite loop
      // Because refresh() changes DOM -> potential small size change -> RO loop
      let hasWidthChanged = false;

      for (const entry of entries) {
        // Use Math.round to ignore sub-pixel differences that can cause loops
        const currentWidth = Math.round(entry.contentRect.width);

        // Initialize lastContainerRectWidth if it's 0 (first run)
        if (this.lastContainerRectWidth === 0) {
          this.lastContainerRectWidth = currentWidth;
          // Don't return here, proceed to logic but maybe skip refresh?
          // Actually first run usually needs setup.
        } else if (currentWidth !== this.lastContainerRectWidth) {
          this.lastContainerRectWidth = currentWidth;
          hasWidthChanged = true;
        }
      }

      if (!hasWidthChanged) return;

      this.dispatchEvent('container-resized');
      this.applyFadeEdges();

      // Debounce refresh
      if (this._refreshTimeout) clearTimeout(this._refreshTimeout);
      this._refreshTimeout = setTimeout(() => {
        this.refresh();
      }, 100);
    });
    this.ro.observe(this.container);

    window.addEventListener('orientationchange', () => {
      this.dispatchEvent('orientation-change');
      setTimeout(() => {
        this.applyFadeEdges();
        this.refresh();
      }, 100);
    });

    this._fadeEdgesResizeHandler = () => {
      this.applyFadeEdges();
    };
    window.addEventListener('resize', this._fadeEdgesResizeHandler);

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

  /**
   * Adds a new item to the marquee.
   * @param {string} itemHtml - The HTML string of the item to add.
   * Dispatches 'item-adding' and 'item-added' events.
   */
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

  /**
   * Removes the last original item from the marquee.
   * Dispatches 'item-removing' and 'item-removed' events.
   */
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

  /**
   * Destroys the marquee instance, cleaning up all event listeners, observers, and animation frames.
   * Dispatches 'destroy-start' and 'destroy-complete' events.
   */
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
    window.removeEventListener('resize', this._fadeEdgesResizeHandler);
    document.removeEventListener('visibilitychange', this._visibilityHandler);

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.removeEventListener) {
      mql.removeEventListener('change', this._motionChangeHandler);
    }

    this.dispatchEvent('destroy-complete');
  }
}

export { CometMarquee };
export default CometMarquee;

if (typeof window !== 'undefined') {
  if (window.cometMarquee && window.cometMarquee.CometMarquee) {
    window.CometMarquee = window.cometMarquee.CometMarquee;
  } else {
    window.CometMarquee = CometMarquee;
  }
}