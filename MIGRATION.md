# Nuxt 4 migration notes

This project has been migrated from Nuxt 3 to Nuxt 4 while keeping the existing UI and routes intact.

## Main changes

- Upgraded Nuxt to 4.5.x and raised the Node.js requirement to Node 22+.
- Adopted the Nuxt 4 `app/` source layout. `server/` and `public/` remain at the project root.
- Moved types shared by the Vue app and Nitro server to `shared/types/` and use the `#shared` alias.
- Switched the root TypeScript config to Nuxt 4 project references and added a `typecheck` script.
- Updated Nuxt Image to v2 and removed the old hard-coded Netlify image provider configuration. Nuxt Image can now select the deployment provider automatically.
- Updated Nuxt i18n to v10. Locale files now live in `i18n/locales/`; the removed v8 `lazy` option is no longer needed because locale files are lazy-loaded automatically.
- Migrated Maz-UI from the v3 `maz-ui/nuxt` entry to the v4 `@maz-ui/nuxt` module, which auto-imports the used `MazStepper` on demand.
- Removed the unused Vuestic module and its support dependencies.
- Removed Axios and use Nitro/Nuxt `$fetch` for server-side HTTP calls.
- Reworked request logging so Morgan loggers and rotating streams are created once per log directory rather than on every request.
- Enabled Nuxt 4.5's shared builder watcher (`experimental.watcher = "builder"`) to reduce duplicate filesystem watching during development.

## Environment variables

Existing deployment variable names are still supported:

- `BACKEND`
- `TEAMS`
- `LOG_DIR`
- `MAX_TOPIC_NUM`
- `MAX_QUESTION_NUM`

Nuxt-native runtime overrides are also supported:

- `NUXT_BACKEND`
- `NUXT_TEAMS`
- `NUXT_LOG_DIR`
- `NUXT_PUBLIC_MAX_TOPIC_NUM`
- `NUXT_PUBLIC_MAX_QUESTION_NUM`

See `.env.example` for examples.

## Validate locally

Use Node.js 22 or newer, then run:

```bash
npm install
npm run typecheck
npm run build
```

For production Node deployments, run the generated Nitro server with `NODE_ENV=production`.
