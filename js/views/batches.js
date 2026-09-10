/* One batch, from an empty shell to a published data version. */

import { api, downloadUrl } from "../api.js";
import {
  confirmAction,
  count,
  empty,
  field,
  h,
  modal,
  mount,
  notice,
  poller,
  stat,
  tag,
  toast,
  when,
} from "../dom.js";
import { dataPreview } from "../preview.js";
import { step1Browser, stepPanel, uploadSlot, worksheetBrowser } from "../steps.js";

const SLOTS = {
  content_list: {
    label: "CLIC Content List",
    extensions: [".xlsx", ".xls"],
    multiple: false,
    description:
      "The source workbook, with an EN sheet and a ZH sheet keyed by 2nd_id. Step 1 reads the page text from it and step 3 falls back to it for any page with no segmentation.",
  },
  step2_input: {
    label: "Reviewed question workbooks",
    extensions: [".xlsx", ".xls"],
    multiple: true,
    description:
      "One workbook per reviewer, each with a sheet named after a page id. Sheets called Sample and Assignment are ignored.",
  },
  step3_input: {
    label: "Reviewed translations",
    extensions: [".xlsx", ".xls"],
    multiple: true,
    description:
      "The step 2 workbook after review, with Revised_English, Revised_Chinese and Removed filled in. Split into parts is fine.",
  },
  step3_output: {
    label: "Finished step 3 output",
    extensions: [".json", ".zip"],
    multiple: true,
    description:
      "Files named the way the standalone scripts name them — question_batch_22.json, scope_batch_22_en.json — are recognised too.",
  },
  step3_segmentation: {
    label: "Passage segmentation",
    extensions: [".json", ".zip"],
    multiple: true,
    description:
      "segmentation.json from step 1. Reusing it keeps the scope ids identical to the ones reviewers annotated, and saves re-splitting every page.",
  },
};

