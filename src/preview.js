/**
 * Live preview: plays exactly the animation the code panel shows.
 *
 * The preview always builds a gsap.timeline() and adds one tween per step,
 * with the same vars and position parameters as the generated code.
 * (A single tween inside a timeline behaves the same as a plain tween.)
 *
 * Every state change rebuilds it inside a gsap.context(), which makes
 * cleanup one call: context.revert() kills the tweens and ScrollTriggers
 * and removes every inline style GSAP has set.
 *
 * Scroll mode: the canvas becomes its own scroll container and the
 * ScrollTrigger uses it as `scroller`. Replay then scrolls through it once.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { describe } from "./animation.js";
import { DEFAULT_TEXT, MASK_ROOM } from "./config.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Wait this long after the last change before replaying. */
const REPLAY_DELAY_MS = 140;

/**
 * @param {object} options
 * @param {HTMLElement} options.stage          the preview section (gets .is-scroll)
 * @param {HTMLElement} options.scroller       canvas that scrolls in scroll mode
 * @param {HTMLElement} options.subject        wrapper of the animated elements (the trigger)
 * @param {HTMLElement} options.root           element containing the boxes
 * @param {HTMLElement} options.headline       heading used by the text targets
 * @param {HTMLElement} options.progress       bar that shows overall progress
 * @param {HTMLButtonElement} options.playButton
 * @param {HTMLButtonElement} options.replayButton
 * @param {(t: number | null) => void} [options.onTick]
 *        position (0 to 1) of the first box inside the step being edited,
 *        used by the dot on the ease curve
 */
