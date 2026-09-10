/*
  One step of the pipeline, as a panel.

  Each step is the same shape — take input, run a model job, hand the output to
  a person, wait for their sign-off — so they share one component and differ
  only in their inputs and options. The status spine down the left edge is the
  fastest way to read where a batch is stuck.
*/

import { api, downloadUrl } from "./api.js";
import {
  bytes,
  confirmAction,
  count,
  duration,
  exactWhen,
  h,
  meter,
  modal,
  mount,
  notice,
  tag,
  toast,
  when,
} from "./dom.js";
import { pagedTable } from "./table.js";

const STATE_TAGS = {
  pending: ["Not run", "neutral"],
  running: ["Running", "live"],
  succeeded: ["Finished", "seal"],
  failed: ["Failed", "flag"],
  cancelled: ["Cancelled", "flag"],
  interrupted: ["Interrupted", "pending"],
};

export function stateTag(state, approved) {
  if (approved) return tag("Signed off", "seal");
  const [label, kind] = STATE_TAGS[state] || STATE_TAGS.pending;
  return tag(label, kind, { pulse: state === "running" });
}

/** A drop zone plus the list of what has been uploaded to a slot. */
export function uploadSlot({ job, slot, spec, disabled, disabledReason, onChange }) {
  const files = (job.uploads && job.uploads[slot]) || [];
  const progress = h("div");

  async function send(fileList) {
    if (!fileList || !fileList.length) return;
    mount(progress, meter(0), h("div.hint", `Uploading ${fileList.length} file${fileList.length > 1 ? "s" : ""}…`));
    try {
      const result = await api.uploads(job.id, slot, fileList, (fraction) => {
        mount(progress, meter(fraction), h("div.hint", `Uploading… ${Math.round(fraction * 100)}%`));
      });
      mount(progress);
      if (result.rejected && result.rejected.length) {
        toast(`${result.rejected.length} file(s) were not accepted: ${result.rejected[0].reason}`, "bad");
      } else {
        toast(`Uploaded ${result.saved.length} file${result.saved.length > 1 ? "s" : ""}.`, "good");
      }
      await onChange();
    } catch (error) {
      mount(progress);
      toast(error.message, "bad");
    }
  }

  const input = h("input", {
    type: "file",
    multiple: spec.multiple,
    accept: spec.extensions.join(","),
    onchange: (event) => {
      send(event.target.files);
      event.target.value = "";
    },
  });

  const zone = h(
    "div.drop",
    {
      role: "button",
      tabindex: disabled ? -1 : 0,
      onclick: () => !disabled && input.click(),
      onkeydown: (event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          input.click();
        }
      },
      ondragover: (event) => {
        if (disabled) return;
        event.preventDefault();
        zone.classList.add("over");
      },
      ondragleave: () => zone.classList.remove("over"),
      ondrop: (event) => {
        event.preventDefault();
        zone.classList.remove("over");
        if (!disabled) send(event.dataTransfer.files);
      },
    },
    h("b", disabled ? disabledReason || "Not available yet" : `Drop ${spec.label.toLowerCase()} here`),
    h("div", disabled ? "" : `or click to choose ${spec.extensions.join(" or ")} files`),
    input
  );

  const list = h(
    "ul.filelist",
    files.map((file) =>
      h(
        "li",
        h("span.name", file.name),
        h("span.size", bytes(file.bytes)),
        h(
          "a.btn.small",
          { href: downloadUrl(`/jobs/${job.id}/uploads/${slot}/${encodeURIComponent(file.name)}`), target: "_blank", rel: "noreferrer" },
          "Download"
        ),
        disabled
          ? null
          : h(
              "button.quiet",
              {
                title: `Remove ${file.name}`,
                onclick: () =>
                  confirmAction({
                    title: `Remove ${file.name}?`,
                    body: "The file is deleted from the batch. You can upload it again.",
                    confirmLabel: "Remove file",
                    danger: true,
                    onConfirm: async () => {
                      await api.deleteUpload(job.id, slot, file.name);
                      await onChange();
                    },
                  }),
              },
              "✕"
            )
      )
    )
  );

  return h(
    "div",
    h("div.hint", { style: "margin-bottom:8px" }, spec.description),
    zone,
    progress,
    files.length ? list : null
  );
}

