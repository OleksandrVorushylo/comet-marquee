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
  repeatCount: 3,           // number of content repetitions for smooth animation
  develop: false            // enable debug console logging
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
| `develop` | boolean | false | Enable debug console logging for all events |

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

## Event System

CometMarquee dispatches custom events throughout its lifecycle, allowing you to hook into different stages of the marquee operation. All events are dispatched on the container element with the prefix `comet-marquee:`.

### Event Usage

```javascript
const container = document.querySelector('.comet-marquee-container');

// Listen to specific events
container.addEventListener('comet-marquee:animation-started', (e) => {
  console.log('Marquee animation started', e.detail);
});

container.addEventListener('comet-marquee:animation-cycle', (e) => {
  console.log('Animation completed a cycle', e.detail.direction);
});

container.addEventListener('comet-marquee:hover-pause', (e) => {
  console.log('Marquee paused on hover', e.detail.instance);
});
```

### Available Events

#### Lifecycle Events
| Event | Description | Detail Properties |
|-------|-------------|------------------|
| `init-start` | Marquee initialization begins | `instance`, `container` |
| `init-complete` | Marquee initialization completed | `instance`, `container` |
| `destroy-start` | Marquee destruction begins | `instance`, `container` |
| `destroy-complete` | Marquee destruction completed | `instance`, `container` |

#### Dimension & Setup Events
| Event | Description | Detail Properties |
|-------|-------------|------------------|
| `dimensions-calculated` | Container and content dimensions calculated | `containerWidth`, `contentWidth`, `shouldAnimate` |
| `clones-creating` | Content clones creation started | `instance`, `container` |
| `clones-created` | Content clones created | `cloneCount`, `repeatCount`, `clonedItems` |
| `content-setup` | Content positioning and width setup completed | `totalWidth`, `initialTranslate` |

#### Animation Events
| Event | Description | Detail Properties |
|-------|-------------|------------------|
| `animation-started` | Animation loop started | `instance`, `container` |
| `animation-stopped` | Animation loop stopped | `instance`, `container` |
| `animation-paused` | Animation paused | `instance`, `container` |
| `animation-resumed` | Animation resumed | `instance`, `container` |
| `animation-cycle` | Animation completed one full cycle | `direction` ('forward' or 'reverse') |
| `animation-skipped` | Animation skipped (content fits in container) | `instance`, `container` |
| `animation-not-needed` | Animation not needed (content doesn't overflow) | `instance`, `container` |

#### Interaction Events
| Event | Description | Detail Properties |
|-------|-------------|------------------|
| `hover-pause` | Paused due to mouse hover | `instance`, `container` |
| `hover-resume` | Resumed after mouse leave | `instance`, `container` |
| `click-pause` | Paused due to click | `instance`, `container` |
| `click-resume` | Resumed due to click | `instance`, `container` |
| `outside-click-resume` | Resumed due to click outside container | `instance`, `container` |

#### Visibility Events
| Event | Description | Detail Properties |
|-------|-------------|------------------|
| `visibility-pause` | Paused due to becoming invisible | `instance`, `container` |
| `visibility-resume` | Resumed due to becoming visible | `instance`, `container` |
| `document-visible` | Document became visible (tab focus) | `instance`, `container` |
| `document-hidden` | Document became hidden (tab blur) | `instance`, `container` |

#### System Events
| Event | Description | Detail Properties |
|-------|-------------|------------------|
| `container-resized` | Container was resized | `instance`, `container` |
| `orientation-change` | Device orientation changed | `instance`, `container` |
| `adaptive-pause-resize` | Adaptive pause behavior recalculated on resize | `instance`, `container` |
| `reduced-motion-on` | User enabled reduced motion preference | `instance`, `container` |
| `reduced-motion-off` | User disabled reduced motion preference | `instance`, `container` |

#### Content Management Events
| Event | Description | Detail Properties |
|-------|-------------|------------------|
| `refresh-start` | Content refresh started | `instance`, `container` |
| `refresh-complete` | Content refresh completed | `instance`, `container` |
| `item-adding` | New item being added | `itemHtml` |
| `item-added` | New item added successfully | `newItem` |
| `item-removing` | Item being removed | `removedItem` |
| `item-removed` | Item removed successfully | `instance`, `container` |
| `events-bound` | Event listeners bound to container | `instance`, `container` |

### Event Detail Object

All events include a `detail` object with at minimum:
- `instance` - The CometMarqueeInstance that triggered the event
- `container` - The DOM container element
- Additional properties specific to each event type

### Development Mode

Set `develop: true` in options to enable console logging of all events:

```javascript
const marquee = new CometMarquee('.marquee', {
  develop: true  // Will log all events to console
});
```

## Multi-Instance Support

CometMarquee supports multiple instances on the same page:

```javascript
// Create multiple marquees
const marquee1 = new CometMarquee('.marquee-1');
const marquee2 = new CometMarquee('.marquee-2');

// Listen to events from all instances
document.addEventListener('comet-marquee:animation-started', (e) => {
  console.log('Any marquee started:', e.detail.container);
});
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
- `CustomEvent` (for event system)

**Note:** Tested on Safari 15.6+. Earlier versions may work but are not officially supported.

## Notes

- Content clones are automatically created and managed for seamless infinite scrolling
- The plugin automatically calculates optimal number of repetitions based on content and container size
- Event listeners and observers are automatically cleaned up when instances are destroyed
- All instances are tracked globally for synchronization features
- Works on both desktop (mouse events) and touch devices (touch events)
- Comprehensive event system allows deep integration with your application logic