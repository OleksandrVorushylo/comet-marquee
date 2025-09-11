# CometMarquee

A lightweight, smooth-scrolling marquee plugin for modern browsers. Allows continuous horizontal scrolling of content with automatic performance optimization and accessibility features.

---

## Installation

```bash
npm install comet-marquee
# or
pnpm add comet-marquee
```

```javascript
import { CometMarquee } from 'comet-marquee';
import 'comet-marquee/dist/comet-marquee.css';
```

## HTML Structure

```html
<div class="comet-marquee-container">
  <div class="comet-marquee-content">
    <div class="comet-marquee-item">Item 1</div>
    <div class="comet-marquee-item">Item 2</div>
    <div class="comet-marquee-item">Item 3</div>
    <!-- Optional: more items -->
  </div>
</div>
```

⚠️ **Note:** `comet-marquee-item` is recommended but not strictly required. All direct children of `.comet-marquee-content` will be used as items.

## Usage

```javascript
const marquee = new CometMarquee('.comet-marquee-container', {
  speed: 60,                // scroll speed (px/sec), default 50
  gap: 20,                  // gap between items in px, auto-detected from CSS
  pauseOnHover: true,       // pause when mouse hovers over the container
  pauseOnClick: true,       // pause when container is clicked (touch-friendly)
  adaptivePause: true,      // hover on desktop, click on mobile
  reverse: false,           // reverse scrolling direction
  initialShift: true,       // start with content shifted by container width
  pauseOnInvisible: true,   // pause when marquee is not visible
  syncPause: true,          // synchronize pause across all marquee instances
  repeatCount: 3            // number of content repetitions for smooth animation
});

// Control methods
marquee.start();
marquee.stop();
marquee.pause();
marquee.resume();
marquee.refresh();

// Dynamic content manipulation
marquee.addItem('<div class="comet-marquee-item">New Item</div>');
marquee.removeItem(); // removes last original item
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `speed` | number | 50 | Scrolling speed in pixels per second |
| `gap` | number | CSS gap | Space between items in pixels (auto-detected from CSS if not specified) |
| `pauseOnHover` | boolean | false | Pause marquee on mouse hover |
| `pauseOnClick` | boolean | false | Pause/resume marquee on click, resume on click outside container |
| `adaptivePause` | boolean | false | Automatically use hover behavior on desktop (≥1024px) and click behavior on mobile (<1024px) |
| `reverse` | boolean | false | Reverse scrolling direction (right to left becomes left to right) |
| `initialShift` | boolean/number | false | Initial content offset: `true` shifts by container width, number shifts by specified pixels |
| `pauseOnInvisible` | boolean | false | Pause animation when marquee is not visible in viewport (uses IntersectionObserver) |
| `syncPause` | boolean | false | Synchronize pause/resume across all CometMarquee instances on the page |
| `repeatCount` | number | 3 | Number of content repetitions for seamless scrolling. Increase for short content, decrease for performance with many items |

## Methods

| Method | Description |
|--------|-------------|
| `start()` | Start or restart marquee animation |
| `stop()` | Stop animation completely and cancel animation frames |
| `pause()` | Pause animation temporarily (can be resumed) |
| `resume()` | Resume paused animation and recalculate dimensions |
| `refresh()` | Recalculate dimensions, rebuild clones, and restart animation |
| `addItem(html)` | Add a new item dynamically from HTML string |
| `removeItem()` | Remove the last original item (not clones) |
| `destroy()` | Clean up all event listeners, observers, and animation frames |

## Multi-Instance Support

CometMarquee supports multiple instances on the same page:

```javascript
// Create multiple marquees
const marquee1 = new CometMarquee('.marquee-1');
const marquee2 = new CometMarquee('.marquee-2');

// Or select multiple containers at once
const marquees = new CometMarquee('.marquee-container'); // selects all matching elements
```

## Accessibility & Performance Features

- **Reduced Motion Support**: Automatically pauses when user has `prefers-reduced-motion: reduce` set
- **Visibility Optimization**: Can pause when not visible (with `pauseOnInvisible` option)
- **Tab Visibility**: Pauses when browser tab becomes hidden
- **Responsive Behavior**: Automatically recalculates on window resize and orientation change
- **Performance Optimized**: Uses `requestAnimationFrame` and `will-change` CSS property
- **Smart Content Detection**: Only animates when content width exceeds container width

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 64+ |
| Firefox | 69+ |
| Safari | 14+ |
| Edge | 79+ |
| iOS Safari | 14+ |
| Android Chrome | 64+ |

**Required APIs:**
- `requestAnimationFrame`
- `ResizeObserver`
- `IntersectionObserver` (for visibility detection)
- CSS `transform3d` and `will-change`
- ES6 classes and arrow functions

**Note:** Tested on Safari 15.6+. Earlier versions may work but are not officially supported.

## Notes

- Content clones are automatically created and managed for seamless infinite scrolling
- The plugin automatically calculates optimal number of repetitions based on content and container size
- Event listeners and observers are automatically cleaned up when instances are destroyed
- All instances are tracked globally for synchronization features
- Works on both desktop (mouse events) and touch devices (touch events)