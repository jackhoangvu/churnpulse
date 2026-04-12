## SECTION 1: MOTION & ANIMATION SYSTEM
### 1.1 — Global Animation Tokens
Add the following to `app.css` inside `:root`, replacing nothing, only adding:
```css
/* Durations */
--dur-instant: 80ms;
--dur-fast: 140ms;
--dur-base: 220ms;
--dur-slow: 360ms;
--dur-glacial: 600ms;
/* Easings */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-in-expo: cubic-bezier(0.7, 0, 0.84, 0);
--ease-in-out-expo: cubic-bezier(0.87, 0, 0.13, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-snappy: cubic-bezier(0.2, 0, 0, 1);
/* Spring physics for JS animations */
--spring-stiffness: 400;
--spring-damping: 28;
```
### 1.2 — Page Transition System
Create `src/lib/components/layout/PageTransition.svelte`:
- Wrap every page's `{@render children()}` in this component
- On mount: `opacity: 0; transform: translateY(8px)` → `opacity: 1; transform: translateY(0)` over `var(--dur-slow)` with `var(--ease-out-expo)`
- On unmount: `opacity: 1` → `opacity: 0; transform: translateY(-4px)` over `var(--dur-fast)`
- Use Svelte 5's `$effect` with `requestAnimationFrame` double-buffering so the animation never flashes
- Apply to `AppShell.svelte`'s `<main>` content area, not the shell itself
### 1.3 — Scroll Reveal System
Replace the existing `.reveal` / `.revealed` system entirely with a new `src/lib/components/ui/Reveal.svelte` component:
- Props: `delay?: number` (ms), `distance?: number` (px, default 16), `once?: boolean` (default true), `direction?: 'up' | 'down' | 'left' | 'right'`
- Uses `IntersectionObserver` with `threshold: 0.08` and `rootMargin: '0px 0px -40px 0px'`
- Animates from `opacity: 0` + directional `translate` to final position
- Stagger: expose a `stagger` prop that accepts an index number and multiplies by 60ms delay
- Respects `prefers-reduced-motion` — skips animation entirely, renders immediately visible
- Wrap every stat card, every chart card, every table section, every action queue card in this component across all dashboard pages
### 1.4 — Micro-interaction: Buttons
In `app.css`, upgrade every `.btn` variant:
```css
.btn {
  transition:
    background var(--dur-fast) var(--ease-out-expo),
    border-color var(--dur-fast) var(--ease-out-expo),
    color var(--dur-fast) var(--ease-out-expo),
    box-shadow var(--dur-base) var(--ease-out-expo),
    transform var(--dur-fast) var(--ease-out-back),
    opacity var(--dur-fast) var(--ease-out-expo);
}
.btn:hover { transform: translateY(-1px) scale(1.008); }
.btn:active { transform: translateY(0px) scale(0.97); transition-duration: var(--dur-instant); }
.btn:focus-visible { outline: 2px solid oklch(60% 0.2 255); outline-offset: 3px; }
```
Every `.btn-primary` must have a shimmer sweep animation on hover — a `::before` pseudo-element with `background: linear-gradient(105deg, transparent 40%, oklch(100% 0 0 / 0.08) 50%, transparent 60%)` that sweeps `translateX(-100%)` to `translateX(200%)` over `500ms var(--ease-out-expo)`.
### 1.5 — Micro-interaction: Cards
Every `.card`, `.stat-card`, `.chart-card`, `.action-queue`, `.settings-provider-card`:
```css
transition:
  border-color var(--dur-base) var(--ease-out-expo),
  box-shadow var(--dur-base) var(--ease-out-expo),
  transform var(--dur-base) var(--ease-out-expo);
&:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px oklch(0% 0 0 / 0.24), 0 0 0 1px oklch(60% 0.2 255 / 0.12);
}
```
### 1.6 — Micro-interaction: Table Rows
Every `tbody tr`:
```css
transition: background var(--dur-instant) var(--ease-out-expo);
```
On hover, the background transition must feel instant (80ms) — never sluggish.
Expanded row animation: when `isExpanded` toggles true, the `.table__expansion` `<td>` must animate from `max-height: 0; opacity: 0` to `max-height: 800px; opacity: 1` over `var(--dur-slow) var(--ease-out-expo)`. Use a CSS custom property `--expansion-height` set from JS to avoid the `max-height` hack artifacts.
### 1.7 — Micro-interaction: Sidebar Navigation
`.nav-item` active indicator: add a `::before` pseudo-element that is a 2px wide bar on the left edge. When transitioning between active states, this bar must animate position using `top` and `height` via a JavaScript-driven "ink bar" — measure the active element's `offsetTop` and `offsetHeight`, then apply them with `transition: top 220ms var(--ease-out-expo), height 220ms var(--ease-out-expo)`.
Each `.nav-item` must have: `transition: background var(--dur-fast) var(--ease-out-expo), color var(--dur-fast) var(--ease-out-expo), padding-left var(--dur-base) var(--ease-out-expo)` — on hover, `padding-left` nudges 2px.
### 1.8 — Micro-interaction: Form Inputs
Every `.form-input`, `.form-select`, `.filter-input`:
- Border color transition: `var(--dur-fast) var(--ease-out-expo)`
- On focus: `box-shadow` animates from `0 0 0 0px` to `0 0 0 3px oklch(60% 0.2 255 / 0.2)` over `var(--dur-base)`
- Label float (if you add floating labels to the settings forms): `transform: translateY()` transition `var(--dur-fast) var(--ease-out-expo)`
### 1.9 — Micro-interaction: Toggles
The `.toggle` component:
- `.toggle__thumb`: `transition: transform var(--dur-base) var(--ease-out-back), background var(--dur-base) var(--ease-out-expo)`
- `.toggle__track`: `transition: background var(--dur-base) var(--ease-out-expo), border-color var(--dur-base) var(--ease-out-expo), box-shadow var(--dur-base) var(--ease-out-expo)`
- On active state: the track gets `box-shadow: 0 0 0 3px oklch(60% 0.2 255 / 0.15)` that fades in over `var(--dur-slow)`
### 1.10 — Micro-interaction: Toast Notifications
Upgrade `SignalFeed.svelte` toasts:
- Enter: slide in from right `translateX(110%)` → `translateX(0)` over `var(--dur-slow) var(--ease-out-back)`
- Exit: slide out to right `translateX(0)` → `translateX(110%)` over `var(--dur-base) var(--ease-in-expo)`
- Stack: when multiple toasts exist, lower ones must animate `translateY` downward as new ones push in
- Progress bar: each toast has a thin 2px progress bar at the bottom that depletes over its lifetime duration (4000ms)
- Use Svelte 5 `$state` array with keyed transitions — do NOT use deprecated `transition:` directives on list items
### 1.11 — Micro-interaction: Modals & Overlays
Create `src/lib/components/ui/Modal.svelte`:
- Backdrop: `opacity: 0` → `opacity: 1` over `var(--dur-base)` with `backdrop-filter: blur(4px)`
- Panel: `opacity: 0; transform: scale(0.96) translateY(8px)` → `opacity: 1; transform: scale(1) translateY(0)` over `var(--dur-slow) var(--ease-out-back)`
- Close: reverse with `var(--dur-fast) var(--ease-in-expo)`
- Trap focus, close on `Escape`, close on backdrop click
Use this for any confirmation dialogs (dismiss signal, disconnect polar).
### 1.12 — Micro-interaction: Skeleton Loaders
Replace the existing `.skeleton` shimmer with a more refined version:
```css
.skeleton {
  background: linear-gradient(
    90deg,
    oklch(18% 0.01 255) 0%,
    oklch(22% 0.01 255) 50%,
    oklch(18% 0.01 255) 100%
  );
  background-size: 300% 100%;
  animation: skeleton-shimmer 1.8s ease-in-out infinite;
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
}
```
Add skeleton states to every page that loads async data — show skeletons for the first 300ms of any load, never show empty states flashing.
### 1.13 — Micro-interaction: Charts & Sparklines
All SVG sparklines and bar charts:
- On mount, bars must animate from `--bar-width: 0%` to their final value over `var(--dur-glacial) var(--ease-out-expo)` with staggered delays (index × 40ms)
- SVG polylines must use `stroke-dasharray` / `stroke-dashoffset` draw-on animation over `600ms var(--ease-out-expo)`
- Funnel bars animate with `200ms` stagger per row
### 1.14 — Micro-interaction: Navigation Active State
In `AppShell.svelte`, when `pathname` changes:
- The previously active `.nav-item` must fade its highlight out over `var(--dur-base)`
- The newly active `.nav-item` must fade its highlight in over `var(--dur-base)` with a `translateX(-4px) → translateX(0)` nudge
---
## SECTION 2: OKLCH COLOR SYSTEM
### 2.1 — Complete Token Migration
Replace every value in `:root` in `app.css`. The format is `oklch(lightness% chroma hue)`. Maintain the same semantic meaning, only change the format. Example mapping:
| Old token | New value |
|---|---|
| `--brand: #2563eb` | `--brand: oklch(52% 0.22 264)` |
| `--brand-hover: #3b82f6` | `--brand-hover: oklch(61% 0.22 264)` |
| `--brand-light: #60a5fa` | `--brand-light: oklch(70% 0.18 264)` |
| `--brand-dim: rgba(37,99,235,0.1)` | `--brand-dim: oklch(52% 0.22 264 / 0.1)` |
| `--bg-base: #0d0f14` | `--bg-base: oklch(10% 0.01 255)` |
| `--bg-surface: #14171e` | `--bg-surface: oklch(13% 0.01 255)` |
| `--bg-elevated: #1a1d26` | `--bg-elevated: oklch(16% 0.015 255)` |
| `--bg-card: #1e2130` | `--bg-card: oklch(18% 0.015 255)` |
| `--bg-overlay: #252836` | `--bg-overlay: oklch(21% 0.015 255)` |
| `--text-primary: #f1f5f9` | `--text-primary: oklch(96% 0.005 255)` |
| `--text-secondary: #94a3b8` | `--text-secondary: oklch(68% 0.02 255)` |
| `--text-muted: #7f92a8` | `--text-muted: oklch(62% 0.02 255)` |
| `--text-subtle: #5e7285` | `--text-subtle: oklch(52% 0.02 255)` |
| `--success: #10b981` | `--success: oklch(72% 0.18 162)` |
| `--danger: #ef4444` | `--danger: oklch(62% 0.24 25)` |
| `--warning: #f59e0b` | `--warning: oklch(78% 0.18 76)` |
| `--border: rgba(255,255,255,0.07)` | `--border: oklch(100% 0 0 / 0.07)` |
| `--border-hover: rgba(255,255,255,0.13)` | `--border-hover: oklch(100% 0 0 / 0.13)` |
| `--border-brand: rgba(37,99,235,0.35)` | `--border-brand: oklch(52% 0.22 264 / 0.35)` |
Continue this pattern for every single token. Zero hex values, zero `hsl()` values, zero `rgb()` values must remain.
### 2.2 — Light Mode Support
Add a `[data-theme="light"]` block to `app.css` that remaps all tokens:
```css
[data-theme="light"] {
  --bg-base: oklch(98% 0.005 255);
  --bg-surface: oklch(96% 0.005 255);
  --bg-elevated: oklch(94% 0.006 255);
  --bg-card: oklch(100% 0 0);
  --bg-overlay: oklch(92% 0.007 255);
  --text-primary: oklch(14% 0.01 255);
  --text-secondary: oklch(38% 0.02 255);
  --text-muted: oklch(52% 0.018 255);
  --text-subtle: oklch(62% 0.015 255);
  --border: oklch(0% 0 0 / 0.08);
  --border-hover: oklch(0% 0 0 / 0.14);
  --brand: oklch(48% 0.22 264);
  --brand-dim: oklch(52% 0.22 264 / 0.08);
  /* ... all other tokens remapped for light mode */
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    /* same light values */
  }
}
```
### 2.3 — Theme Toggle
Create `src/lib/components/ui/ThemeToggle.svelte`:
- A button with sun/moon SVG icon that toggles `data-theme` on `document.documentElement`
- Persists to `localStorage`
- Reads system preference on first load
- The icon must animate: moon slides out, sun slides in (or vice versa) over `var(--dur-base) var(--ease-out-back)`
- Place this toggle in `AppShell.svelte`'s topbar actions area and in the landing nav
---
## SECTION 3: FULL RESPONSIVENESS
### 3.1 — Breakpoint System
Define explicit breakpoints in `app.css` as custom properties for reference:
```css
:root {
  --bp-xs: 320px;
  --bp-sm: 480px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
  --bp-2xl: 1536px;
  --bp-4k: 3840px;
}
```
### 3.2 — Mandatory Fixes Per Page
**All dashboard pages (`/dashboard/*`):**
- The `grid-4` stat card row must be `grid-template-columns: repeat(4, 1fr)` above 1200px, `repeat(2, 1fr)` from 768–1199px, `1fr` below 768px — with `gap` scaling from `--sp-4` to `--sp-3` to `--sp-2`
- Every table must use `overflow-x: auto` with `-webkit-overflow-scrolling: touch` on its container
- Tables must not clip on any screen width — minimum column widths enforced via `min-width` on `<th>` elements
**Recovery Center (`/dashboard/recovery`):**
- `.action-queues` must be `grid-template-columns: repeat(3, 1fr)` above 900px, `repeat(2, 1fr)` 601–899px, `1fr` below 600px
- The expanded row expansion grid: `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))` — must wrap cleanly at every breakpoint without overflow
**Analytics (`/dashboard/analytics`):**
- Cohort table must be horizontally scrollable on mobile — wrap in a `overflow-x: auto` container with a fade-out gradient on the right edge indicating scrollability
- The funnel chart rows: on mobile below 500px, hide the `funnel__pct` column
**Settings (`/dashboard/settings`):**
- Provider cards must stack single column below 700px
- The webhook events table: on mobile, collapse to card-style rows showing only provider, event type, and time — hide raw event ID
**Landing page (`/`):**
- Hero title must use `clamp(28px, 6vw, 72px)` — never overflow its container at 320px
- Pricing grid: above 900px `3 columns`, 600–899px `2 columns`, below 600px `1 column`, centered, max-width 400px
- The hero mockup table must be horizontally scrollable below 600px
- Platform chips must wrap cleanly — never clip
**Mobile Navigation:**
- `MobileNav.svelte` must display below 768px and be hidden above — currently broken, fix the CSS
- Safe area insets: `padding-bottom: max(env(safe-area-inset-bottom), 12px)` for iOS notch support
- The nav must be `position: fixed; bottom: 0; left: 0; right: 0; z-index: 100`
### 3.3 — Typography Scaling
Every heading must use `clamp()`. Specifically:
```css
h1 { font-size: clamp(22px, 4.5vw, 48px); }
h2 { font-size: clamp(18px, 3vw, 36px); }
h3 { font-size: clamp(15px, 2vw, 22px); }
```
### 3.4 — Touch Targets
All interactive elements must have a minimum `44px × 44px` touch target on mobile. Use `min-height: 44px` or padding expansion as needed. This includes: all `.nav-item`, `.filter-tab`, `.btn-sm`, table row expand chevrons, toggle switches.
### 3.5 — 4K Support
At screen widths above 2560px:
- The max-width of page content areas must cap at `1600px` and center with `margin-inline: auto`
- Font sizes must not look tiny — use `clamp()` maximums that scale up to `1.2rem` baseline at 4K
- Chart SVGs must be responsive, never fixed-width
---
## SECTION 4: UI & UX UPGRADE
### 4.1 — Button System Overhaul
Every button variant gets refined:
**`.btn-primary`:** Gradient background `linear-gradient(135deg, oklch(55% 0.22 264), oklch(50% 0.24 270))` with a subtle inner `box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.1)`. On hover, gradient shifts 5° hue.
**`.btn-secondary`:** Glassmorphism background `oklch(100% 0 0 / 0.04)` with `backdrop-filter: blur(8px)` and a `1px` border at `oklch(100% 0 0 / 0.1)`. On hover, border lightens to `0.18`.
**`.btn-danger`:** On hover, adds a very subtle glow `box-shadow: 0 0 0 3px oklch(62% 0.24 25 / 0.2)`.
**`.btn-ghost`:** Clean, no background by default. On hover, `background: oklch(52% 0.22 264 / 0.08)`.
Add `.btn-icon` with perfectly centered icon, `32px × 32px` default, `40px × 40px` with `.btn-icon--lg`, `24px × 24px` with `.btn-icon--sm`. Border radius: `var(--radius-md)`.
Add loading state: `.btn--loading` disables pointer events, shows a spinner (CSS-only `border`-based spinner, `16px`, rotating at `600ms linear infinite`) replacing the button text.
### 4.2 — Input System Overhaul
All inputs (`.form-input`, `.form-select`, `.filter-input`) get:
- Height: `40px` (was inconsistent)
- `padding-inline: 12px`
- `border-radius: var(--radius-md)` — consistent everywhere
- Error state: `.form-input--error` adds `border-color: var(--danger)` and `box-shadow: 0 0 0 3px oklch(62% 0.24 25 / 0.12)`
- Success state: `.form-input--success` adds `border-color: var(--success)`
- Disabled state: `opacity: 0.5; cursor: not-allowed`
Create `src/lib/components/ui/FormField.svelte` that wraps a label, input, helper text, and error message in a consistent structure. This must handle: label, placeholder, type, value binding, error string, helper string, required indicator.
### 4.3 — Card System Upgrade
`.card` gets a more refined border treatment:
```css
.card {
  border: 1px solid var(--border);
  background: linear-gradient(
    145deg,
    oklch(14% 0.012 255),
    oklch(12% 0.008 255)
  );
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.2), inset 0 1px 0 oklch(100% 0 0 / 0.03);
}
```
`.card-brand` gets a glowing border:
```css
.card-brand {
  border-color: oklch(52% 0.22 264 / 0.4);
  box-shadow:
    0 0 0 1px oklch(52% 0.22 264 / 0.08) inset,
    0 4px 24px oklch(52% 0.22 264 / 0.12),
    0 1px 2px oklch(0% 0 0 / 0.3);
}
```
### 4.4 — Table System Upgrade
Tables across every page must get:
- Sticky header: `thead th { position: sticky; top: 0; z-index: 2; backdrop-filter: blur(8px); }` — this makes tables usable on scroll
- Sort indicators on column headers: chevron icon that toggles `↑`/`↓` on click, with the sorted column highlighted
- Column width constraints: every table must define explicit `min-width` per column to prevent collapsing
- Row selection: Checkbox column on recovery/signals tables — allows bulk "mark recovered" or "dismiss"
- Empty state: Custom SVG illustration per table context (not generic) — recovery empty, sequences empty, etc.
### 4.5 — Badge & Pill System
Every `.badge` variant must have a `::before` dot indicator `6px × 6px` circle with matching color, slightly pulsing for "live" states. Badges must never truncate — use `white-space: nowrap; overflow: visible` and ensure they don't overflow their containers.
Add `.badge-lg` (14px font, 5px 12px padding) and `.badge-xs` (9px font, 2px 7px padding) for new use cases.
### 4.6 — Status Indicators
Upgrade `StatusDot.svelte`:
- `status-dot--detected`: Blue pulsing ring animation — the ring expands and fades `0 0 0 0 oklch(52% 0.22 264 / 0.4)` → `0 0 0 8px oklch(52% 0.22 264 / 0)` over `1.5s ease-out infinite`
- `status-dot--recovered`: Static green dot, no animation (resolved state)
- `status-dot--sequence_started`: Animated orange ring (in progress)
- `status-dot--churned`: Static red, no animation
- `status-dot--dismissed`: Gray, slightly reduced opacity
### 4.7 — Iconography
Replace all inline SVG paths with a centralized `src/lib/components/ui/Icon.svelte` component:
```svelte
<script lang="ts">
  interface Props {
    name: IconName;
    size?: number;
    class?: string;
  }
</script>
```
Define every icon used in the app as a named export. All icons must be from a consistent visual style — 1.7px stroke width, rounded caps, rounded joins, 24×24 viewBox. Audit every page and replace every ad-hoc SVG with `<Icon name="..." />`.
### 4.8 — Charts & Data Visualization
**Bar charts:** Add value labels on each bar that appear on hover. Add gridlines at 25%, 50%, 75%, 100% of the max value. Labels must be `var(--font-mono)` `11px`.
**Sparkline SVGs:** Add a gradient `<defs>` fill below the line. The gradient should go from `oklch(52% 0.22 264 / 0.2)` at the line to `oklch(52% 0.22 264 / 0)` at the bottom. The line itself should have a subtle `filter: drop-shadow(0 0 4px oklch(52% 0.22 264 / 0.4))`.
**Cohort table cells:** Each retention percentage value should have a color-coded background heatmap — green for high retention, red for low, using `oklch()` interpolation.
**Funnel chart:** Add percentage labels as text elements inside each bar when the bar is wide enough (>15%), outside when too narrow.
### 4.9 — Empty States
Create unique, informative empty states for every table and list in the app. Each must have:
- An SVG illustration (inline, 80px × 80px, using current design tokens)
- A heading (max 6 words)
- A description (max 2 sentences)
- A primary CTA button
- A secondary text link (where applicable)
Empty states needed:
1. Recovery Center — no at-risk accounts (great news state)
2. Sequences — no upcoming emails
3. Sequences — no sent emails
4. Sequences — no failed emails
5. Settings webhook events — no events yet
6. Dashboard — not connected
7. Analytics — insufficient data
### 4.10 — Tooltips
Create `src/lib/components/ui/Tooltip.svelte`:
- Props: `content: string`, `placement?: 'top' | 'bottom' | 'left' | 'right'` (default `top`), `delay?: number` (default 400ms)
- Triggers on `mouseenter` after delay, hides on `mouseleave`
- Animation: `opacity: 0; transform: translateY(4px)` → `opacity: 1; transform: translateY(0)` over `var(--dur-fast) var(--ease-out-expo)`
- Positioned with `position: fixed` to avoid clipping in overflow containers
- Content: `oklch(18% 0.01 255)` background, `1px solid var(--border-hover)`, `var(--radius-sm)`, `box-shadow: var(--shadow-md)`
Apply tooltips to: all icon-only buttons, all truncated text cells, all stat card trend indicators, all badge types in the signals table.
### 4.11 — Dropdown Menus
Create `src/lib/components/ui/Dropdown.svelte`:
- Trigger slot + content slot
- Opens below trigger by default, flips to top if viewport space is insufficient
- Animation: `opacity: 0; transform: translateY(-6px) scale(0.97)` → natural over `var(--dur-base) var(--ease-out-back)`
- Closes on outside click, `Escape`, or item selection
- Items: `40px` height, `12px 16px` padding, hover state, active state, disabled state, separator support
Apply to: the user button area in sidebar, any filter controls that currently use `<select>` elements.
### 4.12 — Notification System
Upgrade `SignalFeed.svelte` into a proper notification system:
- Stack up to 5 toasts maximum, oldest auto-dismisses when limit reached
- Each toast: icon (colored by type), title, optional description, optional action button, close button
- Types: `success`, `error`, `warning`, `info` — each with appropriate `oklch()` accent color
- Toast persistence: `error` toasts persist until manually dismissed
- Sound: the existing beep system — keep but make it configurable via a user preference toggle in Settings
### 4.13 — Semantic DOM Cleanup
Audit every page and fix:
- Every page `<h1>` must be the first heading. Currently `topbar__title` renders an `<h1>` in the header AND pages render their own `<h1>` with `sr-only` — unify this so each page has exactly one `<h1>`, the topbar uses `<p>` or `<div>`
- All `<table>` elements must have `role="table"` with proper `<caption>` elements (visually hidden if needed) for accessibility
- All icon buttons must have `aria-label`
- All toggles must have associated `<label>` elements with `htmlFor` matching input `id`
- All modal dialogs must use `role="dialog"` and `aria-modal="true"`
- All filter tabs must use `role="tablist"` / `role="tab"` / `aria-selected`
- Remove all redundant `id` attributes that serve no functional purpose (hundreds exist in the current DOM)
---
## SECTION 5: COPYWRITING
Rewrite every visible string. Rules:
- Never say "Workspace" when you mean "account"
- Never say "signal" to users who don't know the product — say "risk alert" or "churn alert" in marketing contexts
- Use active voice: "Recovery emails launch automatically" not "Recovery emails are launched automatically"
- Numbers first in stats: "$4,400 at risk" not "At risk: $4,400"
- CTAs: verb-first, specific, immediate: "Start recovery →" not "Go to recovery center"
- Empty states: never apologetic, never generic. "All caught up — no at-risk accounts right now." not "No accounts match this filter."
- Error messages: specific, actionable. "We couldn't save your webhook secret — check that it's at least 16 characters." not "An error occurred."
### 5.1 — Landing Page (`/`)
**Hero eyebrow:** `Stop losing $MRR you could've kept` → `Built for SaaS teams bleeding revenue to silent churn`
**Hero title:** Keep structure, upgrade copy: `Recover customers` / `before they're gone` with `gone` as the accent word.
**Hero subtitle:** `ChurnPulse monitors every billing event across Stripe, Paddle, Lemon Squeezy, and Polar. The moment a customer shows risk — failed payment, cancellation, silence — a personalized recovery sequence fires automatically. Most teams recover their first account within 24 hours.`
**Social proof items:**
1. `Works with Stripe, Paddle, LS & Polar`
2. `First signal detected in under a minute`
3. `Read-only billing access — nothing stored`
**Signal cards copy** (rewrite all descriptions):
- Card Failed: `A failed charge is not churn — it's a timing issue. ChurnPulse catches every declined invoice the moment it happens and fires a recovery email before the customer even notices the lapse.`
- Disengaged: `Fourteen days of silence is early-stage churn, not just inactivity. We surface the exact moment usage drops below the recovery threshold and start re-engagement before the account quietly disappears.`
- Downgraded: `A 20%+ plan drop is a budget signal, not a retention win. ChurnPulse flags the revenue reduction immediately and opens a value-reinforcement sequence while there's still room to grow back.`
- Paused: `Paused subscriptions become cancellations 60% of the time without proactive outreach. We close that gap with a timed reactivation sequence that doesn't feel desperate.`
- Cancelled: `The 30-day win-back window starts the moment they cancel. ChurnPulse gets the first message out within the hour, while your product is still top of mind.`
- High MRR Risk: `An enterprise account showing any risk signal gets an immediate escalation — internal alert to your team and a personalized outreach sequence within minutes, not hours.`
**How it works steps:**
1. Title: `Connect in 60 seconds` — Desc: `OAuth or webhook. No code, no API keys in your codebase. ChurnPulse gets read-only access and starts monitoring the second you authorize.`
2. Title: `Every risk event, captured instantly` — Desc: `Webhooks hit our endpoint the moment billing changes. We classify the signal, score the urgency, and add it to your recovery queue — all before you've seen the notification.`
3. Title: `Recovery runs without you` — Desc: `Signal-specific sequences fire automatically with copy personalized to the customer's value, churn reason, and the specific event that triggered it. You intervene when it matters, ignore the rest.`
**Pricing plan descriptions:**
- Starter: `Everything you need to catch the obvious losses. Core churn detection, automated recovery sequences, and a dashboard that makes the problem impossible to ignore.`
- Growth: `All seven signals, AI-personalized emails, and a recovery system that's paid for itself by the second account it saves. The plan most founders stay on permanently.`
- Scale: `When a single recovered enterprise account covers the cost for the year, this stops being a cost decision and becomes a process one.`
### 5.2 — Dashboard Pages
**Dashboard overview kicker:** `Revenue Intelligence`
**Stat card labels:**
- `At-Risk MRR` → `Revenue at Risk`
- `Recovered MRR` → `Revenue Recovered`
- `Active Signals` → `Open Risk Alerts`
- `Scheduled Today` → `Emails Queued Today`
**Stat card trend copy:** Always include context: `+$2,340 vs last week` → `↑ $2,340 from last week · 7-day view`
**Empty dashboard (not connected):**
- Title: `You're 60 seconds from your first insight`
- Body: `Connect Stripe, Paddle, Lemon Squeezy, or Polar and ChurnPulse starts scoring churn risk across your customer base immediately. No code. Read-only access.`
- CTA: `Connect your billing platform →`
- Secondary: `Explore with sample data →`
**Recovery Center:**
- Page title: `Recovery Center`
- Page subtitle: `{month} · {count} accounts need attention · {totalMrr} at risk`
- Queue cards:
  - Payment: `Failed Payments` / `{n} accounts` / `{mrr} at risk` / CTA: `Start recovery flow →`
  - Cancel: `Cancellation Risk` / same pattern / CTA: `Launch save sequence →`
  - High-Value: `Enterprise Risk` / same pattern / CTA: `Escalate immediately →`
