/* Getting in, and deciding who else may. */

import { api, session } from "./../api.js";
import { confirmAction, empty, field, h, modal, mount, notice, tag, toast, when } from "./../dom.js";

/**
 * The sign-in screen, which doubles as first-run setup.
 *
 * Curation rewrites what the public sees, so there is no anonymous mode. On a
 * brand new deployment there are no accounts at all, and the first person to
 * arrive creates the administrator.
 */
export function signInView(root, { onSignedIn }) {
  const host = h("div.signin");
  mount(root, host);

  const username = h("input", { type: "text", autocomplete: "username", required: true });
  const password = h("input", { type: "password", autocomplete: "current-password", required: true });
  const message = h("div");
  let needsBootstrap = false;

  async function submit(event) {
    event.preventDefault();
    mount(message);
    const name = username.value.trim();
    if (!name || !password.value) {
      mount(message, notice("Enter your username and password.", "warn"));
      return;
    }
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = needsBootstrap
        ? await api.bootstrap(name, password.value)
        : await api.login(name, password.value);
      session.save(result.token, result.user);
      onSignedIn(result.user);
    } catch (error) {
      mount(message, notice(error.message, "bad"));
      button.disabled = false;
      password.value = "";
      password.focus();
    }
  }

  const form = h(
    "form",
    { onsubmit: submit },
    field("Username", username),
    field("Password", password),
    message,
    h("div.button-row", { style: "margin-top:16px" }, h("button.primary", { type: "submit" }, "Sign in"))
  );

  const panel = h(
    "div.signin-panel",
    h("span.wordmark", "CLIC ", h("span", "curation")),
    h("div.lede", "Sign in to prepare and publish recommender data."),
    h("div.sheet", h("div.sheet-body", form))
  );
  mount(host, panel);

  api
    .config()
    .then((config) => {
      if (!config.needs_bootstrap) return;
      needsBootstrap = true;
      username.autocomplete = "off";
      password.autocomplete = "new-password";
      mount(
        panel,
        h("span.wordmark", "CLIC ", h("span", "curation")),
        h("div.lede", "No accounts exist yet. Create the administrator to get started."),
        h(
          "div.sheet",
          h(
            "div.sheet-body",
            notice("Whoever creates this account can publish data and manage everyone else's access.", "warn"),
            form
          )
        )
      );
      form.querySelector("button[type=submit]").textContent = "Create the administrator";
      const help = h("div.field-help", "At least 10 characters.");
      password.parentElement.appendChild(help);
    })
    .catch(() => {
      /* If /config is unreachable the sign-in form still works. */
    });

  username.focus();
  return { destroy() {} };
}

