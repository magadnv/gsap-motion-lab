/**
 * Copy text and give the button a short "Copied!" moment.
 */

const FEEDBACK_MS = 1400;

/** Write text to the clipboard, with a fallback for older or non-secure contexts. */
async function writeText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("Copy command was rejected");
}

/**
 * Wire a button so clicking it copies whatever getText() returns.
 * @param {HTMLButtonElement} button
 * @param {() => string} getText
 * @param {HTMLElement} [announcer] live region that also reads the result out loud
 */
export function bindCopyButton(button, getText, announcer) {
  const label = button.textContent;
  let timer = 0;

  button.addEventListener("click", async () => {
    let message = "Copied!";
    try {
      await writeText(getText());
    } catch {
      message = "Copy failed";
    }

    clearTimeout(timer);
    button.textContent = message;
    button.classList.add("is-done");
    if (announcer) announcer.textContent = message;

    timer = setTimeout(() => {
      button.textContent = label;
      button.classList.remove("is-done");
      if (announcer) announcer.textContent = "";
    }, FEEDBACK_MS);
  });
}
