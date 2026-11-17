/**
 * Share settings through the URL.
 *
 * Only values that end up in the generated code are written, with readable keys:
 *
 *   ?s1=from,y:60,opacity:0,duration:0.8,ease:power3.out,stagger:0.08
 *   &s2=to,y:-24,ease:power2.inOut,offset:-0.1
 *   &repeat=-1&yoyo=1
 *
 * Each step is one param (s1, s2, ...): direction first, then key:value pairs.
 * Links from V1 (?direction=from&y=60...) still open the right animation.
 *
 * Reading starts from GSAP's defaults and applies every valid value.
 * Invalid or unknown values are ignored, so a hand-edited link can never
 * break the app. No params at all = the app's starting state.
 */
import {
  PROPERTIES,
  STEP_TIMING,
  OFFSET,
  GLOBAL_TIMING,
  EASES,
  MAX_STEPS,
  BASELINE_STEP,
  BASELINE_GLOBALS,
  INITIAL_STATE,
} from "./config.js";
import { clean } from "./animation.js";

const DIRECTIONS = ["from", "to"];
const STEP_NUMBERS = [...PROPERTIES, ...STEP_TIMING, OFFSET];

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/** Parse a number and accept it only inside the control's range. */
function validNumber(def, raw) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= def.min && value <= def.max ? value : undefined;
}

/** Apply one key/value to a step if it's valid. */
function applyStepValue(step, key, raw) {
  if (key === "ease") {
    if (EASES.includes(raw)) step.ease = raw;
    return;
  }
  const def = STEP_NUMBERS.find((d) => d.key === key);
  const value = def && validNumber(def, raw);
  if (value !== undefined) step[key] = value;
}

/** Apply delay / repeat / yoyo from params. */
function applyGlobals(state, params) {
  for (const def of GLOBAL_TIMING) {
    const value = params.has(def.key) ? validNumber(def, params.get(def.key)) : undefined;
    if (value !== undefined) state[def.key] = value;
  }
  const yoyo = params.get("yoyo");
  if (yoyo === "1" || yoyo === "true") state.yoyo = true;
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

/** One step as "to,y:-24,ease:power2.inOut". Only non-default values. */
function encodeStep(step, isFirst) {
  const parts = [step.direction];
  for (const def of STEP_NUMBERS) {
    if (isFirst && def.key === "offset") continue;
    const value = clean(step[def.key]);
    if (value !== BASELINE_STEP[def.key]) parts.push(`${def.key}:${value}`);
  }
  if (step.ease !== BASELINE_STEP.ease) parts.push(`ease:${step.ease}`);
  return parts.join(",");
}

/**
 * State -> query string (without "?").
 * Built by hand so "," and ":" stay readable instead of %2C and %3A
 * (both are allowed in a query string).
 */
export function stateToQuery(state) {
  const pairs = state.steps.map((step, i) => [`s${i + 1}`, encodeStep(step, i === 0)]);

  for (const def of GLOBAL_TIMING) {
    const value = clean(state[def.key]);
    if (value !== BASELINE_GLOBALS[def.key]) pairs.push([def.key, value]);
  }
  if (state.yoyo) pairs.push(["yoyo", 1]);

  const encode = (text) =>
    encodeURIComponent(String(text)).replace(/%2C/gi, ",").replace(/%3A/gi, ":");
  return pairs.map(([key, value]) => `${key}=${encode(value)}`).join("&");
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

/** "to,y:-24,ease:power2.inOut" -> step */
function decodeStep(text) {
  const [direction, ...pairs] = text.split(",");
  const step = { ...BASELINE_STEP };
  if (DIRECTIONS.includes(direction)) step.direction = direction;
  for (const pair of pairs) {
    const [key, raw] = pair.split(":");
    if (key && raw !== undefined) applyStepValue(step, key, raw);
  }
  return step;
}

/** V1 links: one flat step with direction, x, y, ..., delay, repeat, yoyo. */
function decodeLegacy(params) {
  const step = { ...BASELINE_STEP };
  const direction = params.get("direction");
  if (DIRECTIONS.includes(direction)) step.direction = direction;
  for (const key of ["ease", ...STEP_NUMBERS.map((d) => d.key)]) {
    if (params.has(key)) applyStepValue(step, key, params.get(key));
  }
  step.offset = 0;

  const state = { steps: [step], ...BASELINE_GLOBALS };
  applyGlobals(state, params);
  return state;
}

/** Query string -> state. */
export function queryToState(search) {
  const params = new URLSearchParams(search);

  const stepParams = [];
  for (let i = 1; i <= MAX_STEPS && params.has(`s${i}`); i++) stepParams.push(params.get(`s${i}`));

  if (stepParams.length > 0) {
    const state = { steps: stepParams.map(decodeStep), ...BASELINE_GLOBALS };
    state.steps[0].offset = 0;
    applyGlobals(state, params);
    return state;
  }

  if (params.has("direction")) return decodeLegacy(params);

  return structuredClone(INITIAL_STATE);
}

/** Read the current page URL. */
export function readUrlState() {
  return queryToState(window.location.search);
}

/** Write state into the address bar without adding history entries. */
export function writeUrlState(state) {
  window.history.replaceState(null, "", `${window.location.pathname}?${stateToQuery(state)}`);
}

/** Absolute link for the "Copy link" button. */
export function shareUrl(state) {
  return `${window.location.origin}${window.location.pathname}?${stateToQuery(state)}`;
}