export function batchView(root, jobId, { user, onChanged }) {
  const host = h("div");
  mount(root, host);
  let job = null;
  let segmentation = null;
  let watcher = null;

  async function refresh() {
    job = await api.job(jobId);
    try {
      segmentation = await api.segmentation(jobId);
    } catch {
      segmentation = null;
    }
    render();
    if (onChanged) onChanged(job);
  }

  function anyRunning() {
    return job && Object.values(job.steps).some((step) => step.state === "running");
  }

  function startWatching() {
    if (watcher) watcher.stop();
    // Polling only while something is moving; a settled batch makes no requests
    // and lets the container scale back down.
    watcher = poller(async () => {
      if (!anyRunning()) return;
      await refresh();
    }, 3000);
  }

  /* ------------------------------------------------------------- gate strip */

  function gateStrip() {
    const gates = job.gates;
    const steps = job.steps;

    function describe(step, blockedNote, readyNote) {
      const state = steps[step];
      if (state.state === "running") return ["is-running", "Running now"];
      if (state.state === "failed") return ["is-failed", state.run?.error || "Failed"];
      if (state.state === "interrupted") return ["is-failed", "Interrupted — run it again"];
      if (state.approved) return ["is-done", `Signed off by ${state.approved_by}`];
      if (state.state === "succeeded") return ["is-review", "Waiting for your review"];
      return blockedNote ? ["is-blocked", blockedNote] : ["is-ready", readyNote];
    }

    const [class1, note1] = describe(
      "step1",
      gates.can_run_step1 ? "" : "Upload the content list and set the page ids",
      "Ready to run"
    );
    const [class2, note2] = describe(
      "step2",
      gates.can_upload_step2 ? (gates.can_run_step2 ? "" : "Upload the reviewed workbooks") : "Sign off step 1 first",
      "Ready to run"
    );
    const [class3, note3] = describe(
      "step3",
      gates.can_upload_step3 ? (gates.can_run_step3 ? "" : "Upload the reviewed translations") : "Sign off step 2 first",
      "Ready to run"
    );

    let class4 = "is-blocked";
    let note4 = "Finish step 3 first";
    if (job.status === "published") {
      class4 = "is-done";
      note4 = `Published as ${job.published_version}`;
    } else if (gates.can_publish) {
      class4 = "is-ready";
      note4 = "Ready to merge into a new version";
    }

    const cells = [
      ["1", "Write questions", class1, note1, "step1"],
      ["2", "Translate", class2, note2, "step2"],
      ["3", "Build the data", class3, note3, "step3"],
      ["4", "Publish", class4, note4, "publish"],
    ];

    return h(
      "div.gates",
      cells.map(([number, name, className, note, anchor]) =>
        h(
          `button.gate.${className}`,
          {
            onclick: () => {
              const target = document.getElementById(`panel-${anchor}`);
              if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            },
          },
          h("span.gate-n", number),
          h("span.gate-name", name),
          h("span.gate-note", note)
        )
      )
    );
  }

  /* ----------------------------------------------------------------- step 1 */

  function step1Panel() {
    const idSpec = h("input", {
      type: "text",
      value: job.settings.id_spec || "",
      placeholder: "2515-2629, 448, 1105",
      onchange: (event) => api.updateJob(job.id, { id_spec: event.target.value }).catch(() => {}),
    });
    const overwrite = h("input", { type: "checkbox" });
    const chinese = h("input", { type: "checkbox" });

    const hasOutput = job.gates.step1_has_output;
    const bundle = (job.outputs.step1 || []).find((file) => file.name === "segmentation.json");

    return stepPanel({
      job,
      step: "step1",
      number: 1,
      title: "Write questions",
      blurb:
        "Reads each CLIC page in English and Chinese, splits it into sections and paragraphs, and drafts questions about every paragraph. You get a review file per page plus the segmentation step 3 will reuse.",
      refresh,
      canRun: job.gates.can_run_step1 && job.status !== "published",
      blockedReason: "Upload the content list and enter the page ids first.",
      inputs: h(
        "div",
        { style: "margin:14px 0" },
        h("h3", { style: "margin-bottom:8px" }, "Source"),
        uploadSlot({
          job,
          slot: "content_list",
          spec: SLOTS.content_list,
          disabled: job.status === "published",
          onChange: refresh,
        })
      ),
      runOptions: h(
        "div",
        { style: "margin:16px 0" },
        field("Page ids to cover", idSpec, "Single numbers, ranges, or both — for example 2515-2629, 448, 1105."),
        h("label.check", overwrite, h("span", "Regenerate pages that already have output")),
        h("label.check", chinese, h("span", "Include the Chinese text in the review files"))
      ),
      getRunOptions: () => ({
        id_spec: idSpec.value,
        overwrite: overwrite.checked,
        include_chinese: chinese.checked,
      }),
      outputs: hasOutput
        ? h(
            "div",
            { style: "margin-top:18px" },
            h(
              "div.button-row",
              { style: "margin-bottom:12px" },
              h(
                "a.btn.small",
                { href: downloadUrl(`/jobs/${job.id}/outputs/step1/archive`, { kind: "review" }), target: "_blank", rel: "noreferrer" },
                "Download review files (.txt)"
              ),
              bundle
                ? h(
                    "a.btn.small",
                    { href: downloadUrl(`/jobs/${job.id}/outputs/step1/file/segmentation.json`), target: "_blank", rel: "noreferrer" },
                    "Download segmentation.json"
                  )
                : null
            ),
            notice(
              "Keep segmentation.json. Step 3 uses it so the scope ids in the finished data are the same ones your reviewers annotated against.",
              "good"
            ),
            h("div.sheet.tight", { style: "margin-top:12px" }, h("div.sheet-body.tight", step1Browser(job)))
          )
        : null,
    });
  }

  /* ----------------------------------------------------------------- step 2 */

  function step2Panel() {
    const translate = h("input", { type: "checkbox", checked: true });
    const sheetName = h("input", {
      type: "text",
      value: job.settings.sheet_name || job.batch_label,
      onchange: (event) => api.updateJob(job.id, { sheet_name: event.target.value }).catch(() => {}),
    });

    const locked = !job.gates.can_upload_step2;
    const output = (job.outputs.step2 || []).filter((file) => file.name.endsWith(".xlsx"));

    return stepPanel({
      job,
      step: "step2",
      number: 2,
      title: "Translate",
      blurb:
        "Merges every reviewer workbook into one sheet, drops the questions marked unanswerable, and translates the rest into Traditional and Simplified Chinese.",
      refresh,
      canRun: job.gates.can_run_step2 && job.status !== "published",
      blockedReason: locked ? "Sign off step 1 first." : "Upload the reviewed workbooks first.",
      inputs: h(
        "div",
        { style: "margin:14px 0" },
        h("h3", { style: "margin-bottom:8px" }, "Reviewed workbooks"),
        uploadSlot({
          job,
          slot: "step2_input",
          spec: SLOTS.step2_input,
          disabled: locked || job.status === "published",
          disabledReason: "Sign off step 1 before uploading",
          onChange: refresh,
        })
      ),
      runOptions: h(
        "div",
        { style: "margin:16px 0" },
        field("Sheet name for the output", sheetName, "Reviewers usually expect this to match the batch, such as Batch_23."),
        h("label.check", translate, h("span", "Translate into Chinese"))
      ),
      getRunOptions: () => ({ translate: translate.checked, sheet_name: sheetName.value }),
      outputs: output.length
        ? h(
            "div",
            { style: "margin-top:18px" },
            h(
              "div.button-row",
              { style: "margin-bottom:12px" },
              h(
                "a.btn.small",
                { href: downloadUrl(`/jobs/${job.id}/outputs/step2/file/${encodeURIComponent(output[0].name)}`), target: "_blank", rel: "noreferrer" },
                `Download ${output[0].name}`
              ),
              h(
                "button.small",
                {
                  onclick: () =>
                    modal({
                      title: output[0].name,
                      wide: true,
                      body: worksheetBrowser(job, "step2_output"),
                      actions: (close) => [h("button", { onclick: close }, "Close")],
                    }),
                },
                "Read it here"
              )
            )
          )
        : null,
    });
  }

  /* ----------------------------------------------------------------- step 3 */

  function segmentationBlock() {
    if (!segmentation) return null;
    const covered = segmentation.covered_pages;
    const requested = segmentation.requested_pages;
    const uncovered = segmentation.uncovered_count;

    let banner = null;
    if (!requested) {
      banner = segmentation.summary.pages
        ? notice(`Segmentation is available for ${count(segmentation.summary.pages)} pages. Upload the reviewed translations to see the match.`, "good")
        : notice(
            "No segmentation has been provided. Step 3 would ask the model to split every page again, and the scope ids it produces may not match the ones your reviewers annotated. Upload segmentation.json from step 1 if you have it.",
            "warn"
          );
    } else if (uncovered === 0) {
      banner = notice(
        `Every one of the ${count(requested)} pages in this batch has segmentation from step 1. Step 3 will reuse it, so no page is re-split and the scope ids stay exactly as reviewed.`,
        "good"
      );
    } else if (covered === 0) {
      banner = notice(
        `None of the ${count(requested)} pages have segmentation. Step 3 will re-split all of them with the model — the same way batch 22 had to be done. Check the missing-answer count afterwards.`,
        "warn"
      );
    } else {
      banner = notice(
        `${count(covered)} of ${count(requested)} pages have segmentation from step 1. The other ${count(uncovered)} would be re-split by the model: ${segmentation.uncovered_pages.slice(0, 12).join(", ")}${uncovered > 12 ? "…" : ""}`,
        "warn"
      );
    }
    return banner;
  }

  function step3Panel() {
    const locked = !job.gates.can_upload_step3;
    const allowGenerate = h("input", { type: "checkbox", checked: true });
    const overwriteScopes = h("input", { type: "checkbox" });
    const files = job.outputs.step3 || [];
    const hasOutput = job.gates.step3_has_output;

    return stepPanel({
      job,
      step: "step3",
      number: 3,
      title: "Build the data",
      blurb:
        "Applies the reviewers' revisions and removals, then pairs every question with its answer text in three languages. This produces the files that get merged into a new data version.",
      refresh,
      canRun: job.gates.can_run_step3 && job.status !== "published",
      blockedReason: locked ? "Sign off step 2 first." : "Upload the reviewed translations first.",
      inputs: h(
        "div",
        { style: "margin:14px 0" },
        h("h3", { style: "margin-bottom:8px" }, "Reviewed translations"),
        uploadSlot({
          job,
          slot: "step3_input",
          spec: SLOTS.step3_input,
          disabled: locked || job.status === "published",
          disabledReason: "Sign off step 2 before uploading",
          onChange: refresh,
        }),
        h("h3", { style: "margin:20px 0 8px" }, "Passage segmentation"),
        segmentationBlock(),
        uploadSlot({
          job,
          slot: "step3_segmentation",
          spec: SLOTS.step3_segmentation,
          disabled: job.status === "published",
          onChange: refresh,
        })
      ),
      runOptions: h(
        "div",
        { style: "margin:16px 0" },
        h(
          "label.check",
          allowGenerate,
          h("span", "Let the model re-split pages that have no segmentation")
        ),
        h("label.check", overwriteScopes, h("span", "Discard scope text kept from an earlier run"))
      ),
      getRunOptions: () => ({
        allow_generate: allowGenerate.checked,
        overwrite_scopes: overwriteScopes.checked,
      }),
      outputs: hasOutput
        ? h(
            "div",
            { style: "margin-top:18px" },
            h(
              "div.button-row",
              files.map((file) =>
                h(
                  "a.btn.small",
                  { href: downloadUrl(`/jobs/${job.id}/outputs/step3/file/${encodeURIComponent(file.name)}`), target: "_blank", rel: "noreferrer" },
                  file.name
                )
              )
            )
          )
        : null,
    });
  }

  /* ---------------------------------------------------------------- publish */

  function publishPanel() {
    const body = h("div.sheet-body");
    const panel = h(
      "div.sheet.spined",
      { id: "panel-publish", class: job.status === "published" ? "sheet spined state-approved" : "sheet spined" },
      h(
        "div.sheet-head",
        h("h2", job.mode === "import" ? "3. Publish" : "4. Publish"),
        job.status === "published" ? tag(`Published as ${job.published_version}`, "seal") : tag("Not published", "neutral")
      ),
      body
    );

    if (job.status === "published") {
      mount(
        body,
        h("p.hint", `This batch was merged into ${job.published_version} by ${job.published_by} on ${when(job.published_at)}.`),
        notice("A published batch is frozen. To correct something, start a new batch — versions are never edited in place.", "good"),
        h(
          "div.button-row",
          h("a.btn", { href: `#/versions/${job.published_version}` }, `Open ${job.published_version}`)
        )
      );
      return panel;
    }

    if (!job.gates.can_publish) {
      mount(
        body,
        h(
          "p.hint",
          job.mode === "import"
            ? "Import the step 3 output to merge this batch into a new data version."
            : "Finish step 3 to merge this batch into a new data version."
        )
      );
      return panel;
    }

    const previewHost = h("div");
    mount(
      body,
      h("p.hint", "Merging appends this batch to the version being served and writes the result as a new version. Nothing that is already published is changed, and the new version is not served until someone activates it."),
      h(
        "div.button-row",
        h("button.primary", { onclick: loadPreview }, "Check what would change"),
        h("button.small", { onclick: () => openBatchPreview() }, "Look through this batch's data")
      ),
      previewHost
    );

    async function loadPreview() {
      mount(previewHost, h("div.loading", "Working out the merge…"));
      try {
        const report = await api.publishPreview(job.id);
        renderPreview(report);
      } catch (error) {
        mount(previewHost, notice(error.message, "bad"));
      }
    }

    function renderPreview(report) {
      const warnings = report.warnings || [];
      mount(
        previewHost,
        h(
          "div",
          { style: "margin-top:18px" },
          h(
            "div.stats",
            stat("New questions", count(report.added)),
            stat("Total after merge", count(report.total_questions)),
            stat("New answer entries", count(report.new_scopes)),
            report.skipped_duplicates ? stat("Skipped duplicates", count(report.skipped_duplicates), "warn") : null,
            report.dangling_scope_refs ? stat("Questions with no answer", count(report.dangling_scope_refs), "bad") : null
          ),
          h("p.hint", { style: "margin-top:12px" }, `${report.base_version} → ${report.next_version}`),
          warnings.length
            ? h("div.notice.notice-warn", h("b", "Before you publish"), h("ul", warnings.map((line) => h("li", line))))
            : notice("Nothing looks wrong with this merge.", "good"),
          h(
            "div.button-row",
            { style: "margin-top:14px" },
            user.is_admin
              ? h("button.seal", { onclick: () => openPublishDialog(report) }, `Publish as ${report.next_version}`)
              : h("span.hint", "Publishing needs an administrator account.")
          )
        )
      );
    }

    function openPublishDialog(report) {
      const label = h("input", { type: "text", value: `${job.batch_label} merged into ${report.base_version}` });
      const notes = h("textarea", { placeholder: "What is in this batch, and anything the next person should know." });
      const buildIndex = h("input", { type: "checkbox", checked: true });

      modal({
        title: `Publish ${report.next_version}`,
        body: h(
          "div",
          h("p", `${count(report.added)} questions and ${count(report.new_scopes)} answer entries will be added to ${report.base_version}, and the result written as ${report.next_version}.`),
          report.dangling_scope_refs
            ? notice(`${count(report.dangling_scope_refs)} of these questions have no answer text and would be served empty. Consider fixing them first.`, "bad")
            : null,
          field("Name", label),
          field("Notes", notes),
          h("label.check", buildIndex, h("span", "Start building the search index straight away")),
          h("p.hint", "The new version is not served until someone activates it, so this is safe to do ahead of a switchover.")
        ),
        actions: (close) => [
          h("button", { onclick: close }, "Cancel"),
          h(
            "button.seal",
            {
              onclick: async (event) => {
                event.currentTarget.disabled = true;
                try {
                  const result = await api.publish(job.id, {
                    confirm: true,
                    label: label.value,
                    notes: notes.value,
                    build_index: buildIndex.checked,
                  });
                  close();
                  toast(result.message, "good");
                  await refresh();
                } catch (error) {
                  toast(error.message, "bad");
                  event.currentTarget.disabled = false;
                }
              },
            },
            "Publish"
          ),
        ],
      });
    }

    return panel;
  }

  function openBatchPreview() {
    modal({
      title: `${job.name} — what this batch adds`,
      wide: true,
      body: dataPreview({
        label: "this batch",
        questions: (params) => api.jobQuestions(job.id, params),
        question: (identifier) => api.jobQuestion(job.id, identifier),
        scopes: (params) => api.jobScopes(job.id, params),
        summary: () => api.jobSummary(job.id),
      }),
      actions: (close) => [h("button", { onclick: close }, "Close")],
    });
  }

  /* ----------------------------------------------------------------- import */

  function importPanel() {
    const state = job.steps.step3 || { state: "pending" };
    const imported = Boolean(state.run && state.run.imported);
    const resultHost = h("div");
    const uploads = job.uploads.step3_output || [];

    async function runCheck({ silent = false } = {}) {
      if (!uploads.length) {
        mount(resultHost);
        return null;
      }
      if (!silent) mount(resultHost, h("div.loading", "Checking the files…"));
      try {
        const report = await api.checkImport(job.id);
        renderReport(report);
        return report;
      } catch (error) {
        mount(resultHost, notice(error.message, "bad"));
        return null;
      }
    }

    function renderReport(report, { afterImport = false } = {}) {
      const blocks = [];

      if (report.errors && report.errors.length) {
        blocks.push(
          h(
            "div.notice.notice-bad",
            h("b", report.errors.length === 1 ? "This cannot be imported" : `${report.errors.length} problems stop this import`),
            h("ul", report.errors.map((line) => h("li", line)))
          )
        );
      } else if (!afterImport) {
        blocks.push(notice("These files can be imported.", "good"));
      }

      if (report.warnings && report.warnings.length) {
        blocks.push(
          h(
            "div.notice.notice-warn",
            h("b", "Worth checking first"),
            h("ul", report.warnings.map((line) => h("li", line)))
          )
        );
      }

      const summary = report.summary || {};
      if (summary.questions !== undefined) {
        blocks.push(
          h(
            "div.stats",
            { style: "margin-top:14px" },
            stat("Questions", count(summary.questions)),
            stat("Answer entries", count(summary.scope_en)),
            stat("Chinese entries", count(summary.scope_zh), summary.has_chinese ? "" : "warn"),
            stat("Pages", count(summary.pages)),
            summary.dangling_scope_refs
              ? stat("No answer text", count(summary.dangling_scope_refs), "bad")
              : null
          )
        );
      }

      if (report.files && report.files.questions) {
        blocks.push(
          h(
            "p.hint",
            { style: "margin-top:12px" },
            `Read as — questions: ${report.files.questions}; English: ${report.files.scope_en || "none"}; Chinese: ${report.files.scope_zh || "none"}.`
          )
        );
      }

      if (report.ok && !afterImport && job.status !== "published") {
        blocks.push(
          h(
            "div.button-row",
            { style: "margin-top:14px" },
            h(
              "button.primary",
              {
                onclick: async (event) => {
                  event.currentTarget.disabled = true;
                  try {
                    const result = await api.runImport(job.id);
                    toast("Imported. Review the data, then publish.", "good");
                    await refresh();
                  } catch (error) {
                    toast(error.message, "bad");
                    event.currentTarget.disabled = false;
                    await runCheck({ silent: true });
                  }
                },
              },
              imported ? "Replace the imported data" : "Import these files"
            )
          )
        );
      }

      mount(resultHost, blocks);
    }

    const body = h(
      "div.sheet-body",
      h(
        "p.hint",
        "Upload the three files step 3 produces — questions.json, scope_en.json and scope_zh.json, or a zip of them. They are checked before anything is written, and nothing is imported unless every check passes."
      ),
      imported
        ? notice(
            `Imported by ${state.run.started_by} ${when(state.run.finished_at)}. ` +
              "Review the data below, then publish.",
            "good"
          )
        : null,
      uploadSlot({
        job,
        slot: "step3_output",
        spec: SLOTS.step3_output,
        disabled: job.status === "published",
        onChange: async () => {
          await refresh();
        },
      }),
      uploads.length
        ? h(
            "div.button-row",
            { style: "margin-top:14px" },
            h("button", { onclick: () => runCheck() }, "Check the files")
          )
        : null,
      resultHost
    );

    const panel = h(
      `div.sheet.spined.${imported ? "state-succeeded" : "state-pending"}`,
      { id: "panel-import" },
      h(
        "div.sheet-head",
        h("h2", "1. Import finished data"),
        imported ? tag("Imported", "seal") : tag("Nothing imported", "neutral"),
        job.mode === "import" && !imported && job.status !== "published"
          ? h(
              "button.quiet.small",
              {
                onclick: async () => {
                  try {
                    await api.setMode(job.id, "pipeline");
                    toast("Switched to running the pipeline.");
                    await refresh();
                  } catch (error) {
                    toast(error.message, "bad");
                  }
                },
              },
              "Run the pipeline instead"
            )
          : null
      ),
      body,
      imported
        ? h(
            "div.sheet-foot",
            h("span.spacer"),
            ...reviewControlsFor("step3")
          )
        : null
    );

    // Show the last check automatically, so reopening a batch does not look
    // like nothing was ever verified.
    if (uploads.length) runCheck({ silent: true });

    return panel;
  }

  /**
   * The sign-off control, shared by the import panel and the step panels.
   *
   * Importing skips the machine steps but not the review: the data still has to
   * be read by a person before it can become a published version.
   */
  function reviewControlsFor(step) {
    const state = job.steps[step] || {};
    if (state.approved) {
      return [
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
        ),
      ];
    }
    if (state.state !== "succeeded") return [];
    return [
      h(
        "button.seal",
        {
          onclick: () =>
            confirmAction({
              title: "Sign off this data?",
              body: "This records that you have reviewed it and unlocks publishing.",
              confirmLabel: "Sign off",
              onConfirm: async () => {
                await api.approveStep(job.id, step, true);
                toast("Signed off.", "good");
                await refresh();
              },
            }),
        },
        "I have reviewed this"
      ),
    ];
  }

  /**
   * Offered only on an untouched batch.
   *
   * Once a step has run, switching would strand its output, and the choice is
   * no longer a real one.
   */
  function pipelineSwitchNotice() {
    const untouched =
      job.status !== "published" &&
      Object.values(job.steps).every((state) => state.state === "pending") &&
      !job.gates.step1_has_output;
    if (!untouched) return null;

    return h(
      "div.notice",
      { style: "margin-bottom:16px" },
      h("span", "Already have the output of step 3 from somewhere else? "),
      h(
        "button.small",
        {
          style: "margin-left:8px",
          onclick: async () => {
            try {
              await api.setMode(job.id, "import");
              toast("Switched to importing finished data.");
              await refresh();
            } catch (error) {
              toast(error.message, "bad");
            }
          },
        },
        "Import it instead"
      )
    );
  }

  function importGateStrip() {
    const gates = job.gates;
    const state = job.steps.step3 || {};

    let importClass = "is-ready";
    let importNote = "Upload the three files";
    if (gates.imported) {
      importClass = "is-done";
      importNote = "Files imported";
    }

    let reviewClass = "is-blocked";
    let reviewNote = "Import the files first";
    if (state.approved) {
      reviewClass = "is-done";
      reviewNote = `Signed off by ${state.approved_by}`;
    } else if (gates.imported) {
      reviewClass = "is-review";
      reviewNote = "Waiting for your review";
    }

    let publishClass = "is-blocked";
    let publishNote = "Review the data first";
    if (job.status === "published") {
      publishClass = "is-done";
      publishNote = `Published as ${job.published_version}`;
    } else if (gates.can_publish) {
      publishClass = "is-ready";
      publishNote = "Ready to merge into a new version";
    }

    const cells = [
      ["1", "Import", importClass, importNote, "import"],
      ["2", "Review", reviewClass, reviewNote, "import"],
      ["3", "Publish", publishClass, publishNote, "publish"],
    ];

    return h(
      "div.gates",
      { style: "grid-template-columns: repeat(3, 1fr)" },
      cells.map(([number, name, className, note, anchor]) =>
        h(
          `button.gate.${className}`,
          {
            onclick: () => {
              const target = document.getElementById(`panel-${anchor}`);
              if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            },
          },
          h("span.gate-n", number),
          h("span.gate-name", name),
          h("span.gate-note", note)
        )
      )
    );
  }

  /* ----------------------------------------------------------------- render */

  function render() {
    const head = h(
      "div.page-head",
      h(
        "div",
        h("h1", job.name),
        h(
          "div.lede",
          `${job.batch_label} · started by ${job.created_by} ${when(job.created_at)}` +
            (job.notes ? ` · ${job.notes}` : "")
        )
      ),
      h(
        "div.page-head-actions",
        h("a.btn.small", { href: "#/batches" }, "All batches"),
        user.is_admin && job.status !== "published"
          ? h(
              "button.danger.small",
              {
                onclick: () =>
                  confirmAction({
                    title: `Delete ${job.name}?`,
                    body: "Every uploaded file and every step's output for this batch is deleted. Published versions are not affected.",
                    confirmLabel: "Delete this batch",
                    danger: true,
                    onConfirm: async () => {
                      await api.deleteJob(job.id);
                      toast("Batch deleted.");
                      window.location.hash = "#/batches";
                    },
                  }),
              },
              "Delete"
            )
          : null
      )
    );

    if (job.mode === "import") {
      mount(host, head, importGateStrip(), importPanel(), publishPanel());
      return;
    }

    mount(
      host,
      head,
      gateStrip(),
      pipelineSwitchNotice(),
      h("div", { id: "panel-step1" }, step1Panel()),
      h("div", { id: "panel-step2" }, step2Panel()),
      h("div", { id: "panel-step3" }, step3Panel()),
      publishPanel()
    );
  }

  refresh()
    .then(startWatching)
    .catch((error) => mount(host, empty("Could not open this batch", error.message)));

  return {
    destroy() {
      if (watcher) watcher.stop();
    },
  };
}