/** Live progress for a running step, expressed in the step's own units. */
function progressBlock(step, state) {
  const run = state.run || {};
  const progress = run.progress || {};

  if (state.state !== "running") return null;

  const blocks = [];
  if (step === "step1" && progress.total) {
    const done = progress.completed || 0;
    blocks.push(meter(done / progress.total));
    blocks.push(
      h(
        "div.hint",
        `${count(done)} of ${count(progress.total)} pages` +
          (progress.failed ? ` · ${count(progress.failed)} failed` : "")
      )
    );
  } else if (step === "step2" && progress.translate_total) {
    const done = progress.translate_done || 0;
    blocks.push(meter(done / progress.translate_total));
    blocks.push(h("div.hint", `${count(done)} of ${count(progress.translate_total)} questions translated`));
  } else if (step === "step3" && progress.scope_total) {
    const done = progress.scope_done || 0;
    blocks.push(meter(done / progress.scope_total));
    blocks.push(
      h(
        "div.hint",
        `${count(done)} of ${count(progress.scope_total)} pages` +
          (progress.scope_reused ? ` · ${count(progress.scope_reused)} reused from step 1` : "")
      )
    );
  } else {
    blocks.push(meter(0, { indeterminate: true }));
  }

  if (run.message) blocks.push(h("div.hint", run.message));
  return h("div", blocks);
}

/** What a finished run produced, in the reviewer's terms rather than the code's. */
function summaryBlock(step, state) {
  const run = state.run || {};
  const summary = run.summary;
  if (!summary || state.state !== "succeeded") return null;

  const stats = [];
  if (step === "step1") {
    stats.push(["Pages", count(summary.segmented_pages)]);
    stats.push(["Questions", count(summary.questions)]);
    stats.push(["Paragraphs", count(summary.scopes)]);
    if (summary.failed) stats.push(["Failed", count(summary.failed), "bad"]);
    if (summary.pages_without_chinese) stats.push(["No Chinese", count(summary.pages_without_chinese), "warn"]);
  } else if (step === "step2") {
    stats.push(["Questions", count(summary.questions)]);
    stats.push(["Workbooks", count(summary.workbooks)]);
    stats.push(["Pages", count(summary.pages)]);
    if (summary.untranslated) stats.push(["Untranslated", count(summary.untranslated), "warn"]);
  } else if (step === "step3") {
    stats.push(["Questions", count(summary.questions)]);
    stats.push(["Answer entries", count(summary.scope_en)]);
    stats.push(["Pages from step 1", count(summary.pages_from_step1)]);
    if (summary.pages_generated) stats.push(["Re-segmented", count(summary.pages_generated), "warn"]);
    if (summary.dangling_scope_refs) stats.push(["Missing answers", count(summary.dangling_scope_refs), "bad"]);
  }

  return h(
    "div.stats",
    { style: "margin-top:14px" },
    stats.map(([label, value, kind]) =>
      h("div.stat", h("div.k", label), h(`div.v${kind ? `.${kind}` : ""}`, value))
    )
  );
}

/**
 * @param {object} options
 *   job, step, number, title, blurb
 *   inputs   Node placed above the run controls
 *   options  Node with the step's run options
 *   getRunOptions () -> object sent to /run
 *   outputs  Node describing what came out
 *   canRun, blockedReason
 *   refresh  () -> Promise, reloads the batch
 */
