/*
  Where the console finds its API.

  Set at deploy time, not build time. There is no build step, so the same
  artifact can be promoted between environments by overwriting this one file.

  Three ways to fill it in:

  1. Azure Static Web Apps with the container app linked as a backend.
     The SWA proxies /api to the container, so requests are same-origin and
     no CORS configuration is needed on the backend:

         apiBaseUrl: "/api/recommender/admin"

  2. Any static host, talking to the container directly:

         apiBaseUrl: "https://<container-app>.azurecontainerapps.io/recommender/admin"

     Add this site's origin to ADMIN_CORS_ORIGINS on the container app.

  3. The backend serving this page itself at /recommender/curation/.
     Leave apiBaseUrl empty — the console derives the base from its own path
     and this file is ignored.

  In CI, generate this file rather than committing an environment's URL:

      node scripts/write-config.mjs "$API_BASE_URL" "$ENVIRONMENT_LABEL" > config.js

  To point a deployed console at a different backend without redeploying, add
  ?api=https://… to the page's address. It lasts for that browser tab.
*/

window.CLIC_CONSOLE_CONFIG = {
  apiBaseUrl: process.env.BACKEND ?? "",

  // Shown in the top bar so nobody has to guess which backend a tab is pointed
  // at. Worth setting when staging and production consoles look identical.
  environmentLabel: "",
};
