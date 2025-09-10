import "./style.css";

export class CometMarquee {
  constructor(selector, options = {}) {
    if (typeof selector === 'string') this.containers = Array.from(document.querySelectorAll(selector));
    else if (selector instanceof HTMLElement) this.containers = [selector];
    else if (selector instanceof NodeList || Array.isArray(selector)) this.containers = Array.from(selector);
    else throw new Error('CometMarquee: invalid selector');

    this.instances = this.containers.map(container => new CometMarqueeInstance(container, options));
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
  constructor(container, options = {}) {
    this.container = container;
    this.content = container.querySelector('.comet-marquee-content');
    this.items = Array.from(this.content.children);

    const cs = getComputedStyle(this.content);
    const parsedGap = parseFloat(cs.gap || cs.columnGap || '0');
    this.gap = options.gap ?? (Number.isFinite(parsedGap) ? parsedGap : 0);

    this.options = {
      speed: options.speed ?? 50,
      pauseOnHover: options.pauseOnHover ?? false,
      pauseOnClick: options.pauseOnClick ?? false,
      initialShift: options.initialShift ?? false,
      reverse: options.reverse ?? false,
      adaptivePause: options.adaptivePause ?? false,
      pauseOnInvisible: options.pauseOnInvisible ?? false
    };

    this.isAnimating = false;
    this.isPaused = false;
    this.animationId = null;
    this.currentTranslate = 0;
    this.contentWidth = 0;
    this.containerWidth = 0;
    this.lastTime = 0;

    this.init();
    this.bindEvents();
  }

  getTotalWidth() {
    const widths = this.items.map(el => el.getBoundingClientRect().width);
    return widths.length ? widths.reduce((a,b)=>a+b,0) + this.gap*(this.items.length-1) : 0;
  }

  calculateDimensions() {
    this.containerWidth = this.container.getBoundingClientRect().width;
    this.contentWidth = this.getTotalWidth();
    this.shouldAnimate = this.contentWidth > this.containerWidth + 1;
  }

  setupContent() {
    this.content.style.willChange = 'transform';
    if (!this.shouldAnimate) {
      this.content.querySelectorAll('.comet-marquee-clone').forEach(n=>n.remove());
      this.content.style.transform = 'translate3d(0,0,0)';
      this.content.style.width = 'auto';
      this.currentTranslate = 0;
      return;
    }

    this.content.querySelectorAll('.comet-marquee-clone').forEach(n=>n.remove());
    this.items.forEach(item=>{
      const clone = item.cloneNode(true);
      clone.classList.add('comet-marquee-clone');
      this.content.appendChild(clone);
    });

    this.content.style.width = `${this.contentWidth*2 + this.gap}px`;

    if (this.options.initialShift) {
      const shift = typeof this.options.initialShift === 'number' ? this.options.initialShift : this.containerWidth;
      this.currentTranslate = -shift * (this.options.reverse ? -1 : 1);
      this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;
    } else {
      this.currentTranslate = 0;
      this.content.style.transform = 'translate3d(0,0,0)';
    }
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

    const dt = (currentTime - this.lastTime)/1000;
    this.lastTime = currentTime;

    if (!this.isPaused) {
      const direction = this.options.reverse ? 1 : -1;
      this.currentTranslate += direction * this.options.speed * dt;
      const resetPoint = -(this.contentWidth + this.gap);
      if (!this.options.reverse && this.currentTranslate <= resetPoint) this.currentTranslate += this.contentWidth + this.gap;
      if (this.options.reverse && this.currentTranslate >= 0) this.currentTranslate -= this.contentWidth + this.gap;

      this.content.style.transform = `translate3d(${this.currentTranslate}px,0,0)`;
    }

    this.animationId = requestAnimationFrame(this.animate);
  }

  pause() { this.isPaused = true; }
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
    const isDesktop = window.innerWidth >= 1024;
    const useHover = this.options.adaptivePause ? isDesktop : this.options.pauseOnHover;
    const useClick = this.options.adaptivePause ? !isDesktop : this.options.pauseOnClick;

    if (useHover) {
      this.container.addEventListener('mouseenter', ()=>this.pause());
      this.container.addEventListener('mouseleave', ()=>this.resume());
    }

    if (useClick) {
      this.container.addEventListener('click', e=>{
        e.stopPropagation();
        this.isPaused ? this.resume() : this.pause();
      });
      document.addEventListener('click', e=>{
        if (!this.container.contains(e.target) && this.isPaused) this.resume();
      });
    }

    this.ro = new ResizeObserver(()=>this.refresh());
    this.ro.observe(this.container);

    window.addEventListener('orientationchange', ()=>this.refresh());

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) this.pause();
    mql.addEventListener?.('change', ()=> mql.matches ? this.pause() : this.resume());

    if (this.options.pauseOnInvisible && 'IntersectionObserver' in window) {
      this.io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) this.resume();
          else this.pause();
        });
      }, { threshold: 0.05 });
      this.io.observe(this.container);
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
    if (originals.length > 1) {
      originals[originals.length-1].remove();
      this.refresh();
    }
  }
}