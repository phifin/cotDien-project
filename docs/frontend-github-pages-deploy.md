# Frontend Deployment via GitHub Pages

This monorepo deploys frontend apps as static sites on **GitHub Pages** (no Docker, no image registry).

Apps:

- `apps/form-app` -> `/<repo>/form-app/`
- `apps/dashboard-app` -> `/<repo>/dashboard-app/`

Both are deployed independently by separate workflows and published into separate subfolders of the `gh-pages` branch.

## Workflows

- `.github/workflows/deploy-form-app.yml`
- `.github/workflows/deploy-dashboard-app.yml`

Each workflow:

1. checks out repo
2. sets up Node + pnpm
3. installs dependencies
4. builds one target app
5. publishes `dist` to `gh-pages/<app-subfolder>`

Publishing is done with `peaceiris/actions-gh-pages` using:

- `publish_branch: gh-pages`
- `destination_dir: form-app` or `dashboard-app`
- `keep_files: true` (so both apps coexist on the same branch)

## Vite base path

Both apps read `VITE_APP_BASE_PATH` in `vite.config.ts`.

Workflows set:

- Form app: `/${{ github.event.repository.name }}/form-app/`
- Dashboard app: `/${{ github.event.repository.name }}/dashboard-app/`

This ensures assets and routing work correctly under GitHub Pages subpaths.

## Required GitHub configuration

Configure repository **Secrets**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Configure repository **Pages settings**:

1. Go to **Settings -> Pages**
2. Set **Source** to `Deploy from a branch`
3. Select branch `gh-pages`, folder `/ (root)`
4. Save

After the first successful workflow run, expected URL shape:

- `https://<owner>.github.io/<repo>/form-app/`
- `https://<owner>.github.io/<repo>/dashboard-app/`

## Notes

- No backend/server hosting is introduced for frontend apps.
- No database schema/business logic changes are required.
- Apps remain independently deployable via their own workflows.
