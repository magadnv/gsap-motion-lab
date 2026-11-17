/**
 * Share settings through the URL.
 *
 * Only values that end up in the generated code are written, with readable
 * keys, e.g.  ?direction=from&y=60&opacity=0&ease=power3.out&stagger=0.08
 *
 * Reading works the other way round: start from GSAP's defaults and apply
 * every valid param. Invalid or unknown params are ignored, so a hand-edited
 * link can never break the app. No params at all = the app's starting state.
 */
import { PROPERTIES, TIMING, EASES, GSAP_DEFAULT_EASE, INITIAL_STATE } from "./config.js";
import { buildTweenVars } from "./codegen.js";

const DIRECTIONS = ["from", "to"];
const NUMBER_DEFS = [...PROPERTIES, ...TIMING];

/** State that produces an empty vars object: every value at its GSAP default. */
const BASELINE = {
  direction: "to",
  ...Object.fromEntries(PROPERTIES.map((p) => [p.key, p.neutral])),
  ...Object.fromEntries(TIMING.map((t) => [t.key, t.gsapDefault])),
  ease: GSAP_DEFAULT_EASE,
  yoyo: false,
};

/** State -> query string (without the leading "?"). */
export function stateToQuery(state) {
  const params = new URLSearchParams({ direction: state.direction });
  for (const [key, value] of Object.entries(buildTweenVars(state))) {
    params.set(key, value === true ? "1" : String(value));
  }
  return params.toString();
}

/** Query string -> full state. */
export function queryToState(search) {
  const params = new URLSearchParams(search);
  const known = ["direction", "ease", "yoyo", ...NUMBER_DEFS.map((d) => d.key)];
  if (!known.some((key) => params.has(key))) return { ...INITIAL_STATE };

  const state = { ...BASELINE };

  const direction = params.get("direction");
  if (DIRECTIONS.includes(direction)) state.direction = direction;

  const ease = params.get("ease");
  if (EASES.includes(ease)) state.ease = ease;

  const yoyo = params.get("yoyo");
  if (yoyo === "1" || yoyo === "true") state.yoyo = true;

  for (const def of NUMBER_DEFS) {
    if (!params.has(def.key)) continue;
    const value = Number(params.get(def.key));
    if (Number.isFinite(value) && value >= def.min && value <= def.max) {
      state[def.key] = value;
    }
  }

  return state;
}

/** Read the current page URL. */
export function readUrlState() {
  return queryToState(window.location.search);
}

/** Write state into the address bar without adding history entries. */
export function writeUrlState(state) {
  const url = `${window.location.pathname}?${stateToQuery(state)}`;
  window.history.replaceState(null, "", url);
}

/** Absolute link for the "Copy link" button. */
export function shareUrl(state) {
  return `${window.location.origin}${window.location.pathname}?${stateToQuery(state)}`;
}
