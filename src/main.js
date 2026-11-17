/**
 * Motion Lab: entry point.
 * Wires the modules together. All data flows through the store:
 *
 *   controls ──setState──▶ state ──subscribe──▶ controls.sync
 *                                          ├──▶ code panel
 *                                          ├──▶ URL (shareable link)
 *                                          └──▶ preview.update
 */
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/controls.css";

import { getState, setState, resetState, subscribe } from "./state.js";
import { createControls } from "./controls.js";
import { createPreview } from "./preview.js";
import { createEaseCurve } from "./easeCurve.js";
import { generateCode, highlightCode } from "./codegen.js";
import { bindCopyButton } from "./clipboard.js";
import { readUrlState, writeUrlState, shareUrl } from "./urlState.js";

const $ = (selector) => document.querySelector(selector);

// A shared link restores its animation before anything renders.
setState(readUrlState());

const easeCurve = createEaseCurve();
const controls = createControls($("[data-controls]"), { setState, easeCurve });

const preview = createPreview({
  root: $("[data-boxes]"),
  progress: $("[data-progress]"),
  playButton: $('[data-action="play"]'),
  replayButton: $('[data-action="replay"]'),
  onTick: easeCurve.setTime,
});

const codeOutput = $("[data-code]");
const announcer = $("[data-announcer]");

function render(state) {
  controls.sync(state);
  codeOutput.innerHTML = highlightCode(state);
}

// The address bar always holds a shareable link. Debounced, because Safari
// throws if history.replaceState is called too often (e.g. while dragging).
let urlTimer = 0;
const syncUrl = (state) => {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => writeUrlState(state), 250);
};

subscribe((state) => {
  render(state);
  syncUrl(state);
  preview.update(state); // every change replays the animation
});

bindCopyButton($('[data-action="copy-code"]'), () => generateCode(getState()), announcer);
bindCopyButton($('[data-action="copy-link"]'), () => shareUrl(getState()), announcer);
$('[data-action="reset"]').addEventListener("click", resetState);

// Keyboard: R replays (ignored while typing in a field).
document.addEventListener("keydown", (event) => {
  const typing = event.target.closest("input, select, textarea");
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === "r" || event.key === "R") preview.replay();
});

// First render. With "reduce motion" turned on in the OS, nothing plays
// by itself on load; every animation after that is one the user asked for.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const initial = getState();
render(initial);

// Reveal once the fonts are in (max. 800 ms), so nothing jumps after showing,
// and only then start the first animation so it isn't missed.
Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]).then(() => {
  document.body.classList.add("is-ready");
  preview.update(getState(), { immediate: true, autoplay: !prefersReducedMotion });
});
