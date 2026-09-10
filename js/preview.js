/*
  The data preview, shared by published versions and unpublished batches.

  Same component both places on purpose: reviewing what a batch will add and
  reviewing what a version already contains are the same task, and the
  reviewer's habits should carry across.
*/

import { count, empty, h, modal, mount, notice, stat, tag, truncate } from "./dom.js";
import { pagedTable } from "./table.js";

/**
 * @param {object} source
 *   questions(params), question(identifier), scopes(params), summary()
 *   label — what this data is, for empty states
 */
export function dataPreview(source) {
  const host = h("div");
  const tabs = h("div.button-row", { style: "margin-bottom:14px" });
  const panel = h("div");
  let summary = null;
  let questionTable = null;
  let scopeTable = null;
  let current = "questions";

  function showDetail(identifier) {
    source
      .question(identifier)
      .then((detail) => {
        const record = detail.record || {};
        const languages = Object.entries(detail.scopes || {});
        modal({
          title: record.Identifier || "Question",
          wide: true,
          body: h(
            "div",
            h("div.stats", { style: "margin-bottom:16px" },
              stat("Page", record.page ?? "—"),
              stat("Topic", record.Topic || "—"),
              stat("Source", record.Method || "—"),
              stat("Row", detail.index)
            ),
            h("div.field", h("label", "English"), h("div", record.Question || "—")),
            h("div.field", h("label", "Traditional Chinese"), h("div", record.Traditional_Chinese || "—")),
            h("div.field", h("label", "Simplified Chinese"), h("div", record.Simplified_Chinese || "—")),
            record.URL
              ? h("div.field", h("label", "Page"), h("a", { href: record.URL, target: "_blank", rel: "noreferrer" }, record.URL))
              : null,
            h("div.field",
              h("label", "Answer text"),
              languages.length
                ? languages.map(([language, entries]) =>
                    h("div", { style: "margin-bottom:12px" },
                      h("div.hint", { style: "margin-bottom:4px" }, language),
                      entries.length
                        ? entries.map((entry) =>
                            h("div", { style: "margin-bottom:8px" },
                              h("code.scope-id", { style: "font-size:12px" }, entry.scope_id),
                              entry.text
                                ? h("div", { style: "margin-top:3px" }, entry.text)
                                : h("div.hint", { style: "margin-top:3px;color:var(--flag)" },
                                    "No text for this scope id — this question would be served with no answer.")
                            )
                          )
                        : h("div.hint", "This question points at no answer text.")
                    )
                  )
                : h("div.hint", "No answer text is available for this dataset.")
            )
          ),
          actions: (close) => [h("button", { onclick: close }, "Close")],
        });
      })
      .catch((error) => {
        modal({ title: "Could not open that question", body: h("p", error.message), actions: (close) => [h("button", { onclick: close }, "Close")] });
      });
  }

  function buildQuestions() {
    return pagedTable({
      fetchPage: (params) => source.questions(params),
      onRowClick: (item) => showDetail(item.identifier),
      emptyState: {
        heading: "No questions yet",
        detail: `There is nothing in ${source.label} to look at.`,
      },
      filters: [
        { name: "q", type: "search", label: "Search", placeholder: "Search questions, identifiers, Chinese text…" },
        { name: "topic", type: "select", label: "All topics", options: [] },
        {
          name: "method",
          type: "select",
          label: "All sources",
          options: [
            { value: "Machine", label: "Machine" },
            { value: "Human", label: "Human" },
          ],
        },
        { name: "page_id", type: "search", label: "Page id", placeholder: "Page id", grow: false },
      ],
      columns: [
        {
          key: "question",
          label: "Question",
          className: "wrap",
          render: (item) =>
            h(
              "div",
              truncate(item.question, 180),
              item.question_tc ? h("span.cell-sub", truncate(item.question_tc, 90)) : null
            ),
        },
        { key: "topic", label: "Topic", className: "nowrap", render: (item) => item.topic || "—" },
        { key: "page", label: "Page", className: "num nowrap" },
        {
          key: "identifier",
          label: "Identifier",
          className: "num nowrap",
          render: (item) => h("code", { style: "font-size:12px" }, item.identifier),
        },
        {
          key: "answers",
          label: "Answer",
          className: "nowrap",
          render: (item) => {
            if (!item.answer_ids.length) return tag("None", "pending");
            if (item.missing_scope && item.missing_scope.length) return tag("Missing text", "flag");
            return h("span.hint", `${item.answer_ids.length} scope${item.answer_ids.length > 1 ? "s" : ""}`);
          },
        },
      ],
    });
  }

  function buildScopes() {
    return pagedTable({
      fetchPage: (params) => source.scopes(params),
      emptyState: { heading: "No answer text yet", detail: "" },
      filters: [
        { name: "q", type: "search", label: "Search", placeholder: "Search answer text or scope id…" },
        { name: "page_id", type: "search", label: "Page id", placeholder: "Page id", grow: false },
        {
          name: "only_missing",
          type: "select",
          label: "All entries",
          options: [
            { value: "TC", label: "Missing Traditional Chinese" },
            { value: "SC", label: "Missing Simplified Chinese" },
          ],
        },
      ],
      columns: [
        {
          key: "scope_id",
          label: "Scope id",
          className: "num nowrap",
          render: (item) => h("code", { style: "font-size:12px" }, item.scope_id),
        },
        { key: "EN", label: "English", className: "wrap", render: (item) => truncate(item.EN, 220) || h("span.hint", "—") },
        {
          key: "TC",
          label: "Traditional Chinese",
          className: "wrap",
          render: (item) => truncate(item.TC, 160) || h("span.hint", "—"),
        },
        {
          key: "SC",
          label: "Simplified Chinese",
          className: "wrap",
          render: (item) => truncate(item.SC, 160) || h("span.hint", "—"),
        },
      ],
    });
  }

  function renderTabs() {
    mount(
      tabs,
      h(
        `button.small${current === "questions" ? ".primary" : ""}`,
        { onclick: () => select("questions") },
        summary && summary.questions ? `Questions (${count(summary.questions.total)})` : "Questions"
      ),
      h(
        `button.small${current === "scopes" ? ".primary" : ""}`,
        { onclick: () => select("scopes") },
        summary && summary.scopes ? `Answer text (${count(summary.scopes.total)})` : "Answer text"
      )
    );
  }

  function select(which) {
    current = which;
    renderTabs();
    if (which === "questions") {
      if (!questionTable) {
        questionTable = buildQuestions();
        applyFacets();
        questionTable.reset();
      }
      mount(panel, questionTable.element);
    } else {
      if (!scopeTable) {
        scopeTable = buildScopes();
        scopeTable.reset();
      }
      mount(panel, scopeTable.element);
    }
  }

  function applyFacets() {
    if (!questionTable || !summary || !summary.questions) return;
    questionTable.setFilterOptions(
      "topic",
      (summary.questions.topics || []).map((entry) => ({
        value: entry.value,
        label: `${entry.value} (${count(entry.count)})`,
      }))
    );
  }

  async function load() {
    mount(host, h("div.loading", "Loading…"));
    try {
      summary = await source.summary();
    } catch (error) {
      mount(host, empty("Could not load this data", error.message));
      return;
    }

    if (!summary.questions) {
      mount(host, empty("Nothing to preview yet", `${source.label} has no data files.`));
      return;
    }

    const warnings = [];
    const missing = (summary.scopes && summary.scopes.missing_against_english) || {};
    Object.entries(missing).forEach(([language, number]) => {
      if (number > 0) warnings.push(`${count(number)} scope entries have no ${language} text.`);
    });

    mount(
      host,
      h(
        "div.sheet",
        h(
          "div.sheet-body",
          h(
            "div.stats",
            stat("Questions", count(summary.questions.total)),
            stat("Answer entries", count(summary.scopes ? summary.scopes.total : 0)),
            stat("Topics", count((summary.questions.topics || []).length)),
            stat("Pages", count(summary.questions.page_count))
          ),
          warnings.length ? h("div", { style: "margin-top:14px" }, notice(warnings.join(" "), "warn")) : null
        )
      ),
      tabs,
      h("div.sheet.tight", h("div.sheet-body.tight", panel))
    );

    renderTabs();
    select(current);
  }

  load();
  return host;
}