export function stepPanel(options) {
  const { job, step, number, title, blurb, inputs, runOptions, getRunOptions, outputs, canRun, blockedReason, refresh } = options;
  const state = job.steps[step] || { state: "pending" };
  const run = state.run || {};
  const running = state.state === "running";
  const finished = state.state === "succeeded";

  const spineClass = state.approved ? "state-approved" : `state-${state.state}`;
  const logHost = h("div");
  let logOpen = false;

  async function toggleLog(event) {
    logOpen = !logOpen;
    event.currentTarget.textContent = logOpen ? "Hide log" : "Show log";
    if (!logOpen) return mount(logHost);
    mount(logHost, h("div.hint", "Loading log…"));
    try {
      const payload = await api.stepLog(job.id, step, 300);
      mount(logHost, h("pre.log", { style: "margin-top:12px" }, (payload.lines || []).join("\n")));
    } catch (error) {
      mount(logHost, notice(error.message, "bad"));
    }
  }

  async function start() {
    try {
      await api.runStep(job.id, step, getRunOptions ? getRunOptions() : {});
      toast(`Step ${number} started.`);
      await refresh();
    } catch (error) {
      toast(error.message, "bad");
    }
  }

  const actions = [];
  if (running) {
    actions.push(
      h(
        "button.danger",
        {
          onclick: () =>
            confirmAction({
              title: `Stop step ${number}?`,
              body: "Everything finished so far is kept. Running the step again picks up where it stopped.",
              confirmLabel: "Stop the step",
              danger: true,
              onConfirm: async () => {
                const result = await api.cancelStep(job.id, step);
                toast(result.message);
                await refresh();
              },
            }),
        },
        "Stop"
      )
    );
  } else {
    actions.push(
      h(
        "button",
        {
          class: finished ? "" : "primary",
          disabled: !canRun,
          title: canRun ? "" : blockedReason || "",
          onclick: start,
        },
        state.state === "interrupted" || finished ? `Run step ${number} again` : `Run step ${number}`
      )
    );
  }

  if (state.state !== "pending") {
    actions.push(h("button.quiet", { onclick: toggleLog }, "Show log"));
  }

  // The sign-off gate. Everything downstream stays locked until this is set,
  // and a re-run clears it again server-side.
  const reviewControls = [];
  if (finished || state.approved) {
    if (state.approved) {
      reviewControls.push(
        h("span.hint", `Signed off by ${state.approved_by} · ${when(state.approved_at)}`),
        h(
          "button.small",
          {
            onclick: async () => {
              await api.approveStep(job.id, step, false);
              toast("Sign-off withdrawn.");
              await refresh();
            },
          },
          "Withdraw sign-off"
        )
      );
    } else {
      reviewControls.push(
        h(
          "button.seal",
          {
            onclick: () =>
              confirmAction({
                title: `Sign off step ${number}?`,
                body: `This records that you have reviewed the output of step ${number} and unlocks step ${number + 1}.`,
                confirmLabel: "Sign off",
                onConfirm: async () => {
                  await api.approveStep(job.id, step, true);
                  toast(`Step ${number} signed off.`, "good");
                  await refresh();
                },
              }),
          },
          "I have reviewed this"
        )
      );
    }
  }

  const banners = [];
  if (state.state === "failed" && run.error) banners.push(notice(run.error, "bad"));
  if (state.state === "interrupted") {
    banners.push(
      notice(
        "The container stopped while this step was running. Nothing was lost — run it again and it will carry on from where it stopped.",
        "warn"
      )
    );
  }
  if (state.state === "cancelled" && run.error) banners.push(notice(run.error, "warn"));

  return h(
    `div.sheet.spined.${spineClass}${canRun || finished || running ? "" : ".is-locked"}`,
    h(
      "div.sheet-head",
      h("h2", `${number}. ${title}`),
      stateTag(state.state, state.approved),
      run.started_at && !running
        ? h("span.hint", { title: exactWhen(run.finished_at || run.started_at) }, when(run.finished_at || run.started_at))
        : null
    ),
    h(
      "div.sheet-body",
      h("p.hint", blurb),
      ...banners,
      inputs || null,
      runOptions || null,
      progressBlock(step, state),
      summaryBlock(step, state),
      outputs || null,
      logHost
    ),
    h("div.sheet-foot", ...actions, h("span.spacer"), ...reviewControls)
  );
}