export function createPreview({
  stage,
  scroller,
  subject,
  root,
  headline,
  progress,
  playButton,
  replayButton,
  onTick = () => {},
}) {
  const boxes = root.querySelectorAll(".box");
  let ctx = null;
  let tl = null;
  let replayTimer = 0;
  let scrollMode = false;
  let autoScroll = null;

  // The spacers in scroll mode are exactly one canvas tall.
  new ResizeObserver(() => {
    scroller.style.setProperty("--scroller-height", `${scroller.clientHeight}px`);
    if (scrollMode) ScrollTrigger.refresh();
  }).observe(scroller);

  // Any manual scrolling stops the automatic scroll-through.
  for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) {
    scroller.addEventListener(type, () => autoScroll?.kill(), { passive: true });
  }

  /** Running (or waiting out its delay) and not finished yet. */
  function isPlaying() {
    return Boolean(tl) && !tl.paused() && tl.totalProgress() < 1;
  }

  /** Keep the Play button label in sync with what the timeline is doing. */
  function syncPlayButton() {
    const playing = isPlaying();
    playButton.textContent = playing ? "Pause" : "Play";
    playButton.setAttribute("aria-pressed", String(playing));
  }

  function setProgress(value) {
    progress.style.transform = `scaleX(${value})`;
  }

  /** Switch the stage between normal and scroll mode. */
  function setScrollMode(on) {
    if (on === scrollMode) return;
    scrollMode = on;
    autoScroll?.kill();
    stage.classList.toggle("is-scroll", on);
    playButton.hidden = on; // in scroll mode the scrollbar is the play button
    scroller.scrollTop = 0;
  }

  /** Throw away the old animation and build a new one from state. */
  function build(state) {
    if (ctx) ctx.revert();
    setScrollMode(Boolean(state.scroll));

    const animation = describe(state);
    const activeStep = state.steps[state.active];
    let activeTween = null;

    // The code puts scrollTrigger on the tween (one step) or the timeline.
    // Here it always goes on the timeline, pointed at the preview's scroller.
    const scrollTrigger = animation.scroll
      ? { ...animation.scroll, trigger: subject, scroller }
      : undefined;
    const { scrollTrigger: _omit, ...timelineVars } = animation.timelineVars;

    // Boxes or headline? SplitText runs inside the context, so revert()
    // also puts the headline back together before the next split.
    const split = animation.split;
    root.hidden = Boolean(split);
    headline.hidden = !split;
    // textContent, never innerHTML: the text can come from a shared link
    if (split) headline.textContent = state.text.trim() || DEFAULT_TEXT;

    ctx = gsap.context(() => {
      let targets = boxes;
      if (split) {
        const result = SplitText.create(headline, { type: split.type, mask: split.mask ?? undefined });
        if (split.mask) gsap.set(result.masks, MASK_ROOM); // same as in the code output
        targets = result[split.kind];
      }

      tl = gsap.timeline({
        ...timelineVars,
        scrollTrigger,
        paused: !scrollTrigger,
        onStart: syncPlayButton,
        onUpdate() {
          setProgress(this.totalProgress());
          // time() of a tween is its own playhead (it runs backwards on yoyo).
          // The first box starts at 0, so time / duration is its position.
          if (activeTween && activeStep.duration > 0) {
            const t = activeTween.time() / activeStep.duration;
            onTick(Math.min(1, Math.max(0, t)));
          }
        },
        onComplete: syncPlayButton,
      });

      animation.steps.forEach((step, i) => {
        const { scrollTrigger: _st, ...vars } = step.vars;
        const tween = gsap[step.method](targets, vars);
        tl.add(tween, step.position ?? undefined);
        if (i === state.active) activeTween = tween;
      });
    }, stage);

    if (scrollTrigger) ScrollTrigger.refresh();
    setProgress(scrollTrigger ? tl.totalProgress() : 0);
    onTick(null);
  }

  /**
   * Where the scroll-through stops, so the result stays in view:
   * with scrub at the trigger's end (the animation is complete there),
   * otherwise with the element centered in the canvas.
   */
  function scrollTarget() {
    const max = scroller.scrollHeight - scroller.clientHeight;
    const st = tl?.scrollTrigger;
    if (st && st.vars.scrub) return Math.min(st.end, max);
    const center = subject.offsetTop - (scroller.clientHeight - subject.offsetHeight) / 2;
    return Math.min(Math.max(center, 0), max);
  }

  /** Scroll mode: glide down through the canvas once. */
  function scrollThrough() {
    autoScroll?.kill();
    scroller.scrollTop = 0;
    autoScroll = gsap.to(scroller, {
      scrollTop: scrollTarget,
      duration: 2.6,
      ease: "sine.inOut",
      delay: 0.2,
    });
  }

  function replay() {
    if (!tl) return;
    if (scrollMode) {
      scrollThrough();
      return;
    }
    tl.restart(true); // true = include the delay
    syncPlayButton();
  }

  function togglePlay() {
    if (!tl) return;
    if (isPlaying()) tl.pause();
    else if (tl.totalProgress() === 1) tl.restart(true);
    else tl.play();
    syncPlayButton();
  }

  /** Jump to the end without animating (used for reduced motion on load). */
  function showEnd() {
    if (!tl || scrollMode) return;
    tl.progress(1).pause();
    setProgress(1);
    syncPlayButton();
  }

  /**
   * Rebuild and replay; called on every state change.
   * @param {object} state
   * @param {{ immediate?: boolean, autoplay?: boolean }} [options]
   */
  function update(state, { immediate = false, autoplay = true } = {}) {
    clearTimeout(replayTimer);
    const run = () => {
      const enteringScroll = Boolean(state.scroll) && !scrollMode;
      build(state);
      if (scrollMode) {
        // In scroll mode the scroll position drives the animation; only
        // switching scroll on demonstrates it once by scrolling through.
        if (enteringScroll && autoplay) scrollThrough();
        return;
      }
      if (autoplay) replay();
      else showEnd();
    };
    if (immediate) run();
    else replayTimer = setTimeout(run, REPLAY_DELAY_MS);
  }

  playButton.addEventListener("click", togglePlay);
  replayButton.addEventListener("click", replay);

  return { update, replay };
}
