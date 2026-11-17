/**
 * Motion Lab: entry point.
 * Wires the modules together. All data flows through the store:
 *
 *   controls ──setState──▶ state ──subscribe──▶ controls.sync
 *                                          ├──▶ code panel
 *                                          └──▶ preview.update
 */
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/controls.css";

import { getState, setState, subscribe } from "./state.js";
import { createControls } from "./controls.js";
import { createPreview } from "./preview.js";
import { createEaseCurve } from "./easeCurve.js";
import { generateCode, highlightCode } from "./codegen.js";
import { bindCopyButton } from "./clipboard.js";

const $ = (selector) => document.querySelector(selector);

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

subscribe((state) => {
  render(state);
  preview.update(state); // every change replays the animation
});

bindCopyButton($('[data-action="copy-code"]'), () => generateCode(getState()), announcer);

// First render.
const initial = getState();
render(initial);
preview.update(initial, { immediate: true });
document.body.classList.add("is-ready");
