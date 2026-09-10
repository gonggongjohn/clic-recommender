/*
  Talking to the curation API.

  The console can be hosted three ways, so the API base is resolved rather than
  hard-coded:

    1. Azure Static Web Apps with a linked backend — the container app is
       proxied at /api, so the base is /api/recommender/admin.
    2. Any static host, cross-origin — config.js carries the container's URL and
       the backend allows that origin via ADMIN_CORS_ORIGINS.
    3. Served by the backend itself at /recommender/curation/ — the base is the
       /admin sibling of wherever this page is mounted.

  Resolution order is: ?api= override, then config.js, then same-origin
  derivation. If none apply the app says so plainly instead of firing requests
  at a URL that was never configured.
*/

const TOKEN_KEY = "clic.curation.token";
const USER_KEY = "clic.curation.user";
const API_OVERRIDE_KEY = "clic.curation.api";

/** Trailing slashes make every joined path double-slashed; strip them once here. */
function tidy(base) {
  return String(base || "").trim().replace(/\/+$/, "");
}

/**
 * Same-origin fallback, for when the backend serves this page itself.
 *   .../recommender/curation/  ->  .../recommender/admin
 *   .../curation/              ->  .../admin
 * Returns "" when the page is not mounted under a /curation path, which is the
 * case on a static host and means config.js has to supply the base.
 */
function deriveFromPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  if (!/\/curation$/.test(path)) return "";
  return path.replace(/\/curation$/, "/admin") || "/admin";
}

function resolveBase() {
  // An ?api= override is remembered for the tab, so a developer can point a
  // deployed console at a local backend without editing anything.
  const requested = new URLSearchParams(window.location.search).get("api");
  if (requested !== null) {
    try {
      if (requested) sessionStorage.setItem(API_OVERRIDE_KEY, tidy(requested));
      else sessionStorage.removeItem(API_OVERRIDE_KEY);
    } catch { /* ignore */ }
  }
  try {
    const stored = sessionStorage.getItem(API_OVERRIDE_KEY);
    if (stored) return { base: tidy(stored), source: "url override" };
  } catch { /* ignore */ }

  const configured = tidy((window.CLIC_CONSOLE_CONFIG || {}).apiBaseUrl);
  if (configured) return { base: configured, source: "config.js" };

  const derived = deriveFromPath();
  if (derived) return { base: derived, source: "same origin" };

  return { base: "", source: "unconfigured" };
}

const resolved = resolveBase();
export const BASE = resolved.base;
export const BASE_SOURCE = resolved.source;
export const IS_CONFIGURED = Boolean(BASE);

export const session = {
  get token() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  },
  save(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* private browsing: the session lasts until reload */ }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  constructor(message, status, code, payload) {
    super(message);
    this.status = status;
    this.code = code;
    this.payload = payload || {};
  }
}

/** Listeners fired when the server stops accepting our token. */
const expiryHandlers = new Set();
export function onSessionExpired(handler) { expiryHandlers.add(handler); }

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = session.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  let response;
  try {
    response = await fetch(BASE + path, { ...options, headers, body, mode: "cors" });
  } catch (error) {
    // Two very different problems land here. A container that has scaled to
    // zero drops the first request while it wakes, which is transient. A CORS
    // rejection also throws a bare TypeError, and no amount of retrying fixes
    // it — so when the console is hosted elsewhere, say which origin has to be
    // allowed rather than blaming the network.
    const sameOrigin = BASE.startsWith("/") || BASE.startsWith(window.location.origin);
    throw new ApiError(
      sameOrigin
        ? "Could not reach the server. It may be starting up — try again in a moment."
        : `Could not reach ${BASE}. If the server is running, check that ADMIN_CORS_ORIGINS on the container includes ${window.location.origin}.`,
      0,
      "offline"
    );
  }

  if (response.status === 204) return null;

  const isJson = (response.headers.get("Content-Type") || "").includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const message = payload.error || `The server returned ${response.status}.`;
    if (response.status === 401 && path !== "/auth/login") {
      session.clear();
      expiryHandlers.forEach((handler) => handler(message));
    }
    throw new ApiError(message, response.status, payload.code || "error", payload);
  }
  return payload;
}

const get = (path) => request(path);
const post = (path, json) => request(path, { method: "POST", json: json ?? {} });
const patch = (path, json) => request(path, { method: "PATCH", json: json ?? {} });
const remove = (path) => request(path, { method: "DELETE" });

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

/** A download URL carrying the token, for links opened in a new tab. */
export function downloadUrl(path, params = {}) {
  return BASE + path + query({ ...params, token: session.token });
}

