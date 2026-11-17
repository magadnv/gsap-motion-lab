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

/** Timing controls. `gsapDefault` is what GSAP uses when the key is left out. */
export const TIMING = [
  { key: "duration", label: "duration", min: 0, max: 5, step: 0.05, gsapDefault: 0.5, unit: "s" },
  { key: "delay", label: "delay", min: 0, max: 3, step: 0.05, gsapDefault: 0, unit: "s" },
  { key: "stagger", label: "stagger", min: 0, max: 1, step: 0.01, gsapDefault: 0, unit: "s" },
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

/** The animation the app opens with (and returns to on Reset). */
export const INITIAL_STATE = Object.freeze({
  direction: "from",
  x: 0,
  y: 60,
  rotation: 0,
  scale: 1,
  opacity: 0,
  duration: 0.8,
  delay: 0,
  ease: "power3.out",
  stagger: 0.08,
  repeat: 0,
  yoyo: false,
});

/** Selector the generated code targets. */
export const TARGET_SELECTOR = ".box";
