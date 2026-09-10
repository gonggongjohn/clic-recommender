/*
  Fallback API base.

  On Azure Static Web Apps you do not need this file. Set the backend address in
  the portal instead:

      Static Web App -> Settings -> Environment variables
      BACKEND = https://<your-container-app>.azurecontainerapps.io

  The managed function in api/config reads that setting and the console picks it
  up at startup, so it can be changed without a redeploy.

  This file is only used when:

    - the host cannot run the api/config function, in which case set
      apiBaseUrl to the container's admin endpoint, for example
      "https://<container-app>.azurecontainerapps.io/recommender/admin"; or

    - the backend is serving this page itself at /recommender/curation/, in
      which case leave it empty — the console derives the base from its path.

  To point a deployed console at a different backend without changing anything,
  add ?api=https://.../recommender/admin to the page's address. It lasts for
  that browser tab.
*/

window.CLIC_CONSOLE_CONFIG = {
  apiBaseUrl: "",
  environmentLabel: "",
};
