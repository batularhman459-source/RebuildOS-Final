---
version: 1.0
name: RebuildOS
description: A calm, premium execution app. Light, quiet surfaces for planning; deep charcoal "stages" for doing and returning, lit from within by a warm apricot glow. The user's own Action is the hero of every stage, set large and centred. No cards on cards, no drop shadows, no decorative chrome. One signature — the four-point Rebuild star — and one exception to restraint — the Apricot glow, used only on dark stages.

colors:
  # Light (planning) surfaces
  canvas: "#F7F6F4"
  surface: "#FFFFFF"
  surface-muted: "#EFEDEA"
  surface-frosted: "rgba(255,255,255,0.75)"
  hairline: "#E9E7E3"
  hairline-frosted: "rgba(29,28,27,0.07)"
  control-outline: "#B5B0A9"

  # Text on light
  ink: "#1D1C1B"
  ink-secondary: "#4F4B46"
  ink-muted: "#6E6A64"
  ink-done: "#8F8A83"

  # Dark (doing) stages
  stage: "#121110"
  on-stage: "#FFFFFF"
  on-stage-secondary: "rgba(255,255,255,0.90)"
  on-stage-muted: "rgba(255,255,255,0.74)"
  on-stage-control: "rgba(255,255,255,0.12)"

  # Apricot (brand)
  apricot-light: "#FFE3CC"
  apricot-mid: "#F49A70"
  apricot: "#EE7D52"
  apricot-text: "#B4471A"

  # Semantic (real errors only — never for missed or late work)
  error: "#C2361F"

typography:
  stage-title:    { fontFamily: "Sora", fontSize: 44px, fontWeight: 600, lineHeight: 1.04, letterSpacing: -0.045em }
  screen-title:   { fontFamily: "Sora", fontSize: 40px, fontWeight: 600, lineHeight: 1.0,  letterSpacing: -0.045em }
  section-title:  { fontFamily: "Sora", fontSize: 22px, fontWeight: 600, lineHeight: 1.2,  letterSpacing: -0.035em }
  timer:          { fontFamily: "Sora", fontSize: 116px, fontWeight: 200, lineHeight: 1.0, letterSpacing: -0.06em, fontVariantNumeric: tabular-nums }
  moment:         { fontFamily: "Fraunces", fontSize: 52px, fontWeight: 400, lineHeight: 1.0, letterSpacing: -0.03em, fontVariationSettings: "'opsz' 144" }
  body:           { fontFamily: "Roboto Flex", fontSize: 17px, fontWeight: 400, lineHeight: 1.47, letterSpacing: -0.015em }
  body-strong:    { fontFamily: "Roboto Flex", fontSize: 17px, fontWeight: 600, lineHeight: 1.47, letterSpacing: -0.01em }
  secondary:      { fontFamily: "Roboto Flex", fontSize: 15px, fontWeight: 400, lineHeight: 1.45, letterSpacing: -0.01em }
  label:          { fontFamily: "Roboto Flex", fontSize: 14px, fontWeight: 600, lineHeight: 1.3,  letterSpacing: 0 }
  button:         { fontFamily: "Roboto Flex", fontSize: 17px, fontWeight: 600, lineHeight: 1.0,  letterSpacing: -0.01em }
  tab:            { fontFamily: "Roboto Flex", fontSize: 14px, fontWeight: 600, lineHeight: 1.0,  letterSpacing: 0 }

spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  row: 56px
  touch-min: 44px

rounded:
  sm: 8px
  md: 14px
  lg: 22px
  sheet: 28px
  pill: 9999px
  full: 50%

