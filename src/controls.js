/**
 * Controls panel.
 *
 * The form is generated from config.js, so adding a property there
 * automatically adds a slider here. Two directions of data flow:
 *   user input  -> setState()        (handled by event listeners below)
 *   state change -> syncControls()   (keeps every input showing the truth,
 *                                     e.g. after Reset or loading a link)
 */
import { PROPERTIES, TIMING, EASE_FAMILIES, EASE_TYPES, GSAP_DEFAULT_EASE } from "./config.js";
import { clean } from "./codegen.js";

/* ------------------------------------------------------------------ */
/* Small DOM helper                                                    */
/* ------------------------------------------------------------------ */

/** Create an element with attributes and children in one call. */
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === "class") el.className = value;
    else if (key === "text") el.textContent = value;
    else el.setAttribute(key, value === true ? "" : value);
  }
  el.append(...children.filter(Boolean));
  return el;
}

/** Accept both "0.8" and "0,8"; returns NaN for anything else. */
function parseNumber(text) {
  const normalized = String(text).trim().replace(",", ".");
  return normalized === "" || normalized === "-" ? NaN : Number(normalized);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** A titled group of controls. */
function section(title, ...children) {
  return h(
    "fieldset",
    { class: "group" },
    h("legend", { class: "group__title label", text: title }),
    ...children,
  );
}

/**
 * Slider + number field bound to one state key.
 * `baseline` is the value that means "not in the code" (neutral / GSAP default);
 * the label lights up when the value differs from it.
 */
function numberField(def, baseline, setState) {
  const id = `ctl-${def.key}`;

  const range = h("input", {
    min: def.min,
    max: def.max,
    step: def.step,
    type: "range",
    class: "field__range",
    id,
    "aria-label": def.label,
  });
  // A text field instead of type="number": number inputs follow the browser
  // locale and would show "0,8" in German Chrome. GSAP code wants "0.8".
  const number = h("input", {
    type: "text",
    inputmode: "decimal",
    spellcheck: "false",
    class: "field__number",
    "aria-label": `${def.label} value`,
  });
  const label = h("label", {
    class: "field__label",
    for: id,
    text: def.label,
    title: "Double-click to reset",
  });

  const field = h(
    "div",
    { class: "field field--number", "data-key": def.key },
    label,
    range,
    h(
      "div",
      { class: "field__input" },
      number,
      def.unit ? h("span", { class: "field__unit", text: def.unit }) : null,
    ),
  );

  // Slider: every movement updates the state.
  range.addEventListener("input", () => {
    setState({ [def.key]: clean(Number(range.value)) });
  });

  // Number field: update while typing only when the value is valid,
  // clamp and write back on blur / Enter.
  number.addEventListener("input", () => {
    const value = parseNumber(number.value);
    if (Number.isFinite(value) && value >= def.min && value <= def.max) {
      setState({ [def.key]: clean(value) });
    }
  });
  number.addEventListener("change", () => {
    const parsed = parseNumber(number.value);
    const next = clean(clamp(Number.isFinite(parsed) ? parsed : baseline, def.min, def.max));
    number.value = next;
    setState({ [def.key]: next });
  });

  // Arrow keys step the value like a native number field; Shift = 10 steps.
  number.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const current = parseNumber(number.value);
    const delta = def.step * (event.shiftKey ? 10 : 1) * (event.key === "ArrowUp" ? 1 : -1);
    const next = clean(clamp((Number.isFinite(current) ? current : baseline) + delta, def.min, def.max));
    number.value = next;
    setState({ [def.key]: next });
  });

  // Small hidden extra: double-click a label to zero that one value.
  label.addEventListener("dblclick", (event) => {
    event.preventDefault();
    setState({ [def.key]: baseline });
  });

  return {
    el: field,
    sync(state) {
      const value = state[def.key];
      range.value = value;
      range.style.setProperty("--fill", `${((value - def.min) / (def.max - def.min)) * 100}%`);
      // Don't overwrite what the user is typing right now.
      if (document.activeElement !== number) number.value = value;
      field.classList.toggle("is-changed", value !== baseline);
    },
  };
}

/** Two-option segmented control (radio group), used for from / to. */
function segmented(key, options, setState) {
  const group = h("div", { class: "segmented", role: "radiogroup", "aria-label": key });
  const inputs = options.map((option) => {
    const input = h("input", {
      type: "radio",
      name: key,
      value: option,
      id: `ctl-${key}-${option}`,
      class: "segmented__input",
    });
    input.addEventListener("change", () => setState({ [key]: option }));
    group.append(input, h("label", { for: input.id, class: "segmented__option", text: option }));
    return input;
  });

  return {
    el: group,
    sync(state) {
      inputs.forEach((input) => (input.checked = input.value === state[key]));
    },
  };
}

/** Ease dropdown, grouped by family, with the curve drawn underneath. */
function easeField(easeCurve, setState) {
  const select = h("select", { class: "select__input", id: "ctl-ease", "aria-label": "ease" });
  select.append(h("option", { value: "none", text: "none" }));
  for (const family of EASE_FAMILIES) {
    const group = h("optgroup", { label: family });
    EASE_TYPES.forEach((type) => {
      const value = `${family}.${type}`;
      group.append(h("option", { value, text: value }));
    });
    select.append(group);
  }
  select.addEventListener("change", () => setState({ ease: select.value }));

  const field = h(
    "div",
    { class: "field field--ease" },
    h("div", { class: "select" }, select),
    h("div", { class: "curve-wrap" }, easeCurve.el),
  );

  let drawn = null;
  return {
    el: field,
    sync(state) {
      select.value = state.ease;
      field.classList.toggle("is-changed", state.ease !== GSAP_DEFAULT_EASE);
      if (drawn !== state.ease) {
        easeCurve.draw(state.ease);
        drawn = state.ease;
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Render all controls into the form.
 * @returns {{ sync(state: object): void }}
 */
export function createControls(form, { setState, easeCurve }) {
  const controls = [];
  const add = (control) => (controls.push(control), control.el);

  const timing = (key) => TIMING.find((t) => t.key === key);

  form.append(
    section("Direction", add(segmented("direction", ["from", "to"], setState))),
    section(
      "Properties",
      ...PROPERTIES.map((prop) => add(numberField(prop, prop.neutral, setState))),
    ),
    section(
      "Timing",
      add(numberField(timing("duration"), timing("duration").gsapDefault, setState)),
      add(numberField(timing("delay"), timing("delay").gsapDefault, setState)),
    ),
    section("Ease", add(easeField(easeCurve, setState))),
  );

  // The form never submits; Enter in a number field just commits the value.
  form.addEventListener("submit", (event) => event.preventDefault());

  return {
    sync(state) {
      controls.forEach((control) => control.sync(state));
    },
  };
}
