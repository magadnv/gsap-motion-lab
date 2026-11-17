/**
 * A tiny observable store.
 *
 * Shape (see INITIAL_STATE in config.js):
 *   { steps: [step, ...], active: number, delay, repeat, yoyo }
 *
 * The state is treated as immutable: every update creates new objects,
 * so subscribers can compare references if they want to skip work.
 */
import { INITIAL_STATE, NEW_STEP, MAX_STEPS } from "./config.js";

let state = structuredClone(INITIAL_STATE);
const listeners = new Set();

function emit() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

/** Current state. Treat it as read-only. */
export function getState() {
  return state;
}

/** Merge a partial update into the top level of the state. */
export function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

/** Merge a partial update into the step that is being edited. */
export function updateStep(patch) {
  const steps = state.steps.map((step, i) => (i === state.active ? { ...step, ...patch } : step));
  setState({ steps });
}

/** Switch the panel to another step. */
export function selectStep(index) {
  if (index < 0 || index >= state.steps.length || index === state.active) return;
  setState({ active: index });
}

/** Append a new step and start editing it. */
export function addStep() {
  if (state.steps.length >= MAX_STEPS) return;
  setState({ steps: [...state.steps, { ...NEW_STEP }], active: state.steps.length });
}

/** Remove the step being edited (the last remaining step can't be removed). */
export function removeStep() {
  if (state.steps.length <= 1) return;
  const steps = state.steps.filter((_, i) => i !== state.active);
  // the new first step starts at the beginning, so it has no offset
  steps[0] = { ...steps[0], offset: 0 };
  setState({ steps, active: Math.min(state.active, steps.length - 1) });
}

/** Replace the whole state, e.g. from a shared link. */
export function replaceState(next) {
  state = { ...structuredClone(INITIAL_STATE), ...next, active: 0 };
  emit();
}

/** Go back to the starting animation. */
export function resetState() {
  replaceState(structuredClone(INITIAL_STATE));
}

/**
 * Register a listener. Returns an unsubscribe function.
 * @param {(state: object) => void} listener
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
