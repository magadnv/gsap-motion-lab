/**
 * Controls panel.
 *
 * The form is generated from config.js, so adding a property there
 * automatically adds a slider here. Two directions of data flow:
 *   user input   -> store actions   (event listeners below)
 *   state change -> sync(state)     (keeps every input showing the truth,
 *                                    e.g. after Reset or loading a link)
 *
 * Every field gets a "binding": how to read its value from the state and
 * how to write it back. Step fields edit the active step, global fields
 * edit the top level of the state.
 */
import {
  PROPERTIES,
  STEP_TIMING,
  OFFSET,
  GLOBAL_TIMING,
  EASE_FAMILIES,
  EASE_TYPES,
  GSAP_DEFAULT_EASE,
  MAX_STEPS,
  SCROLL_START,
  SCROLL_END,
  SCROLL_SCRUB,
  BASELINE_GLOBALS,
} from "./config.js";
import { clean, isScrubbing } from "./animation.js";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
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
 * Slider + number field.
 * `baseline` is the value that means "not in the code" (neutral / GSAP default);
 * the label gets a red dot when the value differs from it.
 */
function numberField(def, baseline, bind) {
  const id = `ctl-${def.key}`;

  const range = h("input", {
    type: "range",
    min: def.min,
    max: def.max,
    step: def.step,
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

  const commit = (value) => {
    const next = clean(clamp(value, def.min, def.max));
    number.value = next;
    bind.set(next);
  };

  // Slider: every movement updates the state.
  range.addEventListener("input", () => bind.set(clean(Number(range.value))));

  // Number field: update while typing only when the value is valid,
  // clamp and write back on blur / Enter.
  number.addEventListener("input", () => {
    const value = parseNumber(number.value);
    if (Number.isFinite(value) && value >= def.min && value <= def.max) bind.set(clean(value));
  });
  number.addEventListener("change", () => {
    const parsed = parseNumber(number.value);
    commit(Number.isFinite(parsed) ? parsed : baseline);
  });

  // Arrow keys step the value like a native number field; Shift = 10 steps.
  number.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const current = parseNumber(number.value);
    const delta = def.step * (event.shiftKey ? 10 : 1) * (event.key === "ArrowUp" ? 1 : -1);
    commit((Number.isFinite(current) ? current : baseline) + delta);
  });

  // Small hidden extra: double-click a label to reset that one value.
  label.addEventListener("dblclick", (event) => {
    event.preventDefault();
    bind.set(baseline);
  });

  return {
    el: field,
    sync(state) {
      const value = bind.get(state);
      range.value = value;
      range.style.setProperty("--fill", `${((value - def.min) / (def.max - def.min)) * 100}%`);
      // Don't overwrite what the user is typing right now.
      if (document.activeElement !== number) number.value = value;
      field.classList.toggle("is-changed", value !== baseline);
    },
  };
}

/** Segmented control (radio group), used for from / to. */
function segmented(name, options, bind) {
  const group = h("div", { class: "segmented", role: "radiogroup", "aria-label": name });
  const inputs = options.map((option) => {
    const input = h("input", {
      type: "radio",
      name,
      value: option,
      id: `ctl-${name}-${option}`,
      class: "segmented__input",
    });
    input.addEventListener("change", () => bind.set(option));
    group.append(input, h("label", { for: input.id, class: "segmented__option", text: option }));
    return input;
  });

  return {
    el: group,
    sync(state) {
      const value = bind.get(state);
      inputs.forEach((input) => (input.checked = input.value === value));
    },
  };
}

/** Ease dropdown, grouped by family, with the curve drawn underneath. */
function easeField(easeCurve, bind) {
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
  select.addEventListener("change", () => bind.set(select.value));

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
      const ease = bind.get(state);
      select.value = ease;
      field.classList.toggle("is-changed", ease !== GSAP_DEFAULT_EASE);
      if (drawn !== ease) {
        easeCurve.draw(ease);
        drawn = ease;
      }
    },
  };
}

/** Labeled dropdown with a fixed list of options (ScrollTrigger settings). */
function selectField(key, label, options, bind) {
  const id = `ctl-${key}`;
  const select = h("select", { class: "select__input", id });
  options.forEach((option) => select.append(h("option", { value: option, text: option })));
  select.addEventListener("change", () => bind.set(select.value));

  const field = h(
    "div",
    { class: "field field--select", "data-key": key },
    h("label", { class: "field__label", for: id, text: label }),
    h("div", { class: "select" }, select),
  );

  return {
    el: field,
    sync(state) {
      const value = bind.get(state);
      select.value = value;
      field.classList.toggle("is-changed", value !== BASELINE_GLOBALS[key]);
    },
  };
}

/** On/off switch (a styled checkbox). `isInactive` dims it when it has no effect. */
function toggleField(key, label, hint, bind, isInactive = () => false) {
  const id = `ctl-${key}`;
  const input = h("input", { type: "checkbox", id, class: "toggle__input", role: "switch" });
  input.addEventListener("change", () => bind.set(input.checked));

  const field = h(
    "div",
    { class: "field field--toggle" },
    h("label", { class: "field__label", for: id, text: label }),
    h("span", { class: "field__hint", text: hint }),
    h("span", { class: "toggle" }, input, h("span", { class: "toggle__track", "aria-hidden": "true" })),
  );

  return {
    el: field,
    sync(state) {
      const on = Boolean(bind.get(state));
      input.checked = on;
      field.classList.toggle("is-changed", on);
      field.classList.toggle("is-inactive", isInactive(state));
    },
  };
}