export const api = {
  config: () => get("/config"),

  login: (username, password) => post("/auth/login", { username, password }),
  bootstrap: (username, password) => post("/auth/bootstrap", { username, password }),
  me: () => get("/auth/me"),
  changePassword: (current_password, new_password) =>
    post("/auth/password", { current_password, new_password }),
  listUsers: () => get("/auth/users"),
  createUser: (payload) => post("/auth/users", payload),
  updateUser: (username, payload) => patch(`/auth/users/${encodeURIComponent(username)}`, payload),
  deleteUser: (username) => remove(`/auth/users/${encodeURIComponent(username)}`),

  service: () => get("/service"),
  reloadService: () => post("/service/reload"),

  versions: () => get("/versions"),
  version: (id) => get(`/versions/${id}`),
  updateVersion: (id, payload) => patch(`/versions/${id}`, payload),
  activate: (version, force) => post("/versions/active", { version, force, reload: true }),
  bootstrapVersions: () => post("/versions/bootstrap"),
  deleteVersion: (id) => remove(`/versions/${id}`),
  buildIndex: (id, force_full) => post(`/versions/${id}/index`, { force_full }),
  indexStatus: (id) => get(`/versions/${id}/index`),
  cancelIndex: (id) => post(`/versions/${id}/index/cancel`),

  versionQuestions: (id, params) => get(`/versions/${id}/preview/questions${query(params)}`),
  versionQuestion: (id, identifier) =>
    get(`/versions/${id}/preview/questions/${encodeURIComponent(identifier)}`),
  versionScopes: (id, params) => get(`/versions/${id}/preview/scopes${query(params)}`),
  versionSummary: (id) => get(`/versions/${id}/preview/summary`),

  jobs: () => get("/jobs"),
  job: (id) => get(`/jobs/${id}`),
  createJob: (payload) => post("/jobs", payload),
  updateJob: (id, payload) => patch(`/jobs/${id}`, payload),
  deleteJob: (id) => remove(`/jobs/${id}`),

  uploads: (id, slot, files, onProgress) => upload(`/jobs/${id}/uploads/${slot}`, files, onProgress),
  deleteUpload: (id, slot, name) =>
    remove(`/jobs/${id}/uploads/${slot}/${encodeURIComponent(name)}`),

  runStep: (id, step, options) => post(`/jobs/${id}/steps/${step}/run`, options),
  cancelStep: (id, step) => post(`/jobs/${id}/steps/${step}/cancel`),
  approveStep: (id, step, approved) => post(`/jobs/${id}/steps/${step}/approve`, { approved }),
  stepLog: (id, step, lines) => get(`/jobs/${id}/steps/${step}/log${query({ lines })}`),

  step1Files: (id, params) => get(`/jobs/${id}/preview/step1${query(params)}`),
  outputText: (id, step, name) =>
    get(`/jobs/${id}/outputs/${step}/file/${encodeURIComponent(name)}${query({ inline: 1 })}`),
  worksheet: (id, params) => get(`/jobs/${id}/preview/worksheet${query(params)}`),
  segmentation: (id) => get(`/jobs/${id}/preview/segmentation`),

  jobQuestions: (id, params) => get(`/jobs/${id}/preview/questions${query(params)}`),
  jobQuestion: (id, identifier) =>
    get(`/jobs/${id}/preview/questions/${encodeURIComponent(identifier)}`),
  jobScopes: (id, params) => get(`/jobs/${id}/preview/scopes${query(params)}`),
  jobSummary: (id) => get(`/jobs/${id}/preview/summary`),

  publishPreview: (id, params) => get(`/jobs/${id}/publish/preview${query(params)}`),
  publish: (id, payload) => post(`/jobs/${id}/publish`, payload),
};

/**
 * Upload with progress. XHR rather than fetch because reviewer workbooks run to
 * tens of megabytes and a progress bar is the difference between "working" and
 * "broken" on a slow connection.
 */
function upload(path, files, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("file", file));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + path);
    const token = session.token;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (event) => {
      if (onProgress && event.lengthComputable) onProgress(event.loaded / event.total);
    });
    xhr.addEventListener("load", () => {
      let payload = {};
      try { payload = JSON.parse(xhr.responseText || "{}"); } catch { /* keep empty */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(payload);
      if (xhr.status === 401) {
        session.clear();
        expiryHandlers.forEach((handler) => handler(payload.error || "Session expired."));
      }
      reject(new ApiError(payload.error || `Upload failed (${xhr.status}).`, xhr.status, payload.code, payload));
    });
    xhr.addEventListener("error", () => reject(new ApiError("The upload could not reach the server.", 0, "offline")));
    xhr.send(form);
  });
}