**Table headers (Recovery):** `Account`, `Plan`, `Monthly Value`, `Risk Score`, `Churn Driver`, `Actions`
**Expansion signals labels:** Make every signal name human: `Days overdue` → `Overdue by`, `Last active` → `Last seen`, `Logins this month` → `Logins (30d)`, `MRR decrease` → `Revenue lost`
**Sequences page:**
- Kicker: `Outreach Engine`
- Title: `Every recovery email, tracked in one place`
- Subtitle: `Monitor delivery, intervene on failures, and review sent copy — all without leaving the dashboard.`
- Stat labels: `Sent Today`, `Scheduled This Week`, `Needs Attention`
**Analytics:**
- Page title: `Revenue Analytics`
- Subtitle: `90-day view of churn risk, recovery performance, and customer health signals`
- Quality metric labels: `Detection Coverage`, `Flag Precision`, `Early Warning Power`, `Prediction Calibration`
- Quality label values: Replace generic labels with specific metric explanations beneath each card
**Monitoring:**
- Title: `Model Health`
- Subtitle: `{n} evaluation runs · System status: {status}`
**Playbooks:**
- Title: `Recovery Playbooks`
- Subtitle: `Preview every email sent by ChurnPulse — by signal type, sequence step, and trigger condition`
**Settings:**
- Kicker: `Workspace Configuration`
- Integration card status: `Active` → `Connected · {date}`, `Not connected` → `Not configured`
- Webhook URL label: `Your webhook endpoint`
- Empty webhook events: `No events received yet. Connect a provider and trigger a test to verify delivery.`
### 5.3 — Error & Validation Messages
Document and implement specific messages for every form validation and server error:
- Paddle secret too short: `Paddle signing secrets must be at least 32 characters. Copy it directly from your Paddle dashboard.`
- Polar disconnect confirmation mismatch: `Type "disconnect" exactly to confirm — this will stop all active recovery sequences.`
- Mark recovered success toast: `Recovery recorded. This account is removed from your active queue.`
- Dismiss signal toast: `Alert dismissed. It won't appear in your queue unless a new signal fires.`
- Send sequence now success: `Email sent immediately. The remaining sequence steps continue on schedule.`
- Retry failed email success: `Email retried and sent. Check the Sent tab to confirm delivery.`
---
## SECTION 6: FULL FUNCTIONALITY IMPLEMENTATION
### 6.1 — Zero Placeholder Policy
Audit every interactive element across every page. Any element that currently does nothing must be implemented or removed. Specifically:
**Landing page:**
- Smooth scroll to `#signals`, `#pricing`, `#how-it-works` anchors must work
- Tilt card effect on pricing and signal cards must be implemented in JS (mouse position → CSS transforms)
- Scroll-based reveal for all `.reveal` elements must trigger correctly
- The sticky nav must gain `backdrop-filter: blur(12px); border-bottom: 1px solid var(--border)` when scrolled past 60px
**Demo page (`/demo`):**
- Tab switching must update the URL with `?tab=` param and push to browser history
- Filter buttons (All, Payment, Cancel, High-Value) must filter the table client-side with animation
- Row expansion must work identically to the real recovery center
- "Mark Recovered", "Dismiss", "Send Sequence" buttons must navigate to `/sign-up` with a `?demo_action=recover` query param — the sign-up page must detect this and show a contextual message: `"Create your account to start recovering real customers."`
- The demo mode card must show a pulsing live indicator and a count of `{7} sample alerts active`
**Recovery Center (`/dashboard/recovery`):**
- Bulk selection: clicking the checkbox in `thead` selects all visible rows; individual checkboxes in each row select that row; bulk action bar appears at bottom of page when 1+ selected: "Mark {n} recovered" | "Dismiss {n}"
- Bulk actions must call server actions via `enhance` with the array of signal IDs
- Pagination: if `data.pagination.total > 25`, show page controls at the bottom of the table: "Previous", page numbers (up to 5), "Next"
- The "Run Payment Recovery", "Launch Save Offers", "Escalate to Account Manager" buttons must set the filter and scroll to the table
**Sequences page (`/dashboard/sequences`):**
- The filter form must auto-submit on `<select>` change (no manual "Apply" needed for single-filter changes)
- The date range filter must prevent `from > to` — validate client-side and show an inline error
- "Send now" must show a loading spinner on the button while the server action processes
- Failed emails must show the failure reason when expanded (if stored in the DB, show it; if not, show "Delivery failed — unknown reason. Check your Resend dashboard.")
- "View in Resend" link must appear on sent emails if a `resend_email_id` is available in the DB
**Settings (`/dashboard/settings`):**
- The disconnect Polar confirmation input must live-validate: as the user types, the "Disconnect" button is disabled until the input value exactly equals `disconnect`
- Notification preference form: show success/error inline below the form (not just toast) so users with multiple forms don't miss which one saved
- Webhook events: the time column must show relative time ("2 minutes ago") by default, toggling to absolute time on click
- API keys: the key value must be revealed/hidden with a toggle button (eye icon), not shown in plaintext by default
- Test webhook button (in Settings, under Polar integration): calls `/api/test/webhook` with the org's ID, shows a toast with the result
**Analytics:**
- The "Plan" / "Channel" filter on cancellations chart must actually switch between two different datasets (plan breakdown vs. channel breakdown — fabricate channel data: `Direct`, `SEO`, `Referral`, `Paid`)
- Cohort table rows must be expandable — clicking a row shows a mini sparkline chart of that cohort's MRR over 7 months
- All chart bars must respond to hover with a tooltip showing exact values
**Monitoring:**
- Alert threshold sliders must save their values to `localStorage` (no server persistence needed — this is a UI preference)
- Show "Unsaved changes" indicator if sliders have been moved from their initial values
- "Reset to defaults" button that resets all sliders to their initial server values
**Playbooks:**
- The HTML view tab must have a "Copy HTML" button that writes the email HTML to the clipboard and shows a success toast
- The template sidebar scrolls to the active template on navigation
- Templates must load via client-side navigation without full page reloads — use SvelteKit's `goto()` with `keepFocus: true`
**Email previews (iframe):** Must handle iframe content reloading when the selected template changes — the `$effect` that calls `updatePreview()` must detect content changes and re-render without visible flash.
---
## SECTION 7: ENTERPRISE FEATURE ROADMAP
### 7.1 — The 30-Feature List
Output this as a formatted section in a new file `ENTERPRISE_ROADMAP.md`:
**Priority 1 — Immediate enterprise demand (implement 5 of these):**
1. **Multi-workspace management** — A single login can own and switch between multiple workspaces (different brands, products, or regions). Workspace switcher in the sidebar.
2. **Team members & RBAC** — Invite team members with roles: `Owner`, `Admin` (can configure), `Operator` (can action signals, cannot configure), `Viewer` (read-only). Every action logs who performed it.
3. **SSO/SAML** — Single sign-on via SAML 2.0 or OIDC for enterprise IT compliance. Integrate with Clerk's enterprise SSO.
4. **Audit log export** — Full, immutable audit log of all actions (signal status changes, email sends, configuration changes, logins) exportable to CSV or streamed to a webhook.
5. **Custom email domain & branding** — Send recovery sequences from the customer's own domain (e.g., `support@their-company.com`). Configure via DNS records shown in Settings.
6. **Sequence builder (drag-and-drop)** — Visual editor to build custom multi-step sequences: add/remove/reorder steps, set delay between steps, configure send conditions (e.g., only if not recovered).
7. **A/B testing for sequences** — Split traffic 50/50 between two subject lines or email bodies; dashboard shows open rate, recovery rate, and statistical significance per variant.
8. **Customer health scores** — Composite health score per customer combining: login frequency, feature adoption, NPS response, MRR trend, support ticket volume. Displayed in the recovery center.
9. **Webhook delivery to external systems** — On every signal event, POST a structured payload to a customer-configured URL (Slack, PagerDuty, internal tooling). Retry logic with exponential backoff.
10. **Playbook triggers from health scores** — Trigger sequences not just from billing events but from health score drops below a threshold (requires feature usage tracking integration).
**Priority 2 — Strong differentiation features (implement 5 of these):**
11. **CRM sync (HubSpot, Salesforce)** — Bi-directional sync: push churn signals as deals/tasks in CRM; pull CRM contact data to enrich the recovery center with account owner, deal stage, NPS.
12. **Slack integration** — Real-time Slack notifications for high-MRR signals, recovery wins, and daily digest. Configurable per workspace. Action signals directly from Slack with slash commands.
13. **Revenue forecasting** — Based on current at-risk MRR and historical recovery rate, project next-30-day recovered revenue and at-risk revenue with confidence intervals. Displayed on dashboard.
14. **Churn reason tagging** — Allow operators to manually tag a churn reason after outreach (e.g., "Price", "Competitor", "Feature gap", "Involuntary"). Aggregate into analytics breakdown.
15. **Custom signal conditions** — Define custom churn signals beyond the 7 built-ins. Example: "Customer has >3 support tickets in last 14 days AND MRR > $500." Uses a rules builder UI.
16. **Sequence performance analytics** — Per-sequence open rate, click rate, reply rate, recovery rate, revenue recovered. Trend over time. Compare sequences against each other.
17. **Customer timeline view** — Unified timeline per customer showing: subscription history, all signals fired, all emails sent, replies received, status changes. Single pane of glass.
18. **Suppression lists** — Customers who have explicitly opted out of recovery emails, churned with a refund, or are in active legal disputes — suppressed from all sequences automatically.
19. **Localization / multi-language sequences** — Detect customer locale from billing data and serve recovery emails in their language. AI-powered translation per step.
20. **Monthly recovery report (PDF)** — Auto-generated PDF sent to the workspace owner on the 1st of each month: signals detected, revenue at risk, recovered, at-risk trend, top performers.
**Priority 3 — Competitive moats (do not implement yet, document only):**
21. **Predictive churn scoring** — ML model trained on the customer's own historical data that scores each active customer (0–100) daily, before any billing event fires.
22. **Churn cohort benchmarks** — Compare your churn rate against anonymized, aggregated benchmarks from other ChurnPulse customers in the same MRR range and industry.
23. **SMS & WhatsApp sequences** — Add SMS or WhatsApp touchpoints to recovery sequences for markets where email open rates are low.
24. **In-app message triggers** — Trigger in-app banners or modals via a JavaScript SDK installed in the customer's product — non-email recovery touchpoints.
25. **Contract/renewal intelligence** — For B2B SaaS: track contract end dates, auto-trigger renewal sequences 90/60/30 days out, escalate to AE if MRR exceeds threshold.
26. **Public status page integration** — If an outage caused churn signals (many card failures simultaneously), suppress sequences and instead send an outage-acknowledgment email.
27. **G2/Capterra review request automation** — After a recovery success, automatically request a review from the recovered customer while satisfaction is high.
28. **Customer success handoff** — When a high-MRR account is recovered, automatically create a follow-up task in the CRM and notify the assigned CSM.
29. **Compliance mode (GDPR/CCPA)** — Right-to-erasure workflow: one-click delete all customer PII from the signal store, sequence history, and audit log. Data residency controls (EU vs. US).
30. **White-label mode** — For agencies or embedded tools: remove all ChurnPulse branding, use custom domain for dashboard, custom email footer with the client's brand.
### 7.2 — The 10 Implemented Features
From the list above, implement these 10 fully:
**Implemented from Priority 1:**
1. **Team members & RBAC** (Feature #2)
2. **Audit log export** (Feature #4) — Add real export to CSV functionality on the Settings audit log section
3. **Webhook delivery to external systems** (Feature #9) — In Settings, add a "Outbound Webhooks" section where users can add URLs to receive POST payloads on signal events
4. **Sequence builder** (Feature #6) — A simplified version: allow adding/removing steps and adjusting delays on existing sequence types via a visual UI in Playbooks
5. **Customer health scores** (Feature #8) — Compute a composite score from available data (MRR trend, signal history, days since last signal) and display it in the recovery center
**Implemented from Priority 2:**
6. **Slack integration** (Feature #12) — Configurable Slack webhook URL in Settings; sends rich Block Kit messages for high-MRR signals and daily digest
7. **Revenue forecasting** (Feature #13) — On the dashboard, add a forecast card using historical recovery rate × current at-risk MRR with ±20% confidence band
8. **Churn reason tagging** (Feature #14) — After marking an account recovered or dismissed, show a tagging prompt; aggregate into a new "Churn Reasons" chart on Analytics
9. **Sequence performance analytics** (Feature #16) — Add a "Performance" tab to the Sequences page showing per-signal-type metrics
10. **Customer timeline view** (Feature #17) — Add a `/dashboard/customers/[id]` route accessible from the recovery center row — shows full history for that customer
---
## SECTION 8: IMPLEMENTATION GUIDANCE
### 8.1 — File Modification Order
Work in this exact order to minimize breakage:
1. `app.css` — all token migrations, animation tokens, responsive fixes, component upgrades (largest change, do this completely before anything else)
2. `src/lib/components/ui/` — all new and upgraded UI components (Icon, Modal, Tooltip, Dropdown, Reveal, ThemeToggle, FormField)
3. `src/lib/components/layout/AppShell.svelte` — sidebar animations, topbar upgrade, theme toggle integration, RBAC awareness
4. `src/lib/components/layout/PageTransition.svelte` — new component
5. `src/lib/components/realtime/SignalFeed.svelte` — toast upgrade
6. All dashboard page components in order: `+page.svelte` files for dashboard, recovery, analytics, monitoring, playbooks, sequences, settings
7. `src/routes/+page.svelte` (landing)
8. `src/routes/demo/+page.svelte`
9. All public pages (docs, changelog, pricing, privacy, terms, refund)
10. New enterprise feature server files and routes last
### 8.2 — Svelte 5 Constraints
- Use `$state()`, `$derived()`, `$effect()`, `$props()` throughout — never `writable()`, `readable()`, `derived()` from `svelte/store` in new code
- Use `{#each items as item (item.id)}` — always provide a key expression
- Never use `{:else}` on `{#await}` blocks — handle loading states with `$state` instead
- Use `{@render children()}` for snippet rendering — never `<slot>`
- For transitions that need JS, use `$effect` with manual DOM manipulation — never deprecated `transition:fly` or `transition:fade` Svelte directives (they still work but are semantically inconsistent with Svelte 5 runes)
### 8.3 — CSS Architecture Rules
- Every new CSS rule must use `oklch()` — no hex, no hsl
- Every animation must check `@media (prefers-reduced-motion: reduce)` and either skip or reduce to a simple fade
- No `!important` — fix specificity properly
- Every focus state must be visible and use `oklch(60% 0.2 255)` as the focus ring color (accessible against both dark and light backgrounds)
- `z-index` hierarchy: base content `1`, sticky headers `10`, sidebar `20`, dropdowns `30`, modals `40`, toasts `50`, tooltips `60`
### 8.4 — Accessibility Requirements
Every page must pass WCAG 2.1 AA:
- Minimum contrast ratio 4.5:1 for body text, 3:1 for large text and UI components
- All oklch token combinations used for text-on-background must be verified against this standard
- Keyboard navigation must work on every interactive element — custom dropdowns, modals, tables with row actions
- `aria-live="polite"` on toast container, `aria-live="assertive"` on error messages only
- Skip-to-main-content link as the very first element in `<body>`
### 8.5 — Performance Requirements
- No animation should block the main thread — use CSS transforms and opacity only (never `width`, `height`, `top`, `left`, `margin` in animations)
- Every `$effect` that adds DOM event listeners must return a cleanup function
- `IntersectionObserver` instances must be disconnected on component unmount
- Charts that use `requestAnimationFrame` for draw-on animations must cancel the frame on unmount
- All new components that are not used in the critical render path should be lazy-loaded with Svelte's `{#await import(...)}` pattern
### 8.6 — TypeScript Requirements
- Every new component must have full TypeScript props with `interface Props`
- Every new server file must be fully typed — no `any`, no untyped `data` variables
- `src/lib/types.ts` must be updated with any new types needed by implemented enterprise features
- New database operations must use the existing `admin` client from `src/lib/server/admin.ts` — never create new Supabase clients
### 8.7 — Testing the Implementation
After completing all changes, verify:
1. Run `bun run check` — zero TypeScript errors
2. Run `bun run build` — zero build errors
3. Load every route at 375px width — zero horizontal overflow
4. Load every route at 1440px — all grids correct
5. Toggle between dark and light mode — no FOUC (flash of unstyled content)
6. Tab through the recovery center table — keyboard navigation works for expand/collapse
7. Create a signal via `/api/test/webhook` — toast fires, table updates, sequence schedules
8. All new enterprise features (team members, webhooks, health scores, etc.) must have corresponding database migrations documented in `MIGRATIONS.md`
---
## SECTION 9: DELIVERABLES CHECKLIST
Every file you output must be complete. At the end of your work, confirm:
- [ ] `app.css` — full oklch migration, animation tokens, all component upgrades, responsive fixes, light mode
- [ ] `src/lib/components/ui/Icon.svelte` — all icons centralized
- [ ] `src/lib/components/ui/Modal.svelte` — accessible modal system
- [ ] `src/lib/components/ui/Tooltip.svelte` — positioned tooltip
- [ ] `src/lib/components/ui/Dropdown.svelte` — keyboard-navigable dropdown
- [ ] `src/lib/components/ui/Reveal.svelte` — scroll reveal with stagger
- [ ] `src/lib/components/ui/ThemeToggle.svelte` — dark/light toggle
- [ ] `src/lib/components/ui/FormField.svelte` — unified form field
- [ ] `src/lib/components/layout/AppShell.svelte` — sidebar animations, ink bar, RBAC awareness
- [ ] `src/lib/components/layout/PageTransition.svelte` — page transition wrapper
- [ ] `src/lib/components/realtime/SignalFeed.svelte` — upgraded toast system
- [ ] All dashboard `+page.svelte` files — full copy rewrites, animation wrappers, full functionality
- [ ] `src/routes/+page.svelte` — landing page fully animated, tilt cards, smooth scroll, all copy rewritten
- [ ] `src/routes/demo/+page.svelte` — fully functional demo with working filters
- [ ] All 10 enterprise features — server routes, page components, and DB migration docs
- [ ] `ENTERPRISE_ROADMAP.md` — all 30 features documented
- [ ] `MIGRATIONS.md` — SQL migrations for any new tables (team_members, outbound_webhooks, churn_tags, health_scores, customer_timelines)
- [ ] Zero placeholder text ("Coming soon", "TODO", "In a real app...") anywhere in the UI
- [ ] Zero hex or hsl color values anywhere in CSS
- [ ] Zero unkeyed `{#each}` blocks in Svelte components
