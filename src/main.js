/**
 * Motion Lab: entry point.
 * Wires the modules together. All data flows through the store:
 *
 *   controls ──setState──▶ state ──subscribe──▶ controls.sync
 *                                          └──▶ preview.update
 */
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/controls.css";

import { getState, setState, subscribe } from "./state.js";
import { createControls } from "./controls.js";
import { createPreview } from "./preview.js";

const $ = (selector) => document.querySelector(selector);

const controls = createControls($("[data-controls]"), { setState });

const preview = createPreview({
  root: $("[data-boxes]"),
  progress: $("[data-progress]"),
  playButton: $('[data-action="play"]'),
  replayButton: $('[data-action="replay"]'),
});

subscribe((state) => {
  controls.sync(state);
  preview.update(state); // every change replays the animation
});

// First render.
const initial = getState();
controls.sync(initial);
preview.update(initial, { immediate: true });
document.body.classList.add("is-ready");
