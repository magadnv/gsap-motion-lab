/**
 * Turns the state into a plain description of the animation.
 *
 * Both the preview (preview.js) and the code output (codegen.js) are built
 * from this one description, so what you see is exactly what you copy.
 *
 * Rule: only values that differ from GSAP's defaults (or from a property's
 * neutral value) are included.
 *
 * Result:
 *   {
 *     timeline: false | true,      // one step = a plain tween, more = gsap.timeline()
 *     timelineVars: { ... },       // repeat, yoyo, delay, scrollTrigger of the whole timeline
 *     scroll: { ... } | null,      // ScrollTrigger settings (also inside the vars above)
 *     split: { kind, type, mask } | null,  // SplitText settings for text targets
 *     steps: [{ method: "from" | "to", vars: { ... }, position: "-=0.2" | null }],
 *   }
 */
import {
  PROPERTIES,
  STEP_TIMING,
  GLOBAL_TIMING,
  GSAP_DEFAULT_EASE,
  TRIGGER_SELECTOR,
  HEADLINE_SELECTOR,
  TARGETS,
} from "./config.js";

/** Round away floating point noise like 0.30000000000000004. */
export function clean(value) {
  return Math.round(value * 1000) / 1000;
}

const stepDefault = (key) => STEP_TIMING.find((t) => t.key === key).gsapDefault;
const globalDefault = (key) => GLOBAL_TIMING.find((t) => t.key === key).gsapDefault;

/** Scrub ties progress to the scrollbar: delay and repeat make no sense then. */
export function isScrubbing(state) {
  return state.scroll && state.scrub !== "off";
}

/**
 * SplitText settings, or null for the boxes.
 * kind = the array to animate (split.words / split.chars / split.lines).
 */
export function splitConfig(state) {
  const target = TARGETS.find((t) => t.value === state.target);
  if (!target || !target.split) return null;
  return {
    kind: target.value,
    type: target.split,
    // a mask clips each piece, so it slides in from "behind" its own edge
    mask: state.mask ? target.value : null,
  };
}

/** ScrollTrigger config, or null when scroll is off. */
function scrollTrigger(state) {
  if (!state.scroll) return null;
  const trigger = splitConfig(state) ? HEADLINE_SELECTOR : TRIGGER_SELECTOR;
  const config = { trigger, start: state.start };
  if (isScrubbing(state)) {
    config.end = state.end;
    config.scrub = state.scrub === "true" ? true : Number(state.scrub);
  } else {
    // play when it scrolls in, rewind when scrolling back above the start
    config.toggleActions = "play none none reverse";
  }
  if (state.markers) config.markers = true;
  return config;
}

/** delay / repeat / yoyo / scrollTrigger for the whole animation. */
function globalVars(state) {
  const vars = {};
  if (isScrubbing(state)) {
    vars.scrollTrigger = scrollTrigger(state);
    return vars;
  }
  if (clean(state.delay) !== globalDefault("delay")) vars.delay = clean(state.delay);
  if (clean(state.repeat) !== globalDefault("repeat")) vars.repeat = clean(state.repeat);
  // yoyo without repeat does nothing, so it's left out
  if (state.yoyo && state.repeat !== 0) vars.yoyo = true;
  if (state.scroll) vars.scrollTrigger = scrollTrigger(state);
  return vars;
}

/**
 * Vars for one step. `globals` are merged in at the right spot when the
 * animation is a single tween (then delay/repeat/yoyo live on the tween).
 * Key order is the order people usually write it in.
 */
function stepVars(step, globals = {}) {
  const vars = {};

  for (const prop of PROPERTIES) {
    const value = clean(step[prop.key]);
    if (value !== prop.neutral) vars[prop.key] = value;
  }

  if (clean(step.duration) !== stepDefault("duration")) vars.duration = clean(step.duration);
  if ("delay" in globals) vars.delay = globals.delay;
  if (step.ease !== GSAP_DEFAULT_EASE) vars.ease = step.ease;
  if (clean(step.stagger) !== stepDefault("stagger")) vars.stagger = clean(step.stagger);
  if ("repeat" in globals) vars.repeat = globals.repeat;
  if ("yoyo" in globals) vars.yoyo = globals.yoyo;
  if ("scrollTrigger" in globals) vars.scrollTrigger = globals.scrollTrigger;

  return vars;
}

/** Offset in seconds -> GSAP position parameter ("+=0.3" / "-=0.2"), or null. */
function position(offset) {
  const value = clean(offset);
  if (value === 0) return null;
  return value > 0 ? `+=${value}` : `-=${-value}`;
}

export function describe(state) {
  const globals = globalVars(state);
  const timeline = state.steps.length > 1;

  const steps = state.steps.map((step, i) => ({
    method: step.direction,
    vars: stepVars(step, timeline ? {} : globals),
    // the first step always starts at the beginning
    position: i === 0 ? null : position(step.offset),
  }));

  return {
    timeline,
    timelineVars: timeline ? globals : {},
    scroll: scrollTrigger(state),
    split: splitConfig(state),
    steps,
  };
}
