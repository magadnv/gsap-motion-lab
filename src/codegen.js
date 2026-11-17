/**
 * Code output: prints the animation description (animation.js) as GSAP code.
 *
 *   one step   ->  gsap.from(".box", { ... });
 *   several    ->  const tl = gsap.timeline({ ... });
 *                  tl.from(".box", { ... });
 *                  tl.to(".box", { ... }, "-=0.2");
 *
 * The code is first built as a list of [type, text] tokens. Plain text
 * (clipboard) and highlighted HTML (display) are both rendered from it.
 */
import { describe } from "./animation.js";
import { TARGET_SELECTOR } from "./config.js";

const INDENT = "  ";

/* ------------------------------------------------------------------ */
/* Token printer                                                       */
/* ------------------------------------------------------------------ */

/** Print a single value: string, number, boolean or nested object. */
function printValue(value, depth, out) {
  if (typeof value === "string") out.push(["str", `"${value}"`]);
  else if (typeof value === "number" || typeof value === "boolean") out.push(["num", String(value)]);
  else printObject(value, depth, out);
}

/** Print an object literal, one key per line, trailing commas. */
function printObject(obj, depth, out) {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    out.push(["pun", "{}"]);
    return;
  }
  out.push(["pun", "{"]);
  for (const [key, value] of entries) {
    out.push(["txt", `\n${INDENT.repeat(depth + 1)}`], ["key", key], ["pun", ": "]);
    printValue(value, depth + 1, out);
    out.push(["pun", ","]);
  }
  out.push(["txt", `\n${INDENT.repeat(depth)}`], ["pun", "}"]);
}

/** Print a call like  gsap.to(".box", { ... }, "-=0.2");  */
function printCall(callee, target, vars, position, out) {
  out.push(["fn", callee], ["pun", "("]);
  out.push(["str", `"${target}"`], ["pun", ", "]);
  printObject(vars, 0, out);
  if (position) out.push(["pun", ", "], ["str", `"${position}"`]);
  out.push(["pun", ");"]);
}

function tokenize(state) {
  const animation = describe(state);
  const out = [];

  if (!animation.timeline) {
    const [step] = animation.steps;
    printCall(`gsap.${step.method}`, TARGET_SELECTOR, step.vars, null, out);
    return out;
  }

  // Timeline
  out.push(["key", "const"], ["txt", " tl "], ["pun", "= "], ["fn", "gsap.timeline"], ["pun", "("]);
  if (Object.keys(animation.timelineVars).length > 0) printObject(animation.timelineVars, 0, out);
  out.push(["pun", ");"], ["txt", "\n"]);

  for (const step of animation.steps) {
    out.push(["txt", "\n"]);
    printCall(`tl.${step.method}`, TARGET_SELECTOR, step.vars, step.position, out);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

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
