# Recipes PWA

An installable, offline-capable recipe browser built on [TheMealDB](https://www.themealdb.com/api.php). React/Vite client talks only to a small Express proxy, which is the sole holder of the TheMealDB API key.

## Overview & features

- **Search, browse, and filter** recipes by name or category.
- **Recipe details**: ingredients, instructions, tags, YouTube link, original source.
- **Offline favorites**: save/unsave any recipe; full details (ingredients, instructions, tags, YouTube/source links) are fetched and stored in IndexedDB on-device when you favorite it, so the whole recipe — not just a summary — is readable/removable offline.
- **Installable PWA**: manifest + hand-written service worker precache the app shell and provide an offline fallback page.
- **Runtime caching**: stale-while-revalidate for images/categories, network-first with cache fallback for search/meal/filter data.
- **Accessible**: skip link, semantic landmarks, labeled search form, `aria-pressed` favorite buttons, visible focus rings, alt text on every recipe image.
- **Resilient UI**: skeleton loaders, empty states, a top-level error boundary, and toast notifications (including an offline/online status toast).

## Tech stack

- **Client**: React 18, Vite, TypeScript, Tailwind CSS, hand-rolled shadcn/ui-style components (Radix primitives + `class-variance-authority`), TanStack Query, React Router, `idb`, `sonner` (toasts), `lucide-react` (icons), self-hosted Inter variable font (`@fontsource-variable/inter`).
- **Server**: Node.js, Express, TypeScript (run via `tsx`), `helmet`, `cors`, `compression`, `morgan`, in-memory TTL cache.

## Project structure

```
/server
  .env.example
  package.json
  vercel.json              Rewrites all requests to api/index.ts (Vercel deploy)
  api/index.ts             Vercel serverless entry — exports src/app.ts's Express app
  src/app.ts               Express app: security middleware, CORS, routes, error handling
  src/index.ts             Local/traditional-host entry — imports app.ts, calls app.listen()
  src/routes/mealdb.ts     /api/* routes that proxy TheMealDB
  src/cache.ts             Small in-memory TTL cache

/client
  index.html
  vite.config.ts
  tailwind.config.cjs
  postcss.config.cjs
  vercel.json               SPA fallback rewrite (client-side routing)
  src/main.tsx              App entry, providers, SW registration
  src/App.tsx               Routes + layout
  src/registerSW.ts         Registers sw.js, shows update/offline toasts
  src/pages/                Home, Details, Favorites
  src/components/           Header, RecipeCard, CategoryChips, ErrorBoundary, ThemeToggle,
                             EmptyState, SkipLink, ui/*
  src/features/favorites/   IndexedDB helpers (db.ts) + React Query hooks (useFavorites.ts)
  src/hooks/                useOnlineStatus.ts
  src/lib/                  api.ts (proxy client), queryClient.ts, types.ts, utils.ts (cn helper)
  src/styles/globals.css    Tailwind layers + CSS-variable theme
  public/manifest.webmanifest
  public/offline.html
  public/sw.js              Hand-written service worker (see note below)
  public/icons/*            Placeholder SVG icons
```

> **Note on `sw.js` location**: the brief lists it as `src/sw.js`, but it's shipped from `public/sw.js` instead. Files under `src/` are only emitted into the production build if they're imported into the JS module graph — a standalone worker script isn't. `public/` is copied byte-for-byte to the site root in both `vite dev` and the production build, which is required for a same-origin, root-scoped service worker to register reliably in both environments.

## Setup

Requires Node.js 18+ (for global `fetch` on the server).

```bash
cp server/.env.example server/.env
npm run install:all   # installs root, server, and client deps
npm run dev            # starts server (5174) and client (5173) together
```

`npm run dev` at the root uses `concurrently` to run `server`'s and `client`'s own `dev` scripts side by side, prefixing output with `[server]`/`[client]`. To run them separately instead (e.g. in two terminals):

```bash
cd server && npm i && npm run dev   # http://localhost:5174
cd client && npm i && npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5174`, so in dev the client calls same-origin `/api/*` without any extra config. In production this still works as-is for a same-origin deployment; for a cross-origin one (e.g. two separate Vercel projects — see "Deploying both to Vercel" below), set `VITE_API_BASE_URL` on the client and `CLIENT_ORIGIN` on the server.

### Environment variables

**`server/.env`** (copy from `server/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `MEALDB_API_BASE` | `https://www.themealdb.com/api/json/v1` | TheMealDB base URL |
| `MEALDB_API_KEY` | `1` | TheMealDB API key (`1` is the public dev/test key) — **never sent to the client** |
| `PORT` | `5174` | Port the Express server listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed CORS origins |

The client needs no `.env` for local dev or a same-origin deployment — it never talks to TheMealDB or holds any secret, only `/api/*` calls. If the client and server are deployed on different origins (see "Deploying both to Vercel" below), set one optional client env var:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | unset (relative `/api/*`) | Absolute origin of the deployed server, e.g. `https://recipes-app-server.vercel.app` |

## shadcn/ui setup notes

This project hand-writes the shadcn/ui primitives it needs (`Button`, `Card`, `Input`, `Label`, `Badge`, `Skeleton`, `Dialog`) under `client/src/components/ui/`, built the same way the shadcn CLI would generate them (Radix primitives, `class-variance-authority`, the `cn()` merge helper in `src/lib/utils.ts`, and CSS variables in `src/styles/globals.css`). This avoids depending on network access to the shadcn CLI/registry during setup.

If you'd rather use the official CLI going forward (e.g. to pull in more components):

```bash
cd client
npx shadcn@latest init
# When prompted: TypeScript = yes, style = New York or Default, base color = Orange,
# CSS variables = yes, tailwind.config = tailwind.config.cjs, components alias = @/components, utils alias = @/lib/utils
npx shadcn@latest add toast dropdown-menu select   # add more components as needed
```

The existing `tailwind.config.cjs` and `globals.css` already define the CSS-variable-based theme the CLI expects, so newly generated components will match the current look.

## PWA details

- **Manifest**: `client/public/manifest.webmanifest` — name/short_name, standalone display, theme/background color, `any` and `maskable` icons.
- **Icons**: `client/public/icons/*.svg` are placeholders (see checklist below).
- **Service worker** (`client/public/sw.js`, registered from `src/registerSW.ts`):
  - **Install**: precaches the app shell (`/`, `/index.html`, `/offline.html`, `/manifest.webmanifest`, icons).
  - **Activate**: deletes caches from older `CACHE_VERSION`s, claims clients immediately.
  - **Navigations** (`request.mode === "navigate"`): network-first, falling back to a cached copy of the page, then `/offline.html`.
  - **`/api/categories`**: stale-while-revalidate (list rarely changes; serve instantly, refresh in background).
  - **`/api/search`, `/api/meal/:id`, `/api/filter`**: network-first with cache fallback (prefer fresh results; fall back to the last successful response when offline).
  - **Images** (`request.destination === "image"`, including TheMealDB's CDN thumbnails): stale-while-revalidate.
  - **Scripts/styles/fonts**: cache-first (Vite's build output is content-hashed, so it's safe to cache aggressively).
  - **Updates**: a waiting worker triggers a "new version available" toast with a Reload action, which posts `SKIP_WAITING` to activate immediately.

### Changing caching strategies

Each strategy is a small standalone function in `sw.js` (`networkFirst`, `staleWhileRevalidate`, `cacheFirst`, `networkFirstNavigation`) and the routing decisions live in the single `fetch` listener. To change a route's strategy, move its `event.respondWith(...)` line to a different helper. To adjust TTLs on the server-side cache (categories/search/meal), edit the `ttlMs` arguments passed to `TTLCache.wrap()` in `server/src/routes/mealdb.ts`.

### Offline favorites

- Persisted via `idb` in `client/src/features/favorites/db.ts` (`saveFavorite`, `removeFavorite`, `getFavorite`, `getAllFavorites`, `isFavorite`), keyed by `idMeal`. `FavoriteMeal` (`client/src/lib/types.ts`) stores the full recipe — ingredients, instructions, tags, YouTube/source links — not just a summary.
- `client/src/features/favorites/useFavorites.ts` wraps those in TanStack Query hooks (`useFavoritesList`, `useIsFavorite`, `useToggleFavorite`) so the UI reacts to changes without prop drilling. All three use `networkMode: "always"`, since they only touch IndexedDB and must keep working while offline (React Query's default `networkMode` would otherwise pause them when `navigator.onLine` is false).
- Favoriting a recipe fetches and saves its full details immediately (`useToggleFavorite`), even when favorited from a listing card whose API response is shallow (e.g. a category grid, which only has id/name/thumbnail). If that fetch can't complete (offline), the shallow data is saved as a fallback, and `Details.tsx` silently backfills the full details into IndexedDB the next time you view that recipe online.
- The Favorites page and a favorited recipe's Details page both work fully offline (IndexedDB has no network dependency): Details falls back to the saved copy — rendered with the exact same layout as the live view, via the shared `RecipeContent` component — whenever the network request fails, with a small banner noting it's showing your saved copy.

### Testing offline behavior

1. `npm run build && npm run preview` in `client/` (service workers are flaky on `vite dev`'s HMR; test against a production build).
2. Open the app, browse a few recipes and categories, and save 1–2 favorites so the caches populate.
3. DevTools → Application → Service Workers → check "Offline" (or Network tab → "Offline").
4. Reload: previously visited pages and images should still render; favorited recipes' Details pages render in full (with a "showing your saved copy" banner); unvisited, non-favorited recipes show `offline.html`'s friendly fallback; Favorites remain fully editable.
5. Toggle "Offline" off again — the "Back online" toast should appear and fresh data should load on next navigation.

## Development scripts

| Location | Command | Purpose |
|---|---|---|
| root | `npm run install:all` | `npm i` in `server/` and `client/` |
| root | `npm run dev` | Start server + client together via `concurrently` |
| root | `npm run build` | Build server then client |
| `server/` | `npm run dev` | Start Express with `tsx watch` |
| `server/` | `npm run build` / `npm start` | Compile to `dist/` and run it |
| `client/` | `npm run dev` | Start Vite dev server |
| `client/` | `npm run build` | Type-check (`tsc -b`) and build to `client/dist/` |
| `client/` | `npm run preview` | Serve the production build locally (needed for real SW testing) |

## Deploy suggestions

- **Server**: Render (or Railway/Fly.io) — set `MEALDB_API_KEY`, `MEALDB_API_BASE`, `CLIENT_ORIGIN` (your deployed client origin) as environment variables; build command `npm i && npm run build`, start command `npm start`.
- **Client**: Netlify or Vercel — build command `npm run build`, publish directory `client/dist`. If your host reliably supports a same-origin reverse-proxy rewrite to the server's origin (e.g. Netlify `_redirects`), that keeps the client's `/api/*` calls relative with no other changes. Otherwise (see the Vercel-specific notes below for why that isn't reliable there), set `VITE_API_BASE_URL` to the deployed server's absolute URL and make sure the server's `CLIENT_ORIGIN` includes the client's origin for CORS.

### Deploying both to Vercel

`server/` and `client/` are set up as **separate Vercel projects** (one repo, two projects, each with its own "Root Directory" setting) on genuinely different origins, talking to each other via an absolute API URL + CORS — not same-origin rewrites/proxying. (An earlier version of this guide tried routing `/api/*` through a `vercel.json` rewrite to an external URL so the two origins would appear same-origin to the browser; in practice that rewrite doesn't reliably forward to another Vercel project, so the client ended up calling its own origin instead of the server. The setup below avoids that entirely.)

1. **Deploy the server first.**
   - New Vercel project → same repo → **Root Directory: `server`**.
   - Vercel auto-detects `api/index.ts` as a Node.js serverless function (which exports the Express app from `src/app.ts`); `server/vercel.json` rewrites every request on this project to that function, so all of `/api/search`, `/api/meal/:id`, `/api/categories`, `/api/filter`, `/api/random` reach the same Express instance.
   - Set env vars: `MEALDB_API_KEY` (`1` for dev), `MEALDB_API_BASE` (`https://www.themealdb.com/api/json/v1`), and `CLIENT_ORIGIN` — set this to the client's URL from step 2 (comma-separate multiple origins, e.g. a Vercel preview + production URL). This is required now: the browser makes a real cross-origin request to this project, so it needs a matching CORS `Access-Control-Allow-Origin` response, which `cors()` in `src/app.ts` derives from `CLIENT_ORIGIN`.
   - Deploy, then note the resulting URL (e.g. `https://recipes-app-server.vercel.app`).

2. **Point the client at it, then deploy the client.**
   - New Vercel project → same repo → **Root Directory: `client`**. Vercel auto-detects the Vite framework (build command `npm run build`, output `dist`).
   - Set env var `VITE_API_BASE_URL` to the server URL from step 1 (no trailing slash). `src/lib/api.ts` prefixes every request with it; when unset (local dev, or a same-origin deployment) it falls back to relative `/api/*` paths as before.
   - Deploy. `client/vercel.json`'s rewrite (`/(.*) → /index.html`) is the SPA fallback so React Router routes like `/recipe/52772` or `/favorites` work on direct load/refresh, not just client-side navigation.
   - If you later change the server's URL, redeploy the client with the updated `VITE_API_BASE_URL` — Vite inlines env vars at build time, so it won't pick up a changed value without a rebuild.

Since the client and server are now on different origins, `public/sw.js` matches `/api/*` requests by path only (not `url.origin === self.location.origin`) so its network-first/stale-while-revalidate caching still applies to the cross-origin API calls.

## Security

- The client only ever calls its own proxy (`/api/*`, optionally prefixed with `VITE_API_BASE_URL` — see "Environment variables") — never TheMealDB directly. Grep `client/src` for `themealdb.com` and you'll find nothing.
- `MEALDB_API_KEY` is read once in `server/src/routes/mealdb.ts` and used to build the upstream URL server-side; it is never included in any response sent to the client.
- `helmet`, `cors` (restricted to `CLIENT_ORIGIN`), and centralized error handling (no stack traces leaked to clients) are wired up in `server/src/app.ts`.

## Post-generation checklist

- [ ] `npm run install:all` at the repo root (or `npm i` in `server/` and `client/` separately).
- [ ] `cp server/.env.example server/.env` and adjust if you have a paid TheMealDB key.
- [ ] Replace the placeholder SVG icons in `client/public/icons/` with real branded PNG/SVG icons (at minimum 192×192 and 512×512, plus a maskable variant) — required for full cross-browser install prompts (some browsers don't yet support SVG manifest icons).
- [ ] If you want the official shadcn CLI-managed components going forward, run `npx shadcn@latest init` in `client/` (see shadcn setup notes above) instead of hand-editing `src/components/ui/*`.
- [ ] Bump `CACHE_VERSION` in `client/public/sw.js` before shipping any change to precached files or caching logic, so returning users get the update.
- [ ] `npm run build` in both `server/` and `client/` before deploying (or `npm run build` at the repo root for both at once).
- [ ] If deploying client and server to different origins, set `VITE_API_BASE_URL` (client) and `CLIENT_ORIGIN` (server) — see "Environment variables" and "Deploying both to Vercel".
- [ ] Test the offline flow against `npm run preview` (see "Testing offline behavior" above), not `npm run dev`.
