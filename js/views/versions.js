/* Published data versions: which one is being served, and what is in each. */

import { api, downloadUrl } from "./../api.js";
import {
  bytes,
  confirmAction,
  count,
  duration,
  empty,
  exactWhen,
  field,
  h,
  meter,
  modal,
  mount,
  notice,
  poller,
  stat,
  tag,
  toast,
  when,
} from "./../dom.js";
import { dataPreview } from "./../preview.js";

const INDEX_LABELS = {
  ready: ["Indexed", "seal"],
  building: ["Building", "live"],
  absent: ["No index", "pending"],
  failed: ["Index failed", "flag"],
  cancelled: ["Build cancelled", "flag"],
  succeeded: ["Indexed", "seal"],
  running: ["Building", "live"],
};

function indexTag(status) {
  const state = (status && status.state) || "absent";
  const [label, kind] = INDEX_LABELS[state] || ["Unknown", "neutral"];
  return tag(label, kind, { pulse: state === "building" || state === "running" });
}

export function versionsView(root, { user }) {
  const host = h("div");
  mount(root, host);
  let payload = null;
  let watcher = null;

  function anyBuilding() {
    return (payload?.versions || []).some((version) => {
      const state = version.index_status?.state;
      return state === "building" || state === "running";
    });
  }

  async function load(quiet = false) {
    if (!quiet) mount(host, h("div.loading", "Loading versions…"));
    try {
      payload = await api.versions();
      render();
    } catch (error) {
      mount(host, empty("Could not load versions", error.message));
    }
  }

  function buildIndex(version) {
    confirmAction({
      title: `Build the index for ${version.version}?`,
      body: h(
        "div",
        h(
          "p",
          version.parent
            ? `Only questions that are new or changed since ${version.parent} are embedded, so this is usually quick.`
            : "Every question in this version is embedded, which can take a while and costs model usage."
        ),
        h("p.hint", "You can keep working while it runs.")
      ),
      confirmLabel: "Build the index",
      onConfirm: async () => {
        await api.buildIndex(version.version, false);
        toast(`Building the index for ${version.version}.`);
        await load(true);
        startWatching();
      },
    });
  }

  function activate(version) {
    const hasIndex = version.index_status?.state === "ready" || version.index?.state === "ready";
    confirmAction({
      title: `Serve ${version.version} to the public?`,
      body: h(
        "div",
        h("p", `Every search will start using ${version.version}. The container reloads its index, which takes a few seconds.`),
        hasIndex
          ? null
          : notice(
              "This version has no search index. Serving it anyway means the container builds one on demand, which is slow and costs model usage on the first search.",
              "warn"
            ),
        h("p.hint", `To undo this, activate ${payload.active || "the previous version"} again.`)
      ),
      confirmLabel: hasIndex ? `Serve ${version.version}` : "Serve it anyway",
      onConfirm: async () => {
        await api.activate(version.version, !hasIndex);
        toast(`Now serving ${version.version}.`, "good");
        window.dispatchEvent(new CustomEvent("clic:serving-changed"));
        await load(true);
      },
    });
  }

  function openVersion(version) {
    modal({
      title: `${version.version} — ${version.label || "data"}`,
      wide: true,
      body: h(
        "div",
        // Counts are shown by the preview panel below; this line carries only
        // the provenance, which the preview does not know about.
        h(
          "p.hint",
          `Created by ${version.created_by || "unknown"} ${when(version.created_at)}` +
            (version.parent ? ` · built on ${version.parent}` : "") +
            (version.source?.job_name ? ` · from batch ${version.source.job_name}` : "")
        ),
        version.notes ? h("p", version.notes) : null,
        h(
          "div.button-row",
          { style: "margin-bottom:18px" },
          (version.files || [])
            .filter((file) => file.exists)
            .map((file) =>
              h(
                "a.btn.small",
                { href: downloadUrl(`/versions/${version.version}/files/${file.name}`), target: "_blank", rel: "noreferrer" },
                `${file.name} (${bytes(file.bytes)})`
              )
            )
        ),
        dataPreview({
          label: version.version,
          questions: (params) => api.versionQuestions(version.version, params),
          question: (identifier) => api.versionQuestion(version.version, identifier),
          scopes: (params) => api.versionScopes(version.version, params),
          summary: () => api.versionSummary(version.version),
        })
      ),
      actions: (close) => [h("button", { onclick: close }, "Close")],
    });
  }

  function indexCell(version) {
    const status = version.index_status || {};
    const state = status.state;
    if (state === "building" || state === "running") {
      const fraction = status.embed_total ? status.embedded / status.embed_total : 0;
      return h(
        "div",
        indexTag(status),
        meter(fraction, { indeterminate: !status.embed_total }),
        h("span.cell-sub", status.message || status.stage || "Working")
      );
    }
    const report = status.report || version.index || {};
    return h(
      "div",
      indexTag(status),
      report.built_at
        ? h("span.cell-sub", `${count(report.records)} records · ${when(report.built_at)}`)
        : status.error
        ? h("span.cell-sub", status.error)
        : null
    );
  }

  function render() {
    if (!payload.versioned) {
      mount(
        host,
        h("div.page-head", h("div", h("h1", "Data versions"), h("div.lede", "Control which set of questions the recommender serves."))),
        h(
          "div.sheet",
          h(
            "div.sheet-body",
            h("h2", { style: "margin-bottom:8px" }, "This data has not been versioned yet"),
            h(
              "p",
              "The data directory holds the four data files directly, the way it did before versioning. Converting it copies those files into version v0001 and starts serving that. The originals are left where they are, so nothing breaks if you need to roll back."
            ),
            user.is_admin
              ? h(
                  "button.primary",
                  {
                    onclick: () =>
                      confirmAction({
                        title: "Convert to versioned data?",
                        body: "The current files are copied into v0001, which becomes the version being served. The originals stay untouched.",
                        confirmLabel: "Create v0001",
                        onConfirm: async () => {
                          await api.bootstrapVersions();
                          toast("Created v0001.", "good");
                          window.dispatchEvent(new CustomEvent("clic:serving-changed"));
                          await load();
                        },
                      }),
                  },
                  "Convert to versioned data"
                )
              : h("p.hint", "An administrator needs to do this.")
          )
        )
      );
      return;
    }

    const serving = payload.serving || {};
    const versions = [...(payload.versions || [])].reverse();

    mount(
      host,
      h(
        "div.page-head",
        h(
          "div",
          h("h1", "Data versions"),
          h("div.lede", "Each version is the one before it plus a batch of new questions. Publishing never changes an older version, so switching back is always possible.")
        ),
        h(
          "div.page-head-actions",
          user.is_admin
            ? h(
                "button.small",
                {
                  onclick: async () => {
                    await api.reloadService();
                    toast("The recommender is reloading its data.");
                    window.dispatchEvent(new CustomEvent("clic:serving-changed"));
                    setTimeout(() => load(true), 1500);
                  },
                },
                "Reload the recommender"
              )
            : null
        )
      ),
      payload.pinned
        ? notice(
            `This container is pinned to ${payload.pinned} by its RECOMMENDER_DATA_VERSION setting, so activating a different version here will not change what it serves.`,
            "warn"
          )
        : null,
      serving.version && payload.active && serving.version !== payload.active
        ? notice(
            `${payload.active} is set as active, but this container is still serving ${serving.version}. Reload the recommender to pick up the change.`,
            "warn"
          )
        : null,
      h(
        "div.sheet.tight",
        h(
          "div.sheet-body.tight",
          h(
            "div.table-wrap",
            h(
              "table",
              h(
                "thead",
                h(
                  "tr",
                  h("th", "Version"),
                  h("th.nowrap", "Questions"),
                  h("th", "Search index"),
                  h("th.nowrap", "Created"),
                  h("th", "")
                )
              ),
              h(
                "tbody",
                versions.map((version) => {
                  const isActive = version.version === payload.active;
                  const row = h(
                    "tr.clickable",
                    { onclick: (event) => { if (!event.target.closest("button, a")) openVersion(version); } },
                    h(
                      "td",
                      h("b.version-id", { style: "font-family:var(--serif);font-size:15px" }, version.version),
                      isActive ? h("span", { style: "margin-left:8px" }, tag("Serving now", "seal")) : null,
                      h("span.cell-sub", version.label || "—")
                    ),
                    h(
                      "td.num.nowrap",
                      count(version.counts?.questions),
                      version.counts?.added_questions
                        ? h("span.cell-sub", `+${count(version.counts.added_questions)}`)
                        : null
                    ),
                    h("td", indexCell(version)),
                    h("td.nowrap", h("span", { title: exactWhen(version.created_at) }, when(version.created_at)), h("span.cell-sub", version.created_by || "")),
                    h(
                      "td.nowrap",
                      h(
                        "div.button-row",
                        user.is_admin && !isActive ? h("button.small.seal", { onclick: () => activate(version) }, "Serve this") : null,
                        user.is_admin && version.index_status?.state !== "building"
                          ? h("button.small", { onclick: () => buildIndex(version) }, version.index_status?.state === "ready" ? "Rebuild index" : "Build index")
                          : null,
                        user.is_admin && version.index_status?.state === "building"
                          ? h("button.small.danger", { onclick: async () => { await api.cancelIndex(version.version); await load(true); } }, "Stop")
                          : null,
                        user.is_admin && !isActive
                          ? h(
                              "button.quiet",
                              {
                                title: `Delete ${version.version}`,
                                onclick: () =>
                                  confirmAction({
                                    title: `Delete ${version.version}?`,
                                    body: "The version's data files and its search index are removed. Versions built from it are not affected — they hold their own full copy.",
                                    confirmLabel: "Delete the version",
                                    danger: true,
                                    onConfirm: async () => {
                                      await api.deleteVersion(version.version);
                                      toast(`Deleted ${version.version}.`);
                                      await load(true);
                                    },
                                  }),
                              },
                              "✕"
                            )
                          : null
                      )
                    )
                  );
                  if (isActive) row.classList.add("is-active");
                  return row;
                })
              )
            )
          )
        )
      )
    );
  }

  function startWatching() {
    if (watcher) watcher.stop();
    watcher = poller(async () => {
      if (!anyBuilding()) return;
      await load(true);
    }, 3000);
  }

  load().then(startWatching);
  return { destroy() { if (watcher) watcher.stop(); } };
}
