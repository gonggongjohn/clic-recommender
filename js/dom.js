/* Small DOM and formatting helpers. No framework: the console is a handful of
   screens and a build step would be one more thing to keep in sync. */

/**
 * Create an element. `h("div.sheet", {onclick}, child, child)`.
 * Text children are inserted as text, never as HTML, so any value that came
 * from the data — a question, a filename, a log line — cannot inject markup.
 */
export function h(spec, props, ...children) {
  const [tag, ...classes] = String(spec).split(".");
  const node = document.createElement(tag || "div");
  if (classes.length) node.className = classes.join(" ");

  if (props && (typeof props !== "object" || Array.isArray(props) || props instanceof Node)) {
    children.unshift(props);
    props = null;
  }

  Object.entries(props || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === "class") node.className = [node.className, value].filter(Boolean).join(" ");
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key in node && key !== "list" && key !== "type") node[key] = value;
    else node.setAttribute(key, value === true ? "" : value);
  });

  const append = (child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) return child.forEach(append);
    node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  };
  children.forEach(append);
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(node, ...children) {
  clear(node);
  children.flat().forEach((child) => {
    if (child) node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

/* ------------------------------------------------------------- formatting */

export function bytes(value) {
  const size = Number(value) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function count(value) {
  return Number(value || 0).toLocaleString();
}

export function when(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 86400 * 6) return `${Math.round(seconds / 86400)} d ago`;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function exactWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function duration(seconds) {
  const total = Math.round(Number(seconds) || 0);
  if (total < 60) return `${total}s`;
  if (total < 3600) return `${Math.floor(total / 60)}m ${total % 60}s`;
  return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m`;
}

export function truncate(text, limit = 140) {
  const value = String(text ?? "");
  return value.length > limit ? `${value.slice(0, limit).trimEnd()}…` : value;
}

/* ----------------------------------------------------------------- toasts */

export function toast(message, kind = "") {
  const host = document.getElementById("toasts");
  if (!host) return;
  const node = h(`div.toast${kind ? `.${kind}` : ""}`, message);
  host.appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transition = "opacity .3s";
    setTimeout(() => node.remove(), 320);
  }, kind === "bad" ? 7000 : 4000);
}

/* ----------------------------------------------------------------- modals */

export function modal({ title, body, actions, wide = false, onClose }) {
  const overlay = h("div.overlay", {
    onclick: (event) => { if (event.target === overlay) close(); },
  });

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
    if (onClose) onClose();
  }
  function onKey(event) { if (event.key === "Escape") close(); }
  document.addEventListener("keydown", onKey);

  const panel = h(
    `div.modal${wide ? ".wide" : ""}`,
    { role: "dialog", "aria-modal": "true", "aria-label": title },
    h("div.modal-head", h("h2", title), h("button.quiet", { onclick: close, "aria-label": "Close" }, "✕")),
    h("div.modal-body", body),
    actions ? h("div.modal-foot", actions(close)) : null
  );

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  const focusable = panel.querySelector("input, select, textarea, button");
  if (focusable) focusable.focus();
  return { close, panel };
}

/** A confirmation that makes the consequence explicit rather than asking "are you sure". */
export function confirmAction({ title, body, confirmLabel, danger = false, onConfirm }) {
  return modal({
    title,
    body: typeof body === "string" ? h("p", body) : body,
    actions: (close) => [
      h("button", { onclick: close }, "Cancel"),
      h(
        `button.${danger ? "danger" : "primary"}`,
        {
          onclick: async (event) => {
            const button = event.currentTarget;
            button.disabled = true;
            try {
              await onConfirm();
              close();
            } catch (error) {
              toast(error.message, "bad");
              button.disabled = false;
            }
          },
        },
        confirmLabel
      ),
    ],
  });
}

/* ------------------------------------------------------------- primitives */

export function tag(label, kind = "neutral", { pulse = false } = {}) {
  return h(`span.tag.tag-${kind}`, pulse ? h("span.dot.pulse") : null, label);
}

export function stat(label, value, kind = "") {
  return h("div.stat", h("div.k", label), h(`div.v${kind ? `.${kind}` : ""}`, value));
}

export function notice(message, kind = "") {
  return h(`div.notice${kind ? `.notice-${kind}` : ""}`, message);
}

export function empty(heading, detail, action) {
  return h("div.empty", h("b", heading), detail ? h("div", detail) : null, action ? h("div", { style: "margin-top:14px" }, action) : null);
}

export function field(label, control, help) {
  return h(
    "div.field",
    h("label", label),
    control,
    help ? h("div.field-help", help) : null
  );
}

export function meter(fraction, { indeterminate = false } = {}) {
  const percent = Math.max(0, Math.min(1, Number(fraction) || 0)) * 100;
  return h(
    `div.meter${indeterminate ? ".indeterminate" : ""}`,
    h("i", { style: `width:${percent.toFixed(1)}%` })
  );
}

/** Debounce, so a search box filters as you type without a request per keystroke. */
export function debounce(fn, delay = 260) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Poll while a page is visible, stopping when the caller navigates away. */
export function poller(fn, interval = 2500) {
  let timer = null;
  let stopped = false;

  async function tick() {
    if (stopped) return;
    if (document.visibilityState === "visible") {
      try { await fn(); } catch { /* transient failures are not worth a toast */ }
    }
    if (!stopped) timer = setTimeout(tick, interval);
  }

  timer = setTimeout(tick, interval);
  return {
    stop() { stopped = true; clearTimeout(timer); },
    async now() { if (!stopped) await fn(); },
  };
}
