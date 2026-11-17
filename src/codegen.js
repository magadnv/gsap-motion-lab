/**
 * Turns the state into GSAP tween vars, and later into code you can copy.
 *
 * Rule: only values that differ from GSAP's defaults (or from a property's
 * neutral value) are included. The preview uses the very same vars,
 * so what you see is exactly what you copy.
 */
import { PROPERTIES, TIMING, GSAP_DEFAULT_EASE } from "./config.js";

/** Round away floating point noise like 0.30000000000000004. */
export function clean(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Build the vars object for gsap.to / gsap.from.
 * Order matters for readability: properties first, then timing, then ease.
 */
export function buildTweenVars(state) {
  const vars = {};

  for (const prop of PROPERTIES) {
    const value = clean(state[prop.key]);
    if (value !== prop.neutral) vars[prop.key] = value;
  }

  for (const timing of TIMING) {
    const value = clean(state[timing.key]);
    if (value !== timing.gsapDefault) vars[timing.key] = value;
  }

  if (state.yoyo) vars.yoyo = true;
  if (state.ease !== GSAP_DEFAULT_EASE) vars.ease = state.ease;

  return vars;
}