export function peopleView(root, { user, onSignedOut }) {
  const host = h("div");
  mount(root, host);

  function addUser() {
    const username = h("input", { type: "text", autocomplete: "off" });
    const password = h("input", { type: "password", autocomplete: "new-password" });
    const role = h(
      "select",
      h("option", { value: "curator" }, "Curator — runs batches"),
      h("option", { value: "admin" }, "Administrator — also publishes and manages people")
    );

    modal({
      title: "Add someone",
      body: h(
        "div",
        field("Username", username),
        field("Password", password, "At least 10 characters. Ask them to change it after their first sign-in."),
        field("Role", role, "Curators can do everything in a batch up to publishing. Only administrators publish versions and decide which one is served.")
      ),
      actions: (close) => [
        h("button", { onclick: close }, "Cancel"),
        h(
          "button.primary",
          {
            onclick: async (event) => {
              event.currentTarget.disabled = true;
              try {
                await api.createUser({
                  username: username.value.trim(),
                  password: password.value,
                  role: role.value,
                });
                close();
                toast("Account created.", "good");
                await load();
              } catch (error) {
                toast(error.message, "bad");
                event.currentTarget.disabled = false;
              }
            },
          },
          "Create the account"
        ),
      ],
    });
  }

  function changeMyPassword() {
    const current = h("input", { type: "password", autocomplete: "current-password" });
    const next = h("input", { type: "password", autocomplete: "new-password" });

    modal({
      title: "Change your password",
      body: h(
        "div",
        field("Current password", current),
        field("New password", next, "At least 10 characters."),
        notice("You will be signed out of every device once this is saved.", "warn")
      ),
      actions: (close) => [
        h("button", { onclick: close }, "Cancel"),
        h(
          "button.primary",
          {
            onclick: async (event) => {
              event.currentTarget.disabled = true;
              try {
                await api.changePassword(current.value, next.value);
                close();
                toast("Password changed. Sign in again.", "good");
                session.clear();
                onSignedOut();
              } catch (error) {
                toast(error.message, "bad");
                event.currentTarget.disabled = false;
              }
            },
          },
          "Change it"
        ),
      ],
    });
  }

  async function load() {
    mount(host, h("div.loading", "Loading…"));

    const head = h(
      "div.page-head",
      h("div", h("h1", "People"), h("div.lede", "Who can prepare data, and who can publish it.")),
      h(
        "div.page-head-actions",
        h("button.small", { onclick: changeMyPassword }, "Change my password"),
        user.is_admin ? h("button.primary", { onclick: addUser }, "Add someone") : null
      )
    );

    if (!user.is_admin) {
      mount(
        host,
        head,
        h(
          "div.sheet",
          h(
            "div.sheet-body",
            h("p", `You are signed in as ${user.username}, a curator. You can run batches and review their output.`),
            h("p.hint", "Publishing a version and choosing which one is served need an administrator account.")
          )
        )
      );
      return;
    }

    try {
      const payload = await api.listUsers();
      mount(
        host,
        head,
        h(
          "div.sheet.tight",
          h(
            "div.sheet-body.tight",
            h(
              "div.table-wrap",
              h(
                "table",
                h("thead", h("tr", h("th", "Person"), h("th", "Role"), h("th", "Status"), h("th", ""))),
                h(
                  "tbody",
                  (payload.users || []).map((person) =>
                    h(
                      "tr",
                      h("td", h("b", person.username), person.username === user.username ? h("span.cell-sub", "That's you") : null),
                      h("td", person.is_admin ? tag("Administrator", "seal") : tag("Curator", "neutral")),
                      h("td", person.disabled ? tag("Disabled", "flag") : tag("Active", "neutral")),
                      h(
                        "td.nowrap",
                        h(
                          "div.button-row",
                          person.username === user.username
                            ? null
                            : h(
                                "button.small",
                                {
                                  onclick: async () => {
                                    try {
                                      await api.updateUser(person.username, { disabled: !person.disabled });
                                      await load();
                                    } catch (error) {
                                      toast(error.message, "bad");
                                    }
                                  },
                                },
                                person.disabled ? "Re-enable" : "Disable"
                              ),
                          person.username === user.username
                            ? null
                            : h(
                                "button.small",
                                {
                                  onclick: async () => {
                                    try {
                                      await api.updateUser(person.username, {
                                        role: person.is_admin ? "curator" : "admin",
                                      });
                                      await load();
                                    } catch (error) {
                                      toast(error.message, "bad");
                                    }
                                  },
                                },
                                person.is_admin ? "Make curator" : "Make administrator"
                              ),
                          person.username === user.username
                            ? null
                            : h(
                                "button.quiet",
                                {
                                  title: `Delete ${person.username}`,
                                  onclick: () =>
                                    confirmAction({
                                      title: `Delete ${person.username}?`,
                                      body: "They lose access immediately. Batches they worked on are unaffected.",
                                      confirmLabel: "Delete the account",
                                      danger: true,
                                      onConfirm: async () => {
                                        await api.deleteUser(person.username);
                                        toast("Account deleted.");
                                        await load();
                                      },
                                    }),
                                },
                                "✕"
                              )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      );
    } catch (error) {
      mount(host, head, empty("Could not load accounts", error.message));
    }
  }

  load();
  return { destroy() {} };
}
