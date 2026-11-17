/**
 * Static configuration: which controls exist, their ranges,
 * the state the app starts with, and GSAP's own defaults.
 *
 * Keeping this in one place means controls, codegen and the URL
 * serializer all agree on the same numbers.
 */

/** Animatable properties. `neutral` is the value that means "no change". */
export const PROPERTIES = [
  { key: "x", label: "x", min: -300, max: 300, step: 1, neutral: 0, unit: "px" },
  { key: "y", label: "y", min: -200, max: 200, step: 1, neutral: 0, unit: "px" },
  { key: "rotation", label: "rotation", min: -360, max: 360, step: 1, neutral: 0, unit: "deg" },
  { key: "scale", label: "scale", min: 0, max: 3, step: 0.05, neutral: 1, unit: "" },
  { key: "opacity", label: "opacity", min: 0, max: 1, step: 0.05, neutral: 1, unit: "" },
];

/** Timing of a single step. `gsapDefault` is what GSAP uses when the key is left out. */
export const STEP_TIMING = [
  { key: "duration", label: "duration", min: 0, max: 5, step: 0.05, gsapDefault: 0.5, unit: "s" },
  { key: "stagger", label: "stagger", min: 0, max: 1, step: 0.01, gsapDefault: 0, unit: "s" },
];

/**
 * Where a step starts relative to the end of the previous one.
 * Becomes GSAP's position parameter: -0.2 -> "-=0.2" (overlap), 0.3 -> "+=0.3" (pause).
 */
export const OFFSET = {
  key: "offset",
  label: "offset",
  min: -2,
  max: 2,
  step: 0.05,
  gsapDefault: 0,
  unit: "s",
};

/** Timing of the whole animation (all steps together). */
export const GLOBAL_TIMING = [
  { key: "delay", label: "delay", min: 0, max: 3, step: 0.05, gsapDefault: 0, unit: "s" },
  // -1 is GSAP's value for "repeat forever"
  { key: "repeat", label: "repeat", min: -1, max: 10, step: 1, gsapDefault: 0, unit: "" },
];

/** Ease families. "none" has no in/out variants. */
export const EASE_FAMILIES = [
  "power1",
  "power2",
  "power3",
  "power4",
  "back",
  "elastic",
  "bounce",
  "expo",
  "circ",
  "sine",
];

export const EASE_TYPES = ["in", "out", "inOut"];

/** Flat list of every valid ease string, e.g. "power2.inOut". */
export const EASES = [
  "none",
  ...EASE_FAMILIES.flatMap((family) => EASE_TYPES.map((type) => `${family}.${type}`)),
];

/** GSAP's built-in default ease. */
export const GSAP_DEFAULT_EASE = "power1.out";

export const MAX_STEPS = 5;

/** A step where every value is GSAP's default: produces an empty vars object. */
export const BASELINE_STEP = Object.freeze({
  direction: "to",
  ...Object.fromEntries(PROPERTIES.map((p) => [p.key, p.neutral])),
  ...Object.fromEntries(STEP_TIMING.map((t) => [t.key, t.gsapDefault])),
  ease: GSAP_DEFAULT_EASE,
  offset: 0,
});

/** The first step the app opens with. */
export const INITIAL_STEP = Object.freeze({
  ...BASELINE_STEP,
  direction: "from",
  y: 60,
  opacity: 0,
  duration: 0.8,
  ease: "power3.out",
  stagger: 0.08,
});

/** What "Add step" creates: a small lift that reads well after any first step. */
export const NEW_STEP = Object.freeze({
  ...BASELINE_STEP,
  y: -24,
  duration: 0.5,
  ease: "power2.inOut",
  stagger: 0.05,
  offset: -0.1,
});

/**
 * ScrollTrigger choices. Presets instead of free text keep links valid
 * and cover what most scroll animations use.
 */
export const SCROLL_START = ["top bottom", "top 80%", "top center", "top top"];
export const SCROLL_END = ["bottom top", "bottom center", "bottom 20%", "+=300", "+=600"];
/** "off" = play once on enter (toggleActions), anything else = scrub value. */
export const SCROLL_SCRUB = ["off", "true", "0.5", "1", "2"];

/** Global values at GSAP's defaults (scroll off). */
export const BASELINE_GLOBALS = Object.freeze({
  delay: 0,
  repeat: 0,
  yoyo: false,
  scroll: false,
  start: "top 80%",
  end: "bottom 20%",
  scrub: "off",
  markers: false,
});

/** The animation the app opens with (and returns to on Reset). */
export const INITIAL_STATE = Object.freeze({
  steps: [INITIAL_STEP],
  active: 0, // index of the step being edited
  ...BASELINE_GLOBALS,
});

/** Selectors the generated code uses. */
export const TARGET_SELECTOR = ".box";
export const TRIGGER_SELECTOR = ".boxes";