motion:
  press: { transform: "scale(0.96)", duration: 120ms, easing: "ease" }
  standard: { duration: 240ms, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
  stage-expand: { duration: 420ms, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }

effects:
  apricot-glow: "radial-gradient(closest-side, rgba(238,125,82,0.62) 0%, rgba(238,125,82,0.36) 30%, rgba(255,227,204,0.08) 64%, rgba(18,17,16,0) 100%)"
  grain: "static 128px tiled PNG (src/assets/grain.png): light and dark specks at very low alpha; no SVG filter, no blend mode"
  frosted: "background rgba(255,255,255,0.86); backdrop-filter: blur(10px); 1px {colors.hairline-frosted} border"
  star-gradient: "linear-gradient(160deg, #FFF6EE 0%, #FFE3CC 55%, #F49A70 100%)"
---

# RebuildOS Design System

This file is the source of truth for how RebuildOS looks and feels. Read it before writing any UI. When it conflicts with a reference (Apple, ElevenLabs, a screenshot), **this file wins**. Product behaviour lives in `docs/product-brief.md`; this file covers only the visual and interaction layer.

Reference designs: the "v4" row of the RebuildOS Visual Direction canvas (Today, Focus, Plan, A smaller day, Welcome back).

## 1. The idea

**Light for planning, dark for doing.**

- **Light screens** (Plan, Progress, lists, forms) are quiet overviews: warm off-white canvas, plain lists, thin hairlines, no boxes.
- **Dark stages** (the top of Today, Focus, A smaller day, Welcome back) are the moments that matter: one large centred message on deep charcoal, lit from within by the Apricot glow.

**The user's Action is the product.** Apple puts an iPhone on a stage; RebuildOS puts *"Write landing page copy"* there. On any stage, the user's own words are the largest thing on screen, not a label like "Today" or "Main action".

### Principles

1. **One thing per stage.** A stage holds one message, at most two lines of support, and at most one primary button.
2. **Position and size explain; labels are a last resort.** If something is biggest and first, it does not need "Main action" written above it.
3. **No cards on cards.** Light content sits directly on the canvas, separated by hairlines. The colour change between stage and canvas is the strongest divider we use.
4. **No drop shadows.** Depth comes from the light/dark change, hairlines and frosted glass. Nothing floats on a shadow.
5. **Restraint makes the glow special.** The Apricot glow appears only on dark stages. Everywhere else, apricot is a dot, a star or a single label.
6. **Thumbs first.** Primary actions sit in the bottom third of the screen.
7. **Never make the user feel behind.** No red for late or missed work, no warning colours, no counters of what wasn't done.

## 2. Colour

### Light surfaces
| Token | Hex | Use |
|---|---|---|
| `canvas` | #F7F6F4 | Default background of every light screen. Warm off-white, not cream. |
| `surface` | #FFFFFF | Rare: sheets, inputs. Not used for list containers. |
| `surface-muted` | #EFEDEA | Quiet chips (e.g. "On Today"), secondary pill fills. |
| `hairline` | #E9E7E3 | 1px dividers between rows and sections. |
| `control-outline` | #B5B0A9 | Unchecked check-circle outline. |

### Text on light
| Token | Hex | Use | Contrast on canvas |
|---|---|---|---|
| `ink` | #1D1C1B | Titles, body, primary buttons (as fill) | 16:1 |
| `ink-secondary` | #4F4B46 | Secondary body, tertiary buttons | 8:1 |
| `ink-muted` | #6E6A64 | Meta, captions, labels | 5:1 |
| `ink-done` | #8F8A83 | Completed Actions only, always with strikethrough | 3.2:1 (state is also shown by the filled check) |

### Dark stages
| Token | Value | Use |
|---|---|---|
| `stage` | #121110 | Every dark stage. Near-black with a warm bias. |
| `on-stage` | #FFFFFF | Stage titles, timer, primary pill fill. |
| `on-stage-secondary` | white 90% | Supporting line under a stage title; any small text that may sit over the glow. |
| `on-stage-muted` | white 74% | Date, Mission name, meta — only where the glow is faint. |
| `on-stage-control` | white 12% | Round icon buttons (close, pause) on stages. |

### Apricot
| Token | Hex | Use |
|---|---|---|
| `apricot-light` | #FFE3CC | Glow outer stop; star highlight. |
| `apricot-mid` | #F49A70 | Star gradient end. |
| `apricot` | #EE7D52 | Glow core; solid star and dot on light surfaces. |
| `apricot-text` | #B4471A | The only apricot allowed as text on light (5.0:1). Used for one emphasis label per screen at most (e.g. "One step forward"). |

**Never:** white text on `apricot` (fails contrast), apricot as a button fill, apricot as a large text colour, or any red/orange for overdue or missed states (there are none).

## 3. Typography

Three families, each with one job.

| Family | Job | Weights |
|---|---|---|
| **Sora** | Titles, the user's Actions on stages, Mission names, all big numbers | 600 for titles, 200 for the timer |
| **Roboto Flex** | Everything read or tapped: body, lists, buttons, labels, tabs | 400 and 600 only |
| **Fraunces** | Rare human moments where the app speaks to the user: "Welcome back.", "A smaller day.", finishing a day, completing a Mission | 400, italic on the final word |

### Scale
| Token | Size / weight / leading / tracking | Use |
|---|---|---|
| `stage-title` | 44 / 600 / 1.04 / −0.045em | The Main Action on Today's stage |
| `screen-title` | 40 / 600 / 1.0 / −0.045em | "Plan", "Progress" |
| `section-title` | 22 / 600 / 1.2 / −0.035em | Mission names, the first Rebuild slot |
| `timer` | 116 / 200 / 1.0 / −0.06em, tabular | Focus timer |
| `moment` | 52 / 400 / 1.0 / −0.03em, opsz 144 | Fraunces moments |
| `body` | 17 / 400 / 1.47 / −0.015em | Default text, list rows |
| `secondary` | 15 / 400 | Meta lines, supporting text |
| `label` | 14 / 600 | Small labels, sentence case |
| `button` | 17 / 600 | All primary and secondary buttons |
| `tab` | 14 / 600 | Dock tabs |

### Rules
- **Body is 17px**, not 16. It sets a calmer reading pace.
- **Tight tracking on everything 20px and up** (−0.03 to −0.06em). Never tighten below 15px.
- **Weights are 200 / 400 / 600.** No 500, no 700. Big numbers go light; titles go 600.
- **Sentence case everywhere.** No uppercase eyebrow labels in V1.
- **Numbers that line up use tabular figures** (timer, durations, record).
- Headlines use `text-wrap: balance`.

## 4. Layout and spacing

- **Base unit 4px.** Common steps: 8, 12, 16, 24, 32, 48.
- **Screen gutter 24px** for content; **20px** for the floating dock.
- **List rows** are at least 52–56px tall; tap targets at least 44×44px.
- **Stage heights** (390×844 reference): Today 532px (~63%), A smaller day 330px; Focus and Welcome back are full-screen.
- **Top safe area:** content starts ~56–64px from the top; the dock sits 26px above the bottom.
- When a list is long, the Today stage collapses as the user scrolls (to a compact bar showing the Main Action and a Start button); it never scrolls off entirely.

## 5. Depth and effects

| Level | Treatment | Use |
|---|---|---|
| Flat | `canvas`, no border | Light screens |
| Hairline | 1px `hairline` | Between rows and Mission sections |
| Frosted | `surface-frosted`, blur 20, saturate 180%, 1px `hairline-frosted` | Floating dock and add button; nothing else |
| Stage | `stage` + Apricot glow + grain | Dark stages only |

**No `box-shadow` anywhere in the product UI.**

### The Apricot glow
- **Contrast rule:** small text (under 24px) must reach 4.5:1 against the *brightest* part of the glow behind it, and large text 3:1. Automated checkers can't measure text over gradients, so this was measured on the rendered screens; keep the glow core at 62% opacity or lower and position it below small text.
- A **radial gradient** (`effects.apricot-glow`) placed behind the stage's main message, usually centred horizontally and slightly below the title.
- Always paired with **grain** (`effects.grain`). Grain is what stops the gradient looking flat and computer-made. Never ship the glow without it.
- Only on `stage` backgrounds. Never on light surfaces, buttons, cards or text.
- Its size may grow subtly while Focus runs; it never pulses or loops.

### The Rebuild star
The four-point star is the only brand mark.
- **On dark:** filled with `effects.star-gradient`, large (≈120px) on Welcome back.
- **On light:** solid `apricot`, small (12–16px): the "On Today" chip, the seven-day row on Progress.
- Never decorative filler. If a star appears, it means something (an active day, the brand, "on Today").

## 6. Components

### Stage
Dark, full-bleed (no radius, edge to edge), `stage` + glow + grain. Content centred. Contains, top to bottom: optional quiet context line (date or Mission), the main message (`stage-title` or `moment`), up to one supporting line, one primary pill.

### Buttons
| Variant | Look | Use |
|---|---|---|
| **Primary on stage** | White pill, `ink` text, 52–60px tall | "Start focus", "Finish", "Start with a small day" |
| **Primary on light** | `ink` pill, white text, 56px tall, full width at screen bottom | "Start this day", form submits |
| **Compact primary** | `ink` pill, 40px tall, `label`-sized text | "Today" on a Mission in Plan |
| **Text button** | No fill, `ink-secondary` (light) or `on-stage-secondary` (dark), `button` type | "Go to Today", "Swap", "Undo" |
| **Round icon** | 44px circle, `on-stage-control` (dark) or `surface` + hairline (light) | Close, back |
| **Pause** | 60px circle, white 16% | Focus only |

All buttons: `motion.press` on press, visible focus ring (2px `apricot` on dark, 2px `ink` on light, 2px offset).

### List row
Directly on `canvas`, `body` text, 1px `hairline` bottom border (none on the last row). Leading 22px check-circle (1.5px `control-outline`; done = filled `ink` with white tick), inside a 44px hit area. Optional trailing meta in `secondary` / `ink-muted`. Completed rows: `ink-done` + strikethrough, sorted to the bottom.

### Mission section (Plan)
No card. Top hairline, 18px vertical padding. Row 1: name (`section-title`) with trailing meta (time invested or target date, `ink-muted`). Row 2: "Next: …" (`body`, `ink-secondary`) with a compact primary "Today" button, or a muted "On Today" chip with a small apricot star if it's already there.

### Rebuild slot
Plain row. Small label (`label`, `ink-muted`; first slot uses `apricot-text`), then the Action. The first slot ("One step forward") uses `section-title` and may carry one supporting line; the other two use `body`. Trailing "Swap" text button.

### Dock
Floating at the bottom, 20px from each side. A frosted pill with three equal tabs (Today, Plan, Progress) and, beside it, a 58px frosted circle with "+" (Add). Active tab: `ink` pill, white text. Inactive: `ink-secondary`. Hidden on Focus, A smaller day and Welcome back.

### Sheet
Bottom sheet for quick add, swap and install prompts. `surface`, top radius 28px, grab handle, scrim `rgba(18,17,16,0.38)`. No shadow.

### Quiet notice
One-line, non-blocking info such as "2 Actions moved to Later · Undo": `surface-muted` pill-shaped row, `secondary` text, trailing text button. Never more than one at a time, never red.

## 7. Motion

- **Press:** every tappable element scales to 0.96 over 120ms.
- **Standard transitions:** 240ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Today → Focus:** the Today stage expands to fill the screen (420ms); the glow grows; the title shrinks to the small line above the timer while the timer fades in. Reverse on finish.
- **Completing an Action:** the check fills, the row settles to the bottom of the list. No confetti, no bounce.
- **Never** animate to attract attention (no pulsing badges, no looping glow).
- **Sheets** move like iOS sheets: 0.42s in on `cubic-bezier(0.32, 0.72, 0, 1)`, 0.28s out, and can be dragged down from the top strip to close.
- **Tabs** cross-fade (0.18s, opacity only).
- **Ticking a task** pops the circle (scale 1 → 1.22 → 1) and draws the tick; only for the tap that just happened.

### Performance rules (iPhone)
Tested on an iPhone 15 Pro, live effects made motion choppy. Keep to these:
- Animate only `transform` and `opacity`. No `clip-path`, `filter`, width/height or layout-shifting animations.
- Grain is a **static image**, never a live SVG filter; no `mix-blend-mode` on large areas.
- Keep `backdrop-filter` to small floating elements (the dock) and light (≤ 10px).
- Large layers that change (the glow) get `will-change: transform` and change rarely, in small steps.
- Don't wrap screens in transformed containers: it breaks `position: fixed` overlays.
- Respect `prefers-reduced-motion`: replace movement with instant changes or short cross-fades.

## 8. Copy and tone

- Warm, direct, plain. Speak like a friend who has their life together.
- Sentence case. Verbs on buttons ("Start focus", "Start this day", not "OK").
- Name things the way users think of them: **Goals, Tasks, Habits, Today, Upcoming, Someday**. The top task on Today is "Up next"; "Do this first" makes a task the one up next.
- **Banned:** "overdue", "missed", "failed", "streak", "you only did…", exclamation marks in system copy, hustle or motivational quotes.
- Numbers are honest and real units: "41h 20m focused", "96 actions done". Never points.

## 9. Accessibility

- Text contrast ≥ 4.5:1 (≥ 3:1 for 24px+). Exceptions: completed-Action text, whose state is also carried by the filled check.
- Touch targets ≥ 44×44px.
- Real `<button>` and `<a>` elements; icon-only buttons have `aria-label`.
- Visible keyboard focus on every control.
- Reduced motion respected.
- Don't rely on apricot alone to convey state; pair it with shape or text.

## 10. Theme scope (V1)

V1 ships one theme: light screens with dark stages. A full system dark mode is postponed. When it comes, light screens move to a dark canvas and stages stay as they are, so the stage must remain distinguishable (the glow carries that).

## 11. Do and don't

**Do**
- Put the user's own words on the stage, large and centred.
- Separate light content with hairlines and space, not boxes.
- Keep one primary button per screen, near the thumb.
- Use the glow only on dark stages, always with grain.

**Don't**
- Wrap lists or sections in white cards with shadows.
- Add labels the layout already explains.
- Use apricot as a fill for buttons or as body text.
- Add a second accent colour.
- Show anything that makes the user feel behind.
