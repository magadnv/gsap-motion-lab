/**
 * Ease curve preview: draws the selected GSAP ease as an SVG path.
 *
 * x axis = time (0 to 1), y axis = progress. Eases like back and elastic
 * overshoot below 0 or above 1, so the vertical range grows to fit them;
 * dashed lines mark the 0 and 1 levels for orientation.
 *
 * A small dot rides along the curve while the preview plays.
 */
import { gsap } from "gsap";

const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 240;
const HEIGHT = 132;
const PAD_X = 10;
const PAD_Y = 14;
const SAMPLES = 120;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

/**
 * @returns {{ el: SVGSVGElement, draw(ease: string): void, setTime(t: number | null): void }}
 */
export function createEaseCurve() {
  const svg = svgEl("svg", {
    class: "curve",
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    role: "img",
    "aria-label": "Ease curve",
  });

  const zeroLine = svgEl("line", { class: "curve__guide" });
  const oneLine = svgEl("line", { class: "curve__guide" });
  const path = svgEl("path", { class: "curve__path" });
  const dot = svgEl("circle", { class: "curve__dot", r: 4 });
  svg.append(zeroLine, oneLine, path, dot);

  let easeFn = (t) => t;
  let toX = (t) => t;
  let toY = (v) => v;

  /** Redraw for a new ease name such as "back.out". */
  function draw(ease) {
    easeFn = gsap.parseEase(ease) || ((t) => t);

    // Sample the curve once, then fit the vertical range to the overshoot.
    const values = Array.from({ length: SAMPLES + 1 }, (_, i) => easeFn(i / SAMPLES));
    const min = Math.min(0, ...values);
    const max = Math.max(1, ...values);

    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_Y * 2;
    toX = (t) => PAD_X + t * innerW;
    toY = (v) => PAD_Y + (1 - (v - min) / (max - min)) * innerH;

    const d = values
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i / SAMPLES).toFixed(2)},${toY(v).toFixed(2)}`)
      .join(" ");
    path.setAttribute("d", d);

    for (const [line, level] of [
      [zeroLine, 0],
      [oneLine, 1],
    ]) {
      const y = toY(level).toFixed(2);
      line.setAttribute("x1", PAD_X);
      line.setAttribute("x2", WIDTH - PAD_X);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
    }
  }

  /** Move the dot to time t (0 to 1). Pass null to hide it. */
  function setTime(t) {
    if (t == null) {
      dot.style.opacity = "0";
      return;
    }
    dot.style.opacity = "1";
    dot.setAttribute("cx", toX(t).toFixed(2));
    dot.setAttribute("cy", toY(easeFn(t)).toFixed(2));
  }

  setTime(null);
  return { el: svg, draw, setTime };
}
