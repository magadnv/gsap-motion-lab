/**
 * Code generation.
 *
 * Rule: only values that differ from GSAP's defaults (or from a property's
 * neutral value) are written. The preview plays the very same vars object,
 * so what you see is exactly what you copy.
 */
import { PROPERTIES, TIMING, GSAP_DEFAULT_EASE, TARGET_SELECTOR } from "./config.js";

/** Round away floating point noise like 0.30000000000000004. */
export function clean(value) {
  return Math.round(value * 1000) / 1000;
}

const timingDefault = (key) => TIMING.find((t) => t.key === key).gsapDefault;

/**
 * Build the vars object for gsap.to / gsap.from.
 * Key order is the order people usually write it in:
 * properties, duration, delay, ease, then the sequencing options.
 */
export function buildTweenVars(state) {
  const vars = {};

  for (const prop of PROPERTIES) {
    const value = clean(state[prop.key]);
    if (value !== prop.neutral) vars[prop.key] = value;
  }

  const addTiming = (key) => {
    const value = clean(state[key]);
    if (value !== timingDefault(key)) vars[key] = value;
  };

  addTiming("duration");
  addTiming("delay");
  if (state.ease !== GSAP_DEFAULT_EASE) vars.ease = state.ease;
  addTiming("stagger");
  addTiming("repeat");
  // yoyo without repeat does nothing, so it's left out
  if (state.yoyo && state.repeat !== 0) vars.yoyo = true;

  return vars;
}

/**
 * The code as a list of [type, text] tokens. Rendering to plain text
 * (for the clipboard) and to highlighted HTML (for display) share this.
 */
function tokenize(state) {
  const vars = buildTweenVars(state);
  const entries = Object.entries(vars);
  const tokens = [
    ["fn", `gsap.${state.direction}`],
    ["pun", "("],
    ["str", `"${TARGET_SELECTOR}"`],
    ["pun", ", {"],
  ];

  if (entries.length === 0) {
    tokens.push(["pun", "});"]);
    return tokens;
  }

  for (const [key, value] of entries) {
    tokens.push(["txt", "\n  "], ["key", key], ["pun", ": "]);
    tokens.push(typeof value === "string" ? ["str", `"${value}"`] : ["num", String(value)]);
    tokens.push(["pun", ","]);
  }
  tokens.push(["txt", "\n"], ["pun", "});"]);
  return tokens;
}

/** Plain code, ready for the clipboard. */
export function generateCode(state) {
  return tokenize(state)
    .map(([, text]) => text)
    .join("");
}

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Same code as HTML with <span class="t-…"> wrappers for syntax colors. */
export function highlightCode(state) {
  return tokenize(state)
    .map(([type, text]) =>
      type === "txt" ? escapeHtml(text) : `<span class="t-${type}">${escapeHtml(text)}</span>`,
    )
    .join("");
}
