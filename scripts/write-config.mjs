#!/usr/bin/env node
/*
  Generate config.js from arguments, for CI.

  Committing an environment's URL to the repository makes promoting the same
  artifact between environments impossible, so the deploy step writes this file
  instead:

      node scripts/write-config.mjs "$API_BASE_URL" "$ENVIRONMENT_LABEL" > config.js
*/

const [apiBaseUrl = "", environmentLabel = ""] = process.argv.slice(2);

if (apiBaseUrl && !/^(https?:\/\/|\/)/.test(apiBaseUrl)) {
  console.error(`Refusing to write an API base that is neither absolute nor root-relative: ${apiBaseUrl}`);
  process.exit(1);
}

const json = JSON.stringify({ apiBaseUrl, environmentLabel }, null, 2);
process.stdout.write(`// Generated at deploy time. Do not edit by hand.\nwindow.CLIC_CONSOLE_CONFIG = ${json};\n`);
