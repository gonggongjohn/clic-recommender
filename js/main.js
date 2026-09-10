/* The shell: routing, the top bar, and the serving indicator. */

import { BASE, BASE_SOURCE, IS_CONFIGURED, api, onSessionExpired, session } from "./api.js";
import { h, mount, notice, poller, toast, when } from "./dom.js";
import { batchesView, batchView } from "./views/batches.js";
import { peopleView, signInView } from "./views/people.js";
import { versionsView } from "./views/versions.js";

const root = document.getElementById("root");
let current = null;
let user = null;
let servingHost = null;
let servingWatcher = null;

function destroyCurrent() {
  if (current && current.destroy) current.destroy();
  current = null;
}

/* --------------------------------------------------------------- serving bar */

function renderServing(data) {
  if (!servingHost) return;
  if (!data || !data.data) {
    mount(servingHost, h("span.hint", ""));
    return;
  }
  const version = data.data.version;
  const warmup = data.warmup || {};

  let className = "serving";
  let note = "";
  if (!version || version === "legacy") {
    className += " is-unknown";
    note = "unversioned data";
  } else if (warmup.warming) {
    className += " is-stale";
    note = "loading";
  } else if (warmup.warmup_error) {
    className += " is-stale";
    note = "index problem";
  } else if (!warmup.ready) {
    className += " is-stale";
    note = "idle";
  }

  mount(
    servingHost,
    h(
      `div.${className.split(" ").join(".")}`,
      { title: data.data.label || "" },
      h("span", "Serving"),
      h("b", version === "legacy" ? "unversioned" : version || "unknown"),
      note ? h("span", `· ${note}`) : null
    )
  );
}

function watchServing() {
  if (servingWatcher) servingWatcher.stop();
  const refresh = async () => {
    try {
      renderServing(await api.service());
    } catch {
      /* the bar is informational; a failure here should not interrupt work */
    }
  };
  refresh();
  servingWatcher = poller(refresh, 30000);

  // Activating a version or reloading the recommender changes this indicator
  // immediately; waiting for the next poll would show stale state at exactly
  // the moment someone needs to be sure the switch took effect.
  window.removeEventListener("clic:serving-changed", window.__clicServingHandler || (() => {}));
  window.__clicServingHandler = () => setTimeout(refresh, 600);
  window.addEventListener("clic:serving-changed", window.__clicServingHandler);
}

/* -------------------------------------------------------------------- shell */

/**
 * Names the backend when the console is hosted separately.
 *
 * With staging and production consoles on near-identical URLs, knowing which
 * data you are about to publish to is worth the pixels.
 */
function environmentTag() {
  const label = (window.CLIC_CONSOLE_CONFIG || {}).environmentLabel;
  if (label) return h("span.tag.tag-outline", label);
  if (BASE_SOURCE === "url override") return h("span.tag.tag-pending", `API: ${BASE}`);
  if (BASE.startsWith("http")) {
    try {
      return h("span.tag.tag-outline", { title: BASE }, new URL(BASE).host);
    } catch {
      return null;
    }
  }
  return null;
}

function buildShell() {
  servingHost = h("div");

  const rail = h(
    "nav",
    h("a", { href: "#/batches", "data-route": "batches" }, "Batches"),
    h("a", { href: "#/versions", "data-route": "versions" }, "Versions"),
    h("a", { href: "#/people", "data-route": "people" }, user.is_admin ? "People" : "My account")
  );

  const view = h("div.main");

  const shell = h(
    "div.shell",
    h(
      "header.topbar",
      h("a.wordmark", { href: "#/batches", style: "text-decoration:none;color:inherit" }, "CLIC ", h("span", "curation")),
      h("div.topbar-spacer"),
      environmentTag(),
      servingHost,
      h(
        "div.who",
        h("span", null, h("b", user.username), user.is_admin ? " · administrator" : " · curator"),
        h(
          "button.quiet.small",
          {
            onclick: () => {
              session.clear();
              start();
            },
          },
          "Sign out"
        )
      )
    ),
    h("div.body", h("aside.rail", rail), view)
  );

  mount(root, shell);
  watchServing();
  return { view, rail };
}

/* ------------------------------------------------------------------ routing */

function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [name, ...rest] = hash.split("/").filter(Boolean);
  return { name: name || "batches", params: rest };
}

function markActive(rail, name) {
  rail.querySelectorAll("a").forEach((link) => {
    if (link.dataset.route === name) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function route(shell) {
  const { name, params } = parseRoute();
  destroyCurrent();
  markActive(shell.rail, name === "batches" && params.length ? "batches" : name);
  shell.view.scrollIntoView({ block: "start" });

  if (name === "versions") {
    if (params.length) {
      // Deep link from a published batch: land on the list, then open it.
      current = versionsView(shell.view, { user });
      return;
    }
    current = versionsView(shell.view, { user });
    return;
  }
  if (name === "people") {
    current = peopleView(shell.view, { user, onSignedOut: start });
    return;
  }
  if (name === "batches" && params.length) {
    current = batchView(shell.view, params[0], { user, onChanged: () => {} });
    return;
  }
  current = batchesView(shell.view, { user });
}

/* -------------------------------------------------------------------- start */

function startSignedIn() {
  const shell = buildShell();
  const handler = () => route(shell);
  window.removeEventListener("hashchange", window.__clicRouteHandler || (() => {}));
  window.__clicRouteHandler = handler;
  window.addEventListener("hashchange", handler);
  if (!window.location.hash) window.location.hash = "#/batches";
  else handler();
}

/**
 * Shown when the console was deployed without an API base.
 *
 * Failing this way is deliberate: guessing a URL would produce a sign-in page
 * that rejects every password for reasons nobody could diagnose from the
 * browser.
 */
function setupNeededView() {
  mount(
    root,
    h(
      "div.signin",
      h(
        "div.signin-panel",
        h("span.wordmark", "CLIC ", h("span", "curation")),
        h("div.lede", "This console has not been pointed at a backend yet."),
        h(
          "div.sheet",
          h(
            "div.sheet-body",
            notice("Nothing is broken — one setting is missing.", "warn"),
            h("p", "Set apiBaseUrl in config.js at the root of this site:"),
            h(
              "pre.log",
              'window.CLIC_CONSOLE_CONFIG = {\n' +
                '  apiBaseUrl: "https://<your-container-app>/recommender/admin",\n' +
                "};"
            ),
            h(
              "p.hint",
              { style: "margin-top:12px" },
              "On Azure Static Web Apps with a linked backend, use /api/recommender/admin instead — the proxy removes the need for any CORS configuration."
            ),
            h(
              "p.hint",
              "To try a backend without redeploying, add ?api=https://… to this page's address."
            )
          )
        )
      )
    )
  );
}

async function start() {
  destroyCurrent();
  if (servingWatcher) servingWatcher.stop();

  if (!IS_CONFIGURED) {
    setupNeededView();
    return;
  }

  const token = session.token;
  if (!token) {
    user = null;
    current = signInView(root, {
      onSignedIn: (signedIn) => {
        user = signedIn;
        startSignedIn();
      },
    });
    return;
  }

  // A stored token can be stale after a restart or a password change, so it is
  // verified before the shell is drawn rather than failing screen by screen.
  try {
    user = await api.me();
  } catch {
    session.clear();
    return start();
  }
  startSignedIn();
}

onSessionExpired((message) => {
  toast(message || "Your session ended. Sign in again.", "bad");
  start();
});

start();
