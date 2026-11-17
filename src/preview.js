/**
 * Live preview: five boxes animated with exactly the tween the code panel shows.
 *
 * Every state change rebuilds the tween (debounced, so dragging a slider
 * doesn't restart the animation on every pixel) and plays it from the start.
 */
import { gsap } from "gsap";
import { buildTweenVars } from "./codegen.js";

/** Wait this long after the last change before replaying. */
const REPLAY_DELAY_MS = 140;

/**
 * @param {object} options
 * @param {HTMLElement} options.root           element containing the boxes
 * @param {HTMLElement} options.progress       bar that shows tween progress
 * @param {HTMLButtonElement} options.playButton
 * @param {HTMLButtonElement} options.replayButton
 */
export function createPreview({ root, progress, playButton, replayButton }) {
  const boxes = root.querySelectorAll(".box");
  let tween = null;
  let replayTimer = 0;

  /** Running (or waiting out its delay) and not finished yet. */
  function isPlaying() {
    return Boolean(tween) && !tween.paused() && tween.totalProgress() < 1;
  }

  /** Keep the Play button label in sync with what the tween is doing. */
  function syncPlayButton() {
    const playing = isPlaying();
    playButton.textContent = playing ? "Pause" : "Play";
    playButton.setAttribute("aria-pressed", String(Boolean(playing)));
  }

  function setProgress(value) {
    progress.style.transform = `scaleX(${value})`;
  }

  /** Kill the old tween, wipe inline styles, build a fresh one from state. */
  function build(state) {
    if (tween) tween.kill();
    gsap.set(boxes, { clearProps: "all" });

    const vars = buildTweenVars(state);
    tween = gsap[state.direction](boxes, {
      ...vars,
      paused: true,
      onStart: syncPlayButton,
      onUpdate() {
        setProgress(this.totalProgress());
      },
      onComplete: syncPlayButton,
      onRepeat: syncPlayButton,
    });
    setProgress(0);
  }

  function replay() {
    if (!tween) return;
    tween.restart(true); // true = include the delay
    syncPlayButton();
  }

  function togglePlay() {
    if (!tween) return;
    if (isPlaying()) {
      tween.pause();
    } else if (tween.totalProgress() === 1) {
      tween.restart(true);
    } else {
      tween.play();
    }
    syncPlayButton();
  }

  /** Rebuild and replay; called on every state change. */
  function update(state, { immediate = false } = {}) {
    clearTimeout(replayTimer);
    const run = () => {
      build(state);
      replay();
    };
    if (immediate) run();
    else replayTimer = setTimeout(run, REPLAY_DELAY_MS);
  }

  playButton.addEventListener("click", togglePlay);
  replayButton.addEventListener("click", replay);

  return { update, replay };
}
