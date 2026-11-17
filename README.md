# Motion Lab

A small visual playground for [GSAP](https://gsap.com) tweens.
Tune an animation with sliders, watch it play live, copy the code into your project.

![Motion Lab: controls on the left, live preview of five staggered boxes, generated GSAP code below](docs/screenshot.png)

**Live:** [gsap-motionlab.vercel.app](https://gsap-motionlab.vercel.app)

## Who it's for

Mira, 27, frontend developer at a small agency. She knows `gsap.to()` from a course. The Figma file says *"smooth, a bit playful"*, so she types an ease, saves, reloads, squints, and repeats that twenty times. Motion Lab lets her compare five versions in a minute, send the designer a link, and paste the one that gets the nod.

The intro page at `/` is written for her; the tool itself lives at `/lab/`.

## Features

- **Live preview.** Every change replays the animation automatically. Play/Pause and Replay are there too (or press `R`).
- **Boxes or text.** Animate five boxes, or a headline split into words, letters or lines with GSAP's SplitText. Type your own text, switch on **mask** for the classic editorial reveal where each piece slides in from behind its own edge.
- **Timeline.** Chain up to five steps. Each step has its own direction, properties, ease and stagger, plus an **offset** that becomes GSAP's position parameter (`"-=0.2"` overlaps, `"+=0.3"` waits). One step stays a plain tween, two or more become a `gsap.timeline()`.
- **ScrollTrigger.** Turn on scroll and the preview becomes its own little scrolling page. Pick start and end, scrub or play-once, show markers. Replay glides through it for you.
- **All the basics.** `from` / `to`, `x`, `y`, `rotation`, `scale`, `opacity`, `duration`, `stagger`, plus `delay`, `repeat` (`-1` = forever) and `yoyo` for the whole animation. Each value has a slider and a number field.
- **Ease picker with curve.** Every common GSAP ease (`none`, `power1` to `power4`, `back`, `elastic`, `bounce`, `expo`, `circ`, `sine`, each as `in` / `out` / `inOut`). The curve is drawn from GSAP's own ease function, overshoot included, and a dot follows it while the preview plays.
- **Clean code output.** Only values that differ from GSAP's defaults are written, plugins are registered only when needed. One click copies it.
- **Shareable links.** All settings live in the URL with readable keys (`?target=words&s1=from,y:60,opacity:0&s2=to,y:-24,offset:-0.1`). Copy the link and the exact animation opens for anyone. Invalid values in a hand-edited link are ignored, text from a link is only ever inserted as plain text.
- **Reset** returns to the starting animation. Double-click a single label to reset just that value.
- Responsive: on phones the preview stays pinned at the top while you scroll through the controls. Keyboard friendly, respects `prefers-reduced-motion` on load.

## Run it locally

Requires Node.js 18 or newer.

```bash
git clone https://github.com/magadnv/gsap-motion-lab.git
cd gsap-motion-lab
npm install
npm run dev        # intro: http://localhost:5880  lab: http://localhost:5880/lab/
```

```bash
npm run build      # production build into dist/
npm run preview    # serve the build locally
```

## How it works

One state object is the single source of truth: the element, a list of steps, and the settings for the whole animation. Controls write to it; everything else re-renders from it.

```
controls ──actions──▶ state ──subscribe──▶ controls (sync inputs)
                                      ├──▶ code panel
                                      ├──▶ URL
                                      └──▶ preview
```

`animation.js` turns the state into one plain description (steps, vars, position parameters, ScrollTrigger and SplitText settings). The preview plays that description and the code panel prints it, so what you see is exactly what you copy.

```
index.html        intro page (/)
lab/index.html    the tool (/lab/)
src/
├─ landing/       intro page: reveals and the small ease demo (reuses the lab modules)
├─ main.js        wires the lab modules together
├─ config.js      ranges, defaults, ease list, presets (change numbers here)
├─ state.js       tiny observable store with step actions
├─ animation.js   state -> description of the animation (shared by preview and code)
├─ controls.js    builds the panel from config.js
├─ preview.js     boxes or split headline, timeline, ScrollTrigger in its own scroller
├─ easeCurve.js   SVG curve from gsap.parseEase()
├─ codegen.js     description -> code (plain + highlighted)
├─ urlState.js    state <-> query string
├─ clipboard.js   copy with "Copied!" feedback
└─ styles/        tokens.css (all colors as CSS variables), base, layout, controls
```

Adding a new property (say `skewX`) is one line in `PROPERTIES` in `config.js`: the slider, the code output and the URL support follow from it.

## Tech stack

- [Vite](https://vite.dev)
- Vanilla JavaScript (ES modules), no framework
- [GSAP 3](https://gsap.com) with ScrollTrigger and SplitText
- Plain CSS with custom properties
- Fonts: Geist and Geist Mono

No backend, no tracking, no login.

## Roadmap

Done since V1: timeline with several steps, ScrollTrigger, text as your own element, a pinned preview on phones.

Next ideas:

- Stagger options (`from: "center"`, `"random"`, grids)
- `transformOrigin`, `skew`, `clipPath`
- Lines that re-split on resize (`autoSplit`) in the exported code
- Paste your own SVG or image as the element
- Export as a CodePen

## License

[MIT](LICENSE)
