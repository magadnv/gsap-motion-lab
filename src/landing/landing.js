/**
 * Intro page (/).
 *
 * Three jobs:
 *  1. Reveal the headline and sections (the page uses the same GSAP tools the lab teaches).
 *  2. Run the tiny demo: pick an ease, the boxes replay, curve and code follow.
 *  3. Send people to the lab, carrying the ease they picked.
 *
 * The demo reuses the lab's own modules (ease curve, code generator, URL format),
 * so the code shown here is exactly what the lab would print.
 */
import "../styles/tokens.css";
import "../styles/base.css";
import "./landing.css";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import { INITIAL_STATE, INITIAL_STEP, MASK_ROOM } from "../config.js";
import { createEaseCurve } from "../easeCurve.js";
import { highlightCode } from "../codegen.js";
import { stateToQuery } from "../urlState.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

// Buttons instead of links: no URL preview in the corner on hover.
function openLab(query = "") {
  window.location.href = `/lab/${query ? `?${query}` : ""}`;
}

$$("[data-open-lab]").forEach((button) => button.addEventListener("click", () => openLab()));

/* ------------------------------------------------------------------ */
/* Demo: five eases to compare                                         */
/* ------------------------------------------------------------------ */

const DEMO_EASES = ["power3.out", "back.out", "elastic.out", "expo.inOut", "bounce.out"];
const CYCLE_MS = 2800;

const chipsRoot = $("[data-chips]");
const boxes = $$("[data-demo-boxes] .box");
const codeOutput = $("[data-demo-code]");
const curve = createEaseCurve();
$("[data-demo-curve]").append(curve.el);

let current = DEMO_EASES[0];
let tween = null;
let cycleTimer = 0;
let userPicked = false;
let demoVisible = true;

/** The lab state this demo represents: the starting animation with another ease. */
function demoState(ease) {
  return {
    ...structuredClone(INITIAL_STATE),
    steps: [{ ...INITIAL_STEP, duration: 1, ease }],
  };
}

function play(ease) {
  current = ease;
  const state = demoState(ease);
  const step = state.steps[0];

  chips.forEach((chip) => chip.setAttribute("aria-checked", String(chip.dataset.ease === ease)));
  codeOutput.innerHTML = highlightCode(state);
  curve.draw(ease);

  tween?.revert();
  tween = gsap.from(boxes, {
    y: step.y,
    opacity: step.opacity,
    duration: step.duration,
    ease,
    stagger: step.stagger,
    onUpdate() {
      // the first box starts at 0, so time / duration is where it is on the curve
      curve.setTime(Math.min(1, this.time() / step.duration));
    },
  });
}

/** Auto-play the next ease until someone picks one themselves. */
function scheduleNext() {
  clearTimeout(cycleTimer);
  if (userPicked || reducedMotion) return;
  cycleTimer = setTimeout(() => {
    if (demoVisible) play(DEMO_EASES[(DEMO_EASES.indexOf(current) + 1) % DEMO_EASES.length]);
    scheduleNext();
  }, CYCLE_MS);
}

const chips = DEMO_EASES.map((ease) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = ease;
  chip.dataset.ease = ease;
  chip.setAttribute("role", "radio");
  chip.addEventListener("click", () => {
    userPicked = true;
    clearTimeout(cycleTimer);
    play(ease);
  });
  chipsRoot.append(chip);
  return chip;
});

// Carry the picked ease into the lab.
$("[data-try]").addEventListener("click", () => openLab(stateToQuery(demoState(current))));

// Only cycle while the demo is on screen.
new IntersectionObserver(([entry]) => (demoVisible = entry.isIntersecting)).observe($(".demo"));

/* ------------------------------------------------------------------ */
/* Reveals                                                             */
/* ------------------------------------------------------------------ */

function revealHero() {
  const title = $("[data-reveal-title]");
  const heroBits = $$(".hero [data-reveal]");

  // Headline: lines rise out of a mask (with room so descenders aren't cut)
  const split = SplitText.create(title, { type: "lines", mask: "lines" });
  gsap.set(split.masks, MASK_ROOM);

  gsap
    .timeline({ defaults: { ease: "expo.out" } })
    .from(split.lines, { yPercent: 110, duration: 1.2, stagger: 0.1 })
    .from(heroBits, { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, "-=0.9");
}

function revealOnScroll() {
  $$("main > section:not(.hero) [data-reveal]").forEach((el) => {
    gsap.from(el, {
      y: 32,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
  });
}

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

// Wait for the fonts (max. 800 ms): line breaks must be final before splitting.
Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]).then(() => {
  document.body.classList.add("is-ready");

  play(current);

  if (reducedMotion) {
    tween.progress(1); // show the end state; eases only play when a chip is clicked
    return;
  }

  revealHero();
  revealOnScroll();
  scheduleNext();
});
