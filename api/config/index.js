/*
  Hands the console its API base at runtime.

  Static Web Apps application settings are environment variables for the
  managed Functions API only — static files are served exactly as uploaded, so
  nothing in index.html or a .js file can read them. This function is the bridge:
  it reads BACKEND from the app settings and the console fetches it on startup.

  The value can therefore be changed in the Azure portal and takes effect on the
  next page load, with no redeploy and nothing rebuilt.

  Set in: Static Web App -> Settings -> Environment variables -> BACKEND

      BACKEND = https://clic-recommender.azurecontainerapps.io

  The admin path is appended if it is missing, so all of these work:

      https://clic-recommender.azurecontainerapps.io
      https://clic-recommender.azurecontainerapps.io/
      https://clic-recommender.azurecontainerapps.io/recommender/admin
      https://clic-recommender.azurecontainerapps.io/admin

  Nothing secret passes through here: the value is a public hostname that the
  browser is about to call anyway. Do not put keys in app settings expecting
  them to stay private — anything this function returns is public.
*/

const ADMIN_SUFFIXES = ["/recommender/admin", "/admin"];
const DEFAULT_ADMIN_PATH = "/recommender/admin";

/**
 * Turn whatever was typed into the portal into a usable API base.
 *
 * Operators reasonably paste the container's hostname rather than the full
 * admin path, so a bare origin is completed rather than rejected.
 */
function normalise(raw) {
  const value = String(raw || "").trim();
  if (!value) return { apiBaseUrl: "", problem: "BACKEND is not set." };

  // Root-relative is allowed for the linked-backend arrangement.
  if (value.startsWith("/")) {
    const path = value.replace(/\/+$/, "");
    return { apiBaseUrl: ADMIN_SUFFIXES.some((s) => path.endsWith(s)) ? path : `${path}${DEFAULT_ADMIN_PATH}` };
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return {
      apiBaseUrl: "",
      problem: `BACKEND is not a URL: ${value}. Use the container app's https:// address.`,
    };
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return {
      apiBaseUrl: "",
      problem: `BACKEND must use https (got ${url.protocol.replace(":", "")}).`,
    };
  }

  const base = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  if (ADMIN_SUFFIXES.some((suffix) => base.endsWith(suffix))) return { apiBaseUrl: base };
  return { apiBaseUrl: `${base}${DEFAULT_ADMIN_PATH}` };
}

module.exports = async function (context) {
  const { apiBaseUrl, problem } = normalise(process.env.BACKEND);

  if (problem) {
    context.log.warn(`Curation console config: ${problem}`);
  }

  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // The whole point is that a portal change applies on the next load.
      "Cache-Control": "no-store, max-age=0",
    },
    body: {
      apiBaseUrl,
      environmentLabel: process.env.ENVIRONMENT_LABEL || "",
      problem: problem || null,
      source: "static-web-app-settings",
    },
  };
};

// Exported for the unit test.
module.exports.normalise = normalise;
