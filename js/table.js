/*
  A table that never holds more than one page of rows.

  Every dataset behind this component is server-paged: the published question
  set is heading past 50,000 records and a single batch runs to several
  thousand. So filtering, sorting and paging are all parameters sent to the API,
  and what arrives back is one screen of rows. Nothing here ever accumulates a
  full dataset in the browser.
*/

import { clear, debounce, empty, h, mount } from "./dom.js";

const PAGE_SIZES = [25, 50, 100, 200];

/**
 * @param {object} options
 *   fetchPage  async ({page, page_size, ...filters}) -> {items, total, page, pages, has_more}
 *   columns    [{key, label, className, render(item) -> Node|string}]
 *   filters    [{name, type: "search"|"select", label, placeholder, options}]
 *   onRowClick optional (item) -> void
 *   emptyState {heading, detail}
 */
export function pagedTable(options) {
  const {
    fetchPage,
    columns,
    filters = [],
    onRowClick,
    emptyState = { heading: "Nothing here yet", detail: "" },
    pageSize = 25,
    initial = {},
  } = options;

  const state = {
    page: 1,
    page_size: pageSize,
    total: 0,
    pages: 1,
    loading: false,
    error: null,
    filters: { ...initial },
  };

  const tbody = h("tbody");
  const status = h("span.range");
  const bodyHost = h("div.table-wrap");
  const pagerHost = h("div.pager");
  const filterHost = h("div.toolbar");

  const prev = h("button.small", { onclick: () => go(state.page - 1) }, "Previous");
  const next = h("button.small", { onclick: () => go(state.page + 1) }, "Next");

  const sizeSelect = h(
    "select",
    {
      "aria-label": "Rows per page",
      style: "max-width:110px",
      onchange: (event) => {
        state.page_size = Number(event.target.value);
        go(1);
      },
    },
    PAGE_SIZES.map((size) => h("option", { value: size, selected: size === state.page_size }, `${size} rows`))
  );

  function buildFilters() {
    if (!filters.length) {
      filterHost.style.display = "none";
      return;
    }
    const controls = filters.map((filter) => {
      if (filter.type === "select") {
        const select = h(
          "select",
          {
            "aria-label": filter.label,
            onchange: (event) => {
              state.filters[filter.name] = event.target.value;
              go(1);
            },
          },
          h("option", { value: "" }, filter.label),
          (filter.options || []).map((option) =>
            h(
              "option",
              { value: option.value, selected: state.filters[filter.name] === option.value },
              option.label
            )
          )
        );
        select.dataset.filter = filter.name;
        return select;
      }
      const input = h("input", {
        type: "search",
        class: filter.grow === false ? "" : "grow",
        placeholder: filter.placeholder || filter.label,
        "aria-label": filter.label,
        value: state.filters[filter.name] || "",
        oninput: debounce((event) => {
          state.filters[filter.name] = event.target.value;
          go(1);
        }, 280),
      });
      if (filter.grow !== false) input.classList.add("grow");
      return input;
    });
    mount(filterHost, controls);
  }

  /** Refresh a select's options after the facets arrive from the server. */
  function setFilterOptions(name, values) {
    const select = filterHost.querySelector(`select[data-filter="${name}"]`);
    if (!select) return;
    const current = state.filters[name] || "";
    const definition = filters.find((filter) => filter.name === name);
    clear(select);
    select.appendChild(h("option", { value: "" }, definition ? definition.label : "All"));
    values.forEach((option) => {
      select.appendChild(
        h("option", { value: option.value, selected: option.value === current }, option.label)
      );
    });
    select.value = current;
  }

  function renderRows(items) {
    if (!items.length) {
      const message = Object.values(state.filters).some(Boolean)
        ? empty("No matches", "Try a different search or clear the filters.")
        : empty(emptyState.heading, emptyState.detail);
      mount(bodyHost, message);
      return;
    }

    mount(
      tbody,
      items.map((item) => {
        const row = h(
          onRowClick ? "tr.clickable" : "tr",
          onRowClick
            ? {
                onclick: () => onRowClick(item),
                tabindex: 0,
                onkeydown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick(item);
                  }
                },
              }
            : null,
          columns.map((column) => {
            const value = column.render ? column.render(item) : item[column.key];
            return h(`td${column.className ? `.${column.className}` : ""}`, value ?? "");
          })
        );
        if (options.rowClass) {
          const extra = options.rowClass(item);
          if (extra) row.classList.add(extra);
        }
        return row;
      })
    );

    const table = h(
      "table",
      h("thead", h("tr", columns.map((column) => h(`th${column.className ? `.${column.className}` : ""}`, column.label)))),
      tbody
    );
    mount(bodyHost, table);
  }

  function renderPager() {
    const first = state.total === 0 ? 0 : (state.page - 1) * state.page_size + 1;
    const last = Math.min(state.total, state.page * state.page_size);
    status.textContent = state.total
      ? `${first.toLocaleString()}–${last.toLocaleString()} of ${state.total.toLocaleString()}`
      : "No rows";
    prev.disabled = state.page <= 1 || state.loading;
    next.disabled = state.page >= state.pages || state.loading;
    mount(
      pagerHost,
      status,
      h("span.spacer"),
      sizeSelect,
      h("span", `Page ${state.page.toLocaleString()} of ${state.pages.toLocaleString()}`),
      prev,
      next
    );
  }

  async function go(page) {
    state.page = Math.max(1, page);
    state.loading = true;
    renderPager();
    try {
      const payload = await fetchPage({
        page: state.page,
        page_size: state.page_size,
        ...state.filters,
      });
      state.total = payload.total ?? 0;
      state.pages = payload.pages ?? 1;
      state.page = payload.page ?? state.page;
      state.error = null;
      renderRows(payload.items || []);
    } catch (error) {
      state.error = error;
      mount(bodyHost, empty("Could not load this list", error.message));
    } finally {
      state.loading = false;
      renderPager();
    }
  }

  buildFilters();

  const element = h("div", filterHost, bodyHost, pagerHost);

  return {
    element,
    reload: () => go(state.page),
    reset: () => go(1),
    setFilterOptions,
    setFilter(name, value) {
      state.filters[name] = value;
      const control = filterHost.querySelector(`[data-filter="${name}"]`);
      if (control) control.value = value;
      return go(1);
    },
    get state() { return state; },
  };
}
