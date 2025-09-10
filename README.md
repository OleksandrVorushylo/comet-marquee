# CometMarquee

A lightweight, smooth-scrolling marquee plugin for modern browsers. Allows continuous horizontal scrolling of content with optional pause on hover or click.

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

⚠️ **Note:** `comet-marquee-item` is recommended but not strictly required. All children of `.comet-marquee-content` will be used.

## Usage

```javascript
const marquee = new CometMarquee('.comet-marquee-container', {
  speed: 60,            // scroll speed (px/sec), default 50
  gap: 20,              // gap between items in px, auto-detected from CSS
  pauseOnHover: true,   // pause when mouse hovers over the container
  pauseOnClick: true,   // pause when container is clicked (touch-friendly)
  initialShift: true    // start with content shifted by container width (true/false or px)
});

// Start / Stop / Control
marquee.start();
marquee.stop();
marquee.pause();
marquee.resume();
marquee.refresh();

// Dynamically add or remove items
marquee.addItem('<div class="comet-marquee-item">New Item</div>');
marquee.removeItem(); // removes last original item
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `speed` | number | 50 | Scrolling speed in pixels per second |
| `gap` | number | CSS gap | Space between items in px |
| `pauseOnHover` | boolean | false | Pause marquee on hover |
| `pauseOnClick` | boolean | false | Pause marquee on click, resume on click outside |
| `initialShift` | boolean/number | false | Shift content initially (true → container width, number → px) |
| `reverse` | boolean | false | Reverse scrolling direction |
| `adaptivePause` | boolean | false | Combine hover and click pause based on device width (hover on ≥1024px, click on <1024px) |
| `pauseOnInvisible` | boolean | false | Pause animation when marquee is not visible in viewport (uses IntersectionObserver) |

## Methods

| Method | Description |
|--------|-------------|
| `start()` | Start marquee animation |
| `stop()` | Stop animation completely |
| `pause()` | Pause animation temporarily |
| `resume()` | Resume paused animation |
| `refresh()` | Recalculate dimensions and restart animation |
| `addItem(html)` | Add a new item dynamically |
| `removeItem()` | Remove the last original item |

## Notes

- Clones of items are automatically created for seamless scrolling
- Respects `prefers-reduced-motion` and will pause automatically if the user requests reduced motion
- Works on both desktop and touch devices