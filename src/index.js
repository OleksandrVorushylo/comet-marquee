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
 * @property {boolean} [fullWidth=false] - Stretches the container to full viewport width (100vw) using negative margins. Useful for marquees that need to span entire viewport regardless of parent container.
 * @property {boolean} [vertical=false] - Enables vertical scrolling mode (top to bottom or bottom to top).
 * @property {number|string} [height] - Container height for vertical mode. Can be number (pixels) or CSS string (e.g., '300px', '50vh'). Defaults to CSS variable --comet-marquee-height (300px).
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

  /**
   * Destroys all managed marquee instances and cleans up resources.
   */
  destroy() { this.instances.forEach(i => i.destroy()); }
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
    this.items = Array.from(this.content.children).filter(c => !c.classList.contains('comet-marquee-clone'));

    /**
     * Prevents double initialization of the same container.
     */
    if (this.container.classList.contains('is-init-comet-marquee')) {
      if (options.develop) console.warn(`[CometMarquee #${idx}] Already initialized. Skipping.`);
      return;
    }

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
      fadeEdges: options.fadeEdges ?? false,
      fullWidth: !!options.fullWidth,
      vertical: !!options.vertical,
      height: options.height ?? null
    };

    /**
     * Axis abstraction for vertical/horizontal scrolling.
     * @type {boolean}
     */
    this.isVertical = this.options.vertical;
    this.axis = this.isVertical ? 'y' : 'x';
    this.sizeProperty = this.isVertical ? 'height' : 'width';

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
    this._visibilityHandler = null;
    /** @type {Function|null} */
    this._motionChangeHandler = null;
    /** @type {boolean} */
    this.forceAnimationEnabled = false;

    /**
     * CRITICAL: Multiple layers of loop prevention.
     * These properties track resize state to prevent infinite loops in ResizeObserver.
     * @type {number}
     */
    this.lastContainerRectWidth = 0;
    this.lastWindowWidth = window.innerWidth;
    this.refreshTimeout = null;
    this.isRefreshing = false;
    this.isInitializing = false;
    this.resizeObserverCallCount = 0;
    this.lastResizeTimestamp = 0;
    this.contentSetup = false;

    /**
     * Properties for fullWidth/fullHeight option support.
     * @type {Function|null}
     */
    this._fullWidthResizeHandler = null;
    this._fullWidthDebounceTimeout = null;
    this._originalContainerStyles = null;

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
      console.log(`[CometMarquee #${this.idx}] ${eventName}`, detail);
    }
  }

  /**
   * Calculates the total size (width or height) of the original content items, including gaps.
   * @returns {number} The total size of the content.
   */
  getTotalSize() {
    const sizes = this.items.map(el => {
      const rect = el.getBoundingClientRect();
      return this.isVertical ? rect.height : rect.width;
    });
    return sizes.length ? sizes.reduce((a, b) => a + b, 0) + this.options.gap * (this.items.length - 1) : 0;
  }

  /**
   * Calculates the container and content dimensions and determines if animation is needed.
   * Dispatches 'dimensions-calculated' and 'force-animation-enabled' events.
   */
  calculateDimensions() {
    const rect = this.container.getBoundingClientRect();

    /**
     * Uses axis-aware properties for vertical/horizontal scrolling.
     */
    this.containerWidth = rect.width;
    this.containerHeight = rect.height;
    this.containerSize = this.isVertical ? rect.height : rect.width;

    this.contentWidth = this.getTotalSize();
    this.contentSize = this.contentWidth;

    /**
     * Safety check: if content has no size, we can't animate properly.
     */
    if (this.contentSize <= 0) {
      this.shouldAnimate = false;
      if (this.options.develop) {
        console.warn(`[CometMarquee #${this.idx}] Content ${this.isVertical ? 'height' : 'width'} is 0. Animation disabled.`);
      }
    } else {
      this.shouldAnimate = this.contentSize > this.containerSize + 1;
    }

    if (this.options.forceAnimation && !this.shouldAnimate && this.contentSize > 0) {
      this.shouldAnimate = true;
      this.forceAnimationEnabled = true;

      this.dispatchEvent('force-animation-enabled', {
        originalContentSize: this.contentSize,
        containerSize: this.containerSize
      });
    } else {
      this.forceAnimationEnabled = false;
    }

    this.dispatchEvent('dimensions-calculated', {
      containerWidth: this.containerWidth,
      containerHeight: this.containerHeight,
      containerSize: this.containerSize,
      contentSize: this.contentSize,
      shouldAnimate: this.shouldAnimate,
      forceAnimationEnabled: this.forceAnimationEnabled,
      isVertical: this.isVertical
    });
  }

  /**
   * Calculates the number of clones needed for force animation based on target width.
   * Uses a MAXIMUM CAP to prevent memory issues.
   * @returns {number} The number of clones needed.
   */
  calculateForceAnimationClones() {
    if (!this.forceAnimationEnabled || !this.items.length) return 0;

    // Use viewport height for vertical, width for horizontal
    const viewportSize = this.isVertical ? window.innerHeight : window.innerWidth;
    const targetSize = viewportSize * this.options.forceAnimationWidth;
    const singleSetSize = this.contentWidth;

    /**
     * Caps the number of sets to prevent infinite cloning.
     * Maximum 20 sets to avoid memory issues.
     */
    const maxSets = 20;
    const setsNeeded = Math.min(
      Math.ceil(targetSize / singleSetSize),
      maxSets
    );

    const clonesNeeded = Math.max(0, (setsNeeded - 1) * this.items.length);

    /**
     * Absolute maximum on clone count (100 clones).
     */
    const maxClones = 100;
    const cappedClones = Math.min(clonesNeeded, maxClones);

    if (cappedClones < clonesNeeded && this.options.develop) {
      console.warn(
        `[CometMarquee #${this.idx}] Clone count capped at ${maxClones} (would be ${clonesNeeded})`
      );
    }

    this.dispatchEvent('force-animation-calculated', {
      targetSize,
      singleSetSize,
      setsNeeded,
      clonesNeeded: cappedClones,
      cappedFromOriginal: clonesNeeded
    });

    return cappedClones;
  }

  /**
   * Applies or removes fade edge styling based on `fadeEdges` option and window width.
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
   */
  setupContent() {
    this.content.style.willChange = 'transform';

    const existingClones = this.content.querySelectorAll('.comet-marquee-clone');
    existingClones.forEach(n => n.remove());

    if (!this.shouldAnimate) {
      this.content.style.transform = 'translate3d(0,0,0)';
      /**
       * Resets size based on axis (height for vertical, width for horizontal).
       */
      if (this.isVertical) {
        this.content.style.height = 'auto';
      } else {
        this.content.style.width = 'auto';
      }
      this.currentTranslate = 0;
      this.contentSetup = false;

      this.dispatchEvent('animation-not-needed');
      return;
    }

    this.contentSetup = true;

    this.dispatchEvent('clones-creating');

    let repeatCount;
    let clonedItems = [];

    if (this.forceAnimationEnabled) {
      const forceClonesCount = this.calculateForceAnimationClones();
      repeatCount = Math.ceil(forceClonesCount / this.items.length);

      /**
       * Uses DocumentFragment for better performance.
       * Single DOM append instead of multiple to minimize reflows.
       */
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < forceClonesCount; i++) {
        const originalIndex = i % this.items.length;
        const clone = this.items[originalIndex].cloneNode(true);
        clone.classList.add('comet-marquee-clone');
        fragment.appendChild(clone);
        clonedItems.push(clone);
      }

      this.content.appendChild(fragment);

    } else {
      /**
       * Uses viewport width for clone count to ensure seamless loop on wide screens.
       */
      const referenceWidth = Math.max(this.containerWidth, window.innerWidth);
      repeatCount = Math.max(
        this.options.repeatCount,
        Math.ceil((referenceWidth * this.options.repeatCount) / this.contentWidth)
      );

      const fragment = document.createDocumentFragment();

      for (let r = 0; r < repeatCount; r++) {
        this.items.forEach(item => {
          const clone = item.cloneNode(true);
          clone.classList.add('comet-marquee-clone');
          fragment.appendChild(clone);
          clonedItems.push(clone);
        });
      }

      this.content.appendChild(fragment);
    }

    /**
     * For reverse animation, prepends clones so content exists to the LEFT of originals.
     * Uses viewport width to ensure clones cover the entire visible area.
     */
    let prependedClones = [];
    if (this.options.reverse) {
      const referenceWidth = Math.max(this.containerWidth, window.innerWidth);
      const prependSets = Math.max(2, Math.ceil(referenceWidth / this.contentWidth) + 1);
      const prependFragment = document.createDocumentFragment();

      for (let r = 0; r < prependSets; r++) {
        this.items.forEach(item => {
          const clone = item.cloneNode(true);
          clone.classList.add('comet-marquee-clone');
          clone.classList.add('comet-marquee-prepend');
          prependFragment.appendChild(clone);
          prependedClones.push(clone);
        });
      }

      this.content.insertBefore(prependFragment, this.content.firstChild);
    }

    this.dispatchEvent('clones-created', {
      cloneCount: clonedItems.length,
      prependedCount: prependedClones.length,
      repeatCount,
      forceAnimationEnabled: this.forceAnimationEnabled
    });

    const allElements = Array.from(this.content.children);
    const totalItems = allElements.length;

    /**
     * Calculates total size based on axis (height for vertical, width for horizontal).
     */
    const totalSizeWithClones = allElements.reduce((sum, el) => {
      const rect = el.getBoundingClientRect();
      return sum + (this.isVertical ? rect.height : rect.width);
    }, 0) + this.options.gap * (totalItems - 1);

    /**
     * Applies size to content element based on scrolling axis.
     */
    if (this.isVertical) {
      this.content.style.height = `${totalSizeWithClones}px`;
    } else {
      this.content.style.width = `${totalSizeWithClones}px`;
    }

    /**
     * Calculates width of prepended clones (for reverse animation offset).
     */
    const prependWidth = prependedClones.length > 0
      ? prependedClones.reduce((sum, el) => {
        const rect = el.getBoundingClientRect();
        return sum + (this.isVertical ? rect.height : rect.width);
      }, 0) + this.options.gap * prependedClones.length
      : 0;

    let shift = 0;
    if (this.options.initialShift === true) {
      shift = this.containerSize;
    } else if (typeof this.options.initialShift === 'number') {
      shift = this.options.initialShift;
    }

    /**
     * Calculates the precise "Loop Size" (Period) for seamless animation wrapping.
     */
    const loopSize = this.contentWidth + this.options.gap;

    /**
     * Stores loopSize and prependWidth for use in animate() method.
     */
    this.loopWidth = loopSize;
    this.prependWidth = prependWidth;

    if (this.options.reverse) {
      this.currentTranslate = -prependWidth - loopSize + shift;
    } else {
      this.currentTranslate = -shift;
    }

    /**
     * Applies initial transform based on scrolling axis.
     */
    if (this.isVertical) {
      this.content.style.transform = `translate3d(0,${this.currentTranslate}px,0)`;
    } else {
      this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;
    }

    this.dispatchEvent('content-setup', {
      totalSize: totalSizeWithClones,
      initialTranslate: this.currentTranslate,
      forceAnimationEnabled: this.forceAnimationEnabled,
      isVertical: this.isVertical
    });
  }

  /**
   * Initializes the marquee instance.
   */
  init() {
    this.isInitializing = true;
    this.dispatchEvent('init-start');

    this.container.classList.add('is-init-comet-marquee');

    /**
     * Applies vertical mode setup and height configuration.
     */
    if (this.isVertical) {
      this.container.setAttribute('data-vertical', '');

      if (this.options.height !== null) {
        const heightValue = typeof this.options.height === 'number'
          ? `${this.options.height}px`
          : this.options.height;
        this.container.style.setProperty('--comet-marquee-height', heightValue);
      } else if (this.options.develop) {
        console.warn(`[CometMarquee #${this.idx}] Vertical mode without explicit height. Using CSS default (--comet-marquee-height: 300px).`);
      }
    }

    /**
     * Applies fullWidth/fullHeight CSS stretch before calculating dimensions.
     */
    if (this.options.fullWidth) {
      this.applyFullSize();
    }

    this.calculateDimensions();
    this.setupContent();
    this.applyFadeEdges();
    this.startAnimation();

    this.dispatchEvent('init-complete');

    /**
     * Clears initializing flag synchronously after init completes.
     * Includes fallback timer for edge cases.
     */
    this.isInitializing = false;

    setTimeout(() => {
      this.isInitializing = false;
    }, 300);
  }

  /**
   * Applies fullWidth/fullHeight CSS to stretch the container to 100vw/100vh.
   * Uses negative margin to compensate for container offset.
   */
  applyFullSize() {
    if (!this.options.fullWidth) return;

    /**
     * Stores original styles for potential cleanup.
     */
    if (!this._originalContainerStyles) {
      this._originalContainerStyles = {
        width: this.container.style.width,
        height: this.container.style.height,
        maxWidth: this.container.style.maxWidth,
        maxHeight: this.container.style.maxHeight,
        marginLeft: this.container.style.marginLeft,
        marginTop: this.container.style.marginTop,
        position: this.container.style.position
      };
    }

    const rect = this.container.getBoundingClientRect();

    if (this.isVertical) {
      /**
       * Vertical mode: stretches container to 100vh.
       */
      const offsetTop = rect.top;
      this.container.style.height = '100vh';
      this.container.style.maxHeight = '100vh';
      this.container.style.marginTop = `-${offsetTop}px`;
      this.dispatchEvent('fullsize-applied', { offsetTop, axis: 'vertical' });
    } else {
      /**
       * Horizontal mode: stretches container to 100vw.
       */
      const offsetLeft = rect.left;
      this.container.style.width = '100vw';
      this.container.style.maxWidth = '100vw';
      this.container.style.marginLeft = `-${offsetLeft}px`;
      this.dispatchEvent('fullsize-applied', { offsetLeft, axis: 'horizontal' });
    }

    /**
     * Ensures position allows margin to work (sets to relative if static).
     */
    const computedPosition = getComputedStyle(this.container).position;
    if (computedPosition === 'static') {
      this.container.style.position = 'relative';
    }

    /**
     * Sets up debounced resize handler for fullWidth updates.
     */
    if (!this._fullWidthResizeHandler) {
      this._fullWidthResizeHandler = () => {
        if (this._fullWidthDebounceTimeout) {
          clearTimeout(this._fullWidthDebounceTimeout);
        }
        this._fullWidthDebounceTimeout = setTimeout(() => {
          this.updateFullSize();
        }, 150);
      };
      window.addEventListener('resize', this._fullWidthResizeHandler);
    }
  }

  /**
   * Updates fullSize offset on resize.
   */
  updateFullSize() {
    if (!this.options.fullWidth) return;

    /**
     * Temporarily resets styles to get true offset.
     */
    if (this.isVertical) {
      this.container.style.height = this._originalContainerStyles?.height || '';
      this.container.style.marginTop = this._originalContainerStyles?.marginTop || '';
    } else {
      this.container.style.width = this._originalContainerStyles?.width || '';
      this.container.style.marginLeft = this._originalContainerStyles?.marginLeft || '';
    }

    /**
     * Recalculates offset based on current position.
     */
    const rect = this.container.getBoundingClientRect();

    /**
     * Reapplies fullWidth/fullHeight styles with updated offset.
     */
    if (this.isVertical) {
      const offsetTop = rect.top;
      this.container.style.height = '100vh';
      this.container.style.maxHeight = '100vh';
      this.container.style.marginTop = `-${offsetTop}px`;
      this.dispatchEvent('fullsize-updated', { offsetTop });
    } else {
      const offsetLeft = rect.left;
      this.container.style.width = '100vw';
      this.container.style.maxWidth = '100vw';
      this.container.style.marginLeft = `-${offsetLeft}px`;
      this.dispatchEvent('fullsize-updated', { offsetLeft });
    }
  }

  /**
   * Starts or restarts the marquee animation.
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
   * @private
   */
  animate = (currentTime) => {
    if (!this.isAnimating) return;
    if (!currentTime) currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.isPaused) {
      /**
       * Uses stored loopSize for consistent wrapping.
       */
      const loopSize = this.loopWidth || (this.contentWidth + this.options.gap);

      if (this.options.reverse) {
        this.currentTranslate += this.options.speed * dt;

        /**
         * Wrap point for reverse: when we've scrolled through one full period.
         */
        const wrapPoint = -(this.prependWidth || 0);
        if (this.currentTranslate >= wrapPoint) {
          this.currentTranslate -= loopSize;
          this.dispatchEvent('animation-cycle', { direction: 'reverse' });
        }
      } else {
        this.currentTranslate -= this.options.speed * dt;

        /**
         * Wrap point for forward: when we've scrolled past one full period.
         */
        if (this.currentTranslate <= -loopSize) {
          this.currentTranslate += loopSize;
          this.dispatchEvent('animation-cycle', { direction: 'forward' });
        }
      }

      /**
       * Applies axis-aware transform.
       */
      if (this.isVertical) {
        this.content.style.transform = `translate3d(0,${this.currentTranslate}px,0)`;
      } else {
        this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;
      }
    }

    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * Pauses the marquee animation.
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
   * Resumes the marquee animation.
   */
  resume() {
    this.calculateDimensions();

    /**
     * Fix for resume/init race condition: if we should animate now but content wasn't setup
     * (e.g. width was 0 initially), run setup.
     */
    if (this.shouldAnimate && !this.contentSetup) {
      if (this.options.develop) {
        console.log(`[CometMarquee #${this.idx}] Resume: forcing content setup (width: ${this.contentWidth})`);
      }
      this.setupContent();
    }

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
   * Stops the marquee animation completely.
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
   */
  refresh() {
    /**
     * CRITICAL: Prevents refresh loops by checking if refresh or initialization is already in progress.
     */
    if (this.isRefreshing || this.isInitializing) {
      if (this.options.develop) {
        console.warn(`[CometMarquee #${this.idx}] Refresh blocked - already in progress`);
      }
      return;
    }

    this.isRefreshing = true;
    this.dispatchEvent('refresh-start');

    this.stop();
    this.items = Array.from(this.content.children).filter(c => !c.classList.contains('comet-marquee-clone'));
    this.init();

    this.dispatchEvent('refresh-complete');

    /**
     * Increased timeout to 500ms for maximum stability.
     */
    setTimeout(() => {
      this.isRefreshing = false;
      if (this.options.develop) {
        console.log(`[CometMarquee #${this.idx}] Refresh guard cleared`);
      }
    }, 500);
  }

  /**
   * Binds all necessary event listeners.
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

    /**
     * CRITICAL FIX: Multi-layer ResizeObserver protection to prevent infinite loops.
     */
    this.ro = new ResizeObserver((entries) => {
      const now = performance.now();
      this.resizeObserverCallCount++;

      /**
       * Layer 1: Blocks during refresh/init to prevent cascading calls.
       */
      if (this.isRefreshing || this.isInitializing) {
        if (this.options.develop) {
          console.log(`[CometMarquee #${this.idx}] RO blocked - refreshing/initializing`);
        }
        return;
      }

      /**
       * Layer 2: Detects rapid-fire calls (likely a loop, less than 50ms = suspicious).
       */
      const timeSinceLastResize = now - this.lastResizeTimestamp;
      if (timeSinceLastResize < 50) {
        if (this.options.develop) {
          console.warn(`[CometMarquee #${this.idx}] RO call too rapid (${timeSinceLastResize.toFixed(1)}ms) - ignoring`);
        }
        return;
      }
      this.lastResizeTimestamp = now;

      /**
       * Layer 3: Detects excessive calls (prevents runaway loops).
       */
      if (this.resizeObserverCallCount > 100) {
        console.error(`[CometMarquee #${this.idx}] ResizeObserver loop detected! Disconnecting to prevent crash.`);
        this.ro.disconnect();
        return;
      }

      /**
       * Layer 4: Checks window size change (real resize vs internal).
       */
      const currentWindowSize = this.isVertical ? window.innerHeight : window.innerWidth;
      const windowSizeChanged = currentWindowSize !== this.lastWindowWidth;

      /**
       * Layer 5: Checks container size change (width for horizontal, height for vertical).
       */
      let hasContainerSizeChanged = false;
      for (const entry of entries) {
        const currentSize = Math.round(this.isVertical ? entry.contentRect.height : entry.contentRect.width);

        if (this.lastContainerRectWidth === 0) {
          this.lastContainerRectWidth = currentSize;
          if (this.options.develop) {
            console.log(`[CometMarquee #${this.idx}] Initial ${this.isVertical ? 'height' : 'width'}: ${currentSize}px`);
          }
          return;
        }

        const sizeDiff = Math.abs(currentSize - this.lastContainerRectWidth);

        /**
         * Layer 6: Ignores micro-changes (less than 5px).
         */
        if (sizeDiff < 5) {
          if (this.options.develop) {
            console.log(`[CometMarquee #${this.idx}] Size change too small (${sizeDiff}px) - ignoring`);
          }
          return;
        }

        /**
         * Layer 7: Only processes if window actually resized OR container changed significantly.
         */
        if (!windowSizeChanged && sizeDiff < 10) {
          if (this.options.develop) {
            console.log(`[CometMarquee #${this.idx}] Internal size change without window resize - ignoring`);
          }
          return;
        }

        if (this.options.develop) {
          console.log(`[CometMarquee #${this.idx}] ${this.isVertical ? 'Height' : 'Width'}: ${this.lastContainerRectWidth}px → ${currentSize}px (window: ${windowSizeChanged})`);
        }

        this.lastContainerRectWidth = currentSize;
        hasContainerSizeChanged = true;
      }

      if (!hasContainerSizeChanged && !windowSizeChanged) {
        return;
      }

      /**
       * Updates window size tracker.
       */
      this.lastWindowWidth = currentWindowSize;

      this.dispatchEvent('container-resized');
      this.applyFadeEdges();

      /**
       * Layer 8: Aggressive debounce (increased to 300ms).
       */
      if (this._refreshTimeout) clearTimeout(this._refreshTimeout);
      this._refreshTimeout = setTimeout(() => {
        this.resizeObserverCallCount = 0;
        this.refresh();
      }, 300);
    });

    this.ro.observe(this.container);

    this._orientationChangeHandler = () => {
      this.dispatchEvent('orientation-change');
      setTimeout(() => {
        this.applyFadeEdges();
        this.refresh();
      }, 200);
    };
    window.addEventListener('orientationchange', this._orientationChangeHandler);

    this._fadeEdgesResizeHandler = () => {
      this.applyFadeEdges();
    };
    window.addEventListener('resize', this._fadeEdgesResizeHandler);

    this._visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.dispatchEvent('document-visible');
        this.resume();
      } else if (this.options.pauseOnInvisible) {
        this.dispatchEvent('document-hidden');
        this.pause();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);

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
   * Destroys the marquee instance.
   */
  destroy() {
    this.dispatchEvent('destroy-start');

    this.stop();

    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
    }

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
    window.removeEventListener('orientationchange', this._orientationChangeHandler);
    document.removeEventListener('visibilitychange', this._visibilityHandler);

    /**
     * Cleanup fullSize (horizontal and vertical) handlers and restore original styles.
     */
    if (this._fullWidthResizeHandler) {
      window.removeEventListener('resize', this._fullWidthResizeHandler);
    }
    if (this._fullWidthDebounceTimeout) {
      clearTimeout(this._fullWidthDebounceTimeout);
    }
    if (this._originalContainerStyles) {
      this.container.style.width = this._originalContainerStyles.width;
      this.container.style.height = this._originalContainerStyles.height;
      this.container.style.maxWidth = this._originalContainerStyles.maxWidth;
      this.container.style.maxHeight = this._originalContainerStyles.maxHeight;
      this.container.style.marginLeft = this._originalContainerStyles.marginLeft;
      this.container.style.marginTop = this._originalContainerStyles.marginTop;
      this.container.style.position = this._originalContainerStyles.position;
    }

    /**
     * Removes vertical attribute from container.
     */
    if (this.isVertical) {
      this.container.removeAttribute('data-vertical');
    }

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