/* ------------------------------------------------------------ batch listing */

export function batchesView(root, { user }) {
  const host = h("div");
  mount(root, host);

  function newBatch() {
    const name = h("input", { type: "text", placeholder: "Batch 24" });
    const label = h("input", { type: "text", placeholder: "Batch_24" });
    const ids = h("input", { type: "text", placeholder: "2630-2700" });
    const notes = h("textarea", { placeholder: "Anything the next person should know." });
    const mode = h(
      "select",
      h("option", { value: "pipeline" }, "Run the pipeline — write, translate and build the data"),
      h("option", { value: "import" }, "Import finished step 3 output I already have")
    );

    // The page-id field only means anything when the pipeline will run.
    const idsField = field("Page ids", ids, "You can change these before running step 1.");
    mode.addEventListener("change", () => {
      idsField.style.display = mode.value === "import" ? "none" : "";
    });

    modal({
      title: "Start a batch",
      body: h(
        "div",
        field("Name", name, "What your team calls this batch."),
        field("Sheet label", label, "Used for the sheet name in the step 2 workbook and the File column, such as Batch_24."),
        field("How will the data be produced?", mode),
        idsField,
        field("Notes", notes)
      ),
      actions: (close) => [
        h("button", { onclick: close }, "Cancel"),
        h(
          "button.primary",
          {
            onclick: async (event) => {
              if (!name.value.trim()) return toast("Give the batch a name.", "bad");
              event.currentTarget.disabled = true;
              try {
                const job = await api.createJob({
                  name: name.value.trim(),
                  batch_label: label.value.trim() || name.value.trim(),
                  id_spec: ids.value.trim(),
                  notes: notes.value,
                  mode: mode.value,
                });
                close();
                window.location.hash = `#/batches/${job.id}`;
              } catch (error) {
                toast(error.message, "bad");
                event.currentTarget.disabled = false;
              }
            },
          },
          "Start the batch"
        ),
      ],
    });
  }

  function statusTag(job) {
    if (job.status === "published") return tag(`Published ${job.published_version}`, "seal");
    if (job.mode === "import") {
      if (job.gates.can_publish && job.steps.step3.approved) return tag("Ready to publish", "live");
      if (job.gates.imported) return tag("Imported, awaiting review", "pending");
      return tag("Waiting for files", "neutral");
    }
    const running = Object.entries(job.steps).find(([, state]) => state.state === "running");
    if (running) return tag(`Running step ${running[0].slice(-1)}`, "live", { pulse: true });
    const failed = Object.entries(job.steps).find(([, state]) => ["failed", "interrupted"].includes(state.state));
    if (failed) return tag(`Step ${failed[0].slice(-1)} needs attention`, "flag");
    const review = Object.entries(job.steps).find(
      ([, state]) => state.state === "succeeded" && !state.approved
    );
    if (review) return tag(`Step ${review[0].slice(-1)} awaiting review`, "pending");
    if (job.gates.can_publish) return tag("Ready to publish", "live");
    return tag("In progress", "neutral");
  }

  async function load() {
    mount(host, h("div.loading", "Loading batches…"));
    try {
      const payload = await api.jobs();
      const jobs = payload.jobs || [];
      mount(
        host,
        h(
          "div.page-head",
          h("div", h("h1", "Batches"), h("div.lede", "Each batch is one round of new questions moving from the CLIC pages to a published data version.")),
          h("div.page-head-actions", h("button.primary", { onclick: newBatch }, "Start a batch"))
        ),
        jobs.length
          ? h(
              "div.sheet.tight",
              h(
                "div.sheet-body.tight",
                h("div.table-wrap",
                  h(
                    "table",
                    h("thead", h("tr",
                      h("th", "Batch"),
                      h("th", "Where it is"),
                      h("th.nowrap", "Started"),
                      h("th.nowrap", "Last activity"),
                      h("th", "")
                    )),
                    h("tbody", jobs.map((job) =>
                      h("tr.clickable", { onclick: () => { window.location.hash = `#/batches/${job.id}`; } },
                        h("td",
                          h("b", job.name),
                          h("span.cell-sub",
                            `${job.batch_label} · ${job.created_by}` +
                              (job.mode === "import" ? " · imported" : "")
                          )
                        ),
                        h("td", statusTag(job)),
                        h("td.nowrap", when(job.created_at)),
                        h("td.nowrap", when(job.updated_at)),
                        h("td.nowrap", h("a.btn.small", { href: `#/batches/${job.id}` }, "Open"))
                      )
                    ))
                  )
                )
              )
            )
          : h(
              "div.sheet",
              empty(
                "No batches yet",
                "A batch takes a set of CLIC page ids through question writing, translation and review, and ends as a new version of the data.",
                h("button.primary", { onclick: newBatch }, "Start the first batch")
              )
            )
      );
    } catch (error) {
      mount(host, empty("Could not load batches", error.message));
    }
  }

  load();
  return { destroy() {} };
}