/** A file browser for step 1's review text, readable without downloading. */
export function step1Browser(job) {
  const table = pagedTable({
    pageSize: 25,
    fetchPage: (params) => api.step1Files(job.id, params),
    emptyState: { heading: "No review files yet", detail: "Run step 1 to generate them." },
    filters: [{ name: "q", type: "search", label: "Find a page", placeholder: "Find a page id…" }],
    onRowClick: async (item) => {
      try {
        const payload = await api.outputText(job.id, "step1", item.name);
        modal({
          title: item.name,
          wide: true,
          body: h(
            "div",
            payload.truncated ? notice("This file is long; showing the first part only. Download it to read all of it.", "warn") : null,
            h("pre.reader", payload.text)
          ),
          actions: (close) => [
            h(
              "a.btn",
              { href: downloadUrl(`/jobs/${job.id}/outputs/step1/file/${encodeURIComponent(item.name)}`), target: "_blank", rel: "noreferrer" },
              "Download"
            ),
            h("button", { onclick: close }, "Close"),
          ],
        });
      } catch (error) {
        toast(error.message, "bad");
      }
    },
    columns: [
      { key: "name", label: "File", render: (item) => h("code", item.name) },
      { key: "bytes", label: "Size", className: "num nowrap", render: (item) => bytes(item.bytes) },
      {
        key: "has_segmentation",
        label: "Segmentation",
        className: "nowrap",
        render: (item) => (item.has_segmentation ? tag("Saved", "seal") : tag("Missing", "flag")),
      },
      { key: "modified_at", label: "Written", className: "nowrap", render: (item) => when(item.modified_at) },
    ],
  });
  table.reset();
  return table.element;
}

/** A paged view of any workbook in the batch, so review does not need Excel. */
export function worksheetBrowser(job, source) {
  const table = pagedTable({
    pageSize: 25,
    fetchPage: async (params) => {
      const payload = await api.worksheet(job.id, { source, ...params });
      if (!table.columnsBuilt) {
        table.columnsBuilt = true;
      }
      lastColumns = payload.columns || [];
      return payload;
    },
    emptyState: { heading: "No workbook yet", detail: "" },
    filters: [{ name: "q", type: "search", label: "Search", placeholder: "Search this workbook…" }],
    columns: [],
  });

  // The columns are only known once the first page arrives, so the table is
  // rebuilt with real columns after the first fetch.
  let lastColumns = [];
  const host = h("div");

  api
    .worksheet(job.id, { source, page: 1, page_size: 25 })
    .then((payload) => {
      const columns = (payload.columns || []).map((name) => ({
        key: name,
        label: name,
        className: name === "Question" || name.includes("Chinese") ? "wrap" : "nowrap",
        render: (item) => {
          const value = item[name];
          if (value === "" || value === undefined) return h("span.hint", "—");
          return typeof value === "string" && value.length > 200 ? `${value.slice(0, 200)}…` : String(value);
        },
      }));
      const real = pagedTable({
        pageSize: 25,
        fetchPage: (params) => api.worksheet(job.id, { source, ...params }),
        emptyState: { heading: "This workbook is empty", detail: "" },
        filters: [{ name: "q", type: "search", label: "Search", placeholder: "Search this workbook…" }],
        columns,
      });
      mount(host, h("div.hint", { style: "padding:0 18px 10px" }, `${payload.file} · sheet ${payload.sheets[0] || ""}`), real.element);
      real.reset();
    })
    .catch((error) => {
      mount(host, h("div.empty", h("b", "Could not read the workbook"), error.message));
    });

  return host;
}
