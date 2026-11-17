/**
 * A tiny observable store. The state is one flat object (see INITIAL_STATE);
 * every module reads from it and writes to it through these functions only.
 *
 * Subscribers receive the full new state plus the set of keys that changed,
 * so e.g. the preview can skip work when nothing relevant moved.
 */
import { INITIAL_STATE } from "./config.js";

let state = { ...INITIAL_STATE };
const listeners = new Set();

/** Current state (a frozen snapshot, so nobody mutates it by accident). */
export function getState() {
  return Object.freeze({ ...state });
}

/** Merge a partial update into the state and notify subscribers. */
export function setState(patch) {
  const changed = Object.keys(patch).filter((key) => patch[key] !== state[key]);
  if (changed.length === 0) return;

  state = { ...state, ...patch };
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot, new Set(changed)));
}

/** Go back to the starting animation. */
export function resetState() {
  setState({ ...INITIAL_STATE });
}

/**
 * Register a listener. Returns an unsubscribe function.
 * @param {(state: object, changed: Set<string>) => void} listener
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