/** Step tabs (1, 2, 3 ...) with Add and Remove. */
function stepBar(actions) {
  const tabs = h("div", { class: "steps__tabs", role: "tablist", "aria-label": "Steps" });
  const addButton = h("button", { type: "button", class: "steps__add", text: "Add step" });
  const removeButton = h("button", { type: "button", class: "steps__remove", text: "Remove" });

  addButton.addEventListener("click", actions.addStep);
  removeButton.addEventListener("click", actions.removeStep);

  let signature = "";

  return {
    el: h(
      "div",
      { class: "steps" },
      h("div", { class: "steps__row" }, tabs, addButton),
      h(
        "div",
        { class: "steps__meta" },
        h("span", { class: "steps__hint", "data-steps-hint": "" }),
        removeButton,
      ),
    ),
    sync(state) {
      // Re-render the tabs only when something they show has changed.
      const next = `${state.active}|${state.steps.map((s) => s.direction).join(",")}`;
      if (next !== signature) {
        signature = next;
        tabs.replaceChildren(
          ...state.steps.map((step, i) => {
            const tab = h(
              "button",
              {
                type: "button",
                class: "steps__tab",
                role: "tab",
                "aria-selected": String(i === state.active),
              },
              h("span", { class: "steps__num", text: String(i + 1).padStart(2, "0") }),
              h("span", { class: "steps__dir", text: step.direction }),
            );
            tab.addEventListener("click", () => actions.selectStep(i));
            return tab;
          }),
        );
      }

      const single = state.steps.length === 1;
      addButton.disabled = state.steps.length >= MAX_STEPS;
      removeButton.hidden = single;
      this.el.querySelector("[data-steps-hint]").textContent = single
        ? "One step = a single tween. Add one for a timeline."
        : `Editing step ${state.active + 1} of ${state.steps.length}`;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Render all controls into the form.
 * @param {HTMLFormElement} form
 * @param {object} deps  store actions + the ease curve instance
 * @returns {{ sync(state: object): void }}
 */
export function createControls(form, { setState, updateStep, addStep, removeStep, selectStep, easeCurve }) {
  const controls = [];
  const add = (control) => (controls.push(control), control.el);

  // Bindings: where a field reads and writes its value.
  const stepBind = (key) => ({
    get: (state) => state.steps[state.active][key],
    set: (value) => updateStep({ [key]: value }),
  });
  const globalBind = (key) => ({
    get: (state) => state[key],
    set: (value) => setState({ [key]: value }),
  });

  const stepTiming = (key) => STEP_TIMING.find((t) => t.key === key);
  const globalTiming = (key) => GLOBAL_TIMING.find((t) => t.key === key);

  const offsetField = numberField(OFFSET, OFFSET.gsapDefault, stepBind("offset"));

  // ScrollTrigger settings only show while scroll is on; "end" only matters with scrub.
  const scrollFields = [
    selectField("start", "start", SCROLL_START, globalBind("start")),
    selectField("end", "end", SCROLL_END, globalBind("end")),
    selectField("scrub", "scrub", SCROLL_SCRUB, globalBind("scrub")),
    toggleField("markers", "markers", "show start and end lines", globalBind("markers")),
  ];
  const scrollNote = h("p", { class: "group__note" });
  const playbackSection = section(
    "Playback",
    add(numberField(globalTiming("delay"), 0, globalBind("delay"))),
    add(numberField(globalTiming("repeat"), 0, globalBind("repeat"))),
    add(toggleField("yoyo", "yoyo", "plays back on every repeat", globalBind("yoyo"), (s) => s.repeat === 0)),
    h("p", {
      class: "group__note",
      text: "Applies to the whole animation. repeat -1 = forever.",
    }),
  );
  const offsetNote = h("p", {
    class: "group__note",
    text: "offset: negative overlaps the previous step, positive waits.",
  });

  form.append(
    add(stepBar({ addStep, removeStep, selectStep })),
    section("Direction", add(segmented("direction", ["from", "to"], stepBind("direction")))),
    section(
      "Properties",
      ...PROPERTIES.map((prop) => add(numberField(prop, prop.neutral, stepBind(prop.key)))),
    ),
    section("Ease", add(easeField(easeCurve, stepBind("ease")))),
    section(
      "Timing",
      ...STEP_TIMING.map((def) => add(numberField(def, stepTiming(def.key).gsapDefault, stepBind(def.key)))),
      add(offsetField),
      offsetNote,
    ),
    playbackSection,
    section(
      "Scroll",
      add(toggleField("scroll", "trigger", "play on scroll (ScrollTrigger)", globalBind("scroll"))),
      ...scrollFields.map(add),
      scrollNote,
    ),
  );

  // The form never submits; Enter in a number field just commits the value.
  form.addEventListener("submit", (event) => event.preventDefault());

  return {
    sync(state) {
      controls.forEach((control) => control.sync(state));
      // The first step always starts at 0, so it has no offset.
      const first = state.active === 0;
      offsetField.el.hidden = first;
      offsetNote.hidden = first;

      const scrubbing = isScrubbing(state);
      scrollFields.forEach((field) => (field.el.hidden = !state.scroll));
      scrollFields[1].el.hidden = !scrubbing; // end
      scrollNote.hidden = !state.scroll;
      scrollNote.textContent = scrubbing
        ? "Scrub ties progress to the scrollbar, so delay and repeat are left out."
        : "Plays when the start line is reached, rewinds when scrolling back up.";
      playbackSection.classList.toggle("is-inactive", scrubbing);
    },
  };
}
