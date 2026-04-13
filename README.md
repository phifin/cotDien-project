# Monorepo

Frontend-heavy, data-driven system built with React + TypeScript + Vite + Tailwind CSS v4, managed as a pnpm workspace monorepo.

---

## Structure

```
.
├── apps/
│   ├── form-app/          # Data-entry application  (port 5173)
│   └── dashboard-app/     # Analytics / read application (port 5174)
│
├── packages/
│   ├── shared/            # Domain-agnostic types, schemas, transformers, utils
│   └── supabase/          # Supabase client singleton + generated DB types
│
├── tsconfig.base.json     # Shared TypeScript compiler options
├── eslint.config.js       # ESLint v9 flat config (TS + React)
├── .prettierrc            # Prettier config
└── pnpm-workspace.yaml    # Workspace package globs
```

### `apps/form-app`

Independent Vite app for form-based data entry. Imports domain schemas and transformers from `@repo/shared` and writes data via `@repo/supabase`. Deployed separately.

### `apps/dashboard-app`

Independent Vite app for displaying and analysing data. Same shared dependencies, no code duplication. Deployed separately.

### `packages/shared`

Zero-runtime-dependency package. Contains:

| Module | Purpose |
|---|---|
| `types/` | Branded primitives (`ID`, `ISODateString`), `Result<T>`, `BaseRecord` |
| `schemas/` | `Schema<T>` interface — wire in Zod / Valibot per feature |
| `transformers/` | Pure functions: `transformList`, `indexBy`, `groupBy` |
| `utils/` | `parallel`, `tryCatch`, `pick`, type guards |

**Import pattern** — prefer subpath imports to keep tree-shaking effective:

```ts
// ✅ Direct subpath — only pays for what is used
import { transformList } from '@repo/shared/transformers'
import type { BaseRecord } from '@repo/shared/types'

// ✅ Top-level barrel — fine for prototyping
import { ok, err } from '@repo/shared'
```

### `packages/supabase`

Wraps `@supabase/supabase-js` with a typed singleton pattern.

```ts
// App root (main.tsx):
import { createSupabaseClient } from '@repo/supabase/client'
createSupabaseClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

// Anywhere else in the app:
import { getSupabaseClient } from '@repo/supabase/client'
const db = getSupabaseClient()
```

After setting up a Supabase project, regenerate `packages/supabase/src/types.ts`:

```bash
pnpm supabase gen types typescript --project-id <your-project-id> \
  > packages/supabase/src/types.ts
```

---

## Getting Started

### Prerequisites

- Node ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)

### Install

```bash
pnpm install
```

### Develop

```bash
# All apps in parallel
pnpm dev

# Individual app
pnpm --filter @repo/form-app dev
pnpm --filter @repo/dashboard-app dev
```

### Build

```bash
# All apps
pnpm build

# Individual app
pnpm --filter @repo/form-app build
```

### Lint & Format

```bash
pnpm lint          # ESLint across all packages
pnpm format        # Prettier write
pnpm format:check  # Prettier check (CI)
pnpm type-check    # tsc --noEmit across all packages
```

---

## Environment Variables

Each app reads its own `.env.local` file. Copy the template and fill in values:

```bash
# apps/form-app/.env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# apps/dashboard-app/.env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> `.env.local` is gitignored. Never commit secrets.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| **Tailwind v4 + `@tailwindcss/vite`** | No PostCSS config needed; Vite plugin handles HMR natively |
| **Subpath exports in packages** | Enables per-symbol tree-shaking; avoids barrel-file bundle bloat |
| **Supabase singleton** | Initialised once at app root, imported anywhere without prop-drilling |
| **`noUncheckedIndexedAccess`** | Forces safe array/object access patterns throughout |
| **ESLint v9 flat config** | Single config file, no `.eslintignore` needed |
| **No Turborepo** | Kept minimal; add when build caching becomes a bottleneck |

---

## Frontend Deployment

Frontend apps deploy as static sites on GitHub Pages (no Docker/image registry):

- `form-app` -> `/form-app/`
- `dashboard-app` -> `/dashboard-app/`

Deployment guide:

- `docs/frontend-github-pages-deploy.md`
