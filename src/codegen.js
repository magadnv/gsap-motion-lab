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
import { TARGET_SELECTOR, HEADLINE_SELECTOR, MASK_ROOM } from "./config.js";

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

/**
 * Print a call like  gsap.to(".box", { ... }, "-=0.2");
 * `target` is a selector string, or { raw: "split.words" } for a variable.
 */
function printCall(callee, target, vars, position, out) {
  out.push(["fn", callee], ["pun", "("]);
  if (typeof target === "string") out.push(["str", `"${target}"`]);
  else out.push(["txt", target.raw]);
  out.push(["pun", ", "]);
  printObject(vars, 0, out);
  if (position) out.push(["pun", ", "], ["str", `"${position}"`]);
  out.push(["pun", ");"]);
}

function tokenize(state) {
  const animation = describe(state);
  const out = [];

  // Plugins first
  const plugins = [animation.scroll && "ScrollTrigger", animation.split && "SplitText"].filter(Boolean);
  if (plugins.length > 0) {
    out.push(["fn", "gsap.registerPlugin"], ["pun", "("], ["txt", plugins.join(", ")], ["pun", ");"]);
    out.push(["txt", "\n\n"]);
  }

  // Text targets: split the headline, then animate the pieces
  let target = TARGET_SELECTOR;
  if (animation.split) {
    const options = { type: animation.split.type };
    if (animation.split.mask) options.mask = animation.split.mask;
    out.push(["key", "const"], ["txt", " split "], ["pun", "= "], ["fn", "SplitText.create"], ["pun", "("]);
    out.push(["str", `"${HEADLINE_SELECTOR}"`], ["pun", ", "]);
    printObject(options, 0, out);
    out.push(["pun", ");"], ["txt", "\n"]);
    if (animation.split.mask) {
      out.push(["com", "// room for descenders, so the masks don't clip g, y, p"], ["txt", "\n"]);
      out.push(["fn", "gsap.set"], ["pun", "("], ["txt", "split.masks"], ["pun", ", "]);
      printObject(MASK_ROOM, 0, out);
      out.push(["pun", ");"], ["txt", "\n"]);
    }
    out.push(["txt", "\n"]);
    target = { raw: `split.${animation.split.kind}` };
  }

  if (!animation.timeline) {
    const [step] = animation.steps;
    printCall(`gsap.${step.method}`, target, step.vars, null, out);
    return out;
  }

  // Timeline
  out.push(["key", "const"], ["txt", " tl "], ["pun", "= "], ["fn", "gsap.timeline"], ["pun", "("]);
  if (Object.keys(animation.timelineVars).length > 0) printObject(animation.timelineVars, 0, out);
  out.push(["pun", ");"], ["txt", "\n"]);

  for (const step of animation.steps) {
    out.push(["txt", "\n"]);
    printCall(`tl.${step.method}`, target, step.vars, step.position, out);
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
