/**
 * Motion Lab: entry point.
 * Wires the modules together: state -> preview (and later controls, code, URL).
 */
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";

import { getState, subscribe } from "./state.js";
import { createPreview } from "./preview.js";

const $ = (selector) => document.querySelector(selector);

const preview = createPreview({
  root: $("[data-boxes]"),
  progress: $("[data-progress]"),
  playButton: $('[data-action="play"]'),
  replayButton: $('[data-action="replay"]'),
});

// Every change replays the animation.
subscribe((state) => preview.update(state));

// First render.
preview.update(getState(), { immediate: true });
document.body.classList.add("is-ready");
