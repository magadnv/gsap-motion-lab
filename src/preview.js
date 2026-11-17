/**
 * Live preview: plays exactly the animation the code panel shows.
 *
 * The preview always builds a gsap.timeline() and adds one tween per step,
 * with the same vars and position parameters as the generated code.
 * (A single tween inside a timeline behaves the same as a plain tween.)
 *
 * Every state change rebuilds it inside a gsap.context(), which makes
 * cleanup one call: context.revert() kills the tweens and removes every
 * inline style GSAP has set.
 */
import { gsap } from "gsap";
import { describe } from "./animation.js";

/** Wait this long after the last change before replaying. */
const REPLAY_DELAY_MS = 140;

/**
 * @param {object} options
 * @param {HTMLElement} options.root           element containing the boxes
 * @param {HTMLElement} options.progress       bar that shows overall progress
 * @param {HTMLButtonElement} options.playButton
 * @param {HTMLButtonElement} options.replayButton
 * @param {(t: number | null) => void} [options.onTick]
 *        position (0 to 1) of the first box inside the step being edited,
 *        used by the dot on the ease curve
 */
export function createPreview({ root, progress, playButton, replayButton, onTick = () => {} }) {
  const boxes = root.querySelectorAll(".box");
  let ctx = null;
  let tl = null;
  let replayTimer = 0;

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

  /** Throw away the old animation and build a new one from state. */
  function build(state) {
    if (ctx) ctx.revert();

    const animation = describe(state);
    const activeStep = state.steps[state.active];
    let activeTween = null;

    ctx = gsap.context(() => {
      tl = gsap.timeline({
        ...animation.timelineVars,
        paused: true,
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
        const tween = gsap[step.method](boxes, step.vars);
        tl.add(tween, step.position ?? undefined);
        if (i === state.active) activeTween = tween;
      });
    }, root);

    setProgress(0);
    onTick(null);
  }

  function replay() {
    if (!tl) return;
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
    if (!tl) return;
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
      build(state);
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
