# Recipes PWA

A installable, offline-capable recipe browser built on [TheMealDB](https://www.themealdb.com/api.php). React/Vite client talks only to a small Express proxy, which is the sole holder of the TheMealDB API key.

## Overview & features

- **Search, browse, and filter** recipes by name or category.
- **Recipe details**: ingredients, instructions, tags, YouTube link, original source.
- **Offline favorites**: save/unsave any recipe; favorites are stored in IndexedDB on-device and are fully readable/removable offline.
- **Installable PWA**: manifest + hand-written service worker precache the app shell and provide an offline fallback page.
- **Runtime caching**: stale-while-revalidate for images/categories, network-first with cache fallback for search/meal/filter data.
- **Accessible**: skip link, semantic landmarks, labeled search form, `aria-pressed` favorite buttons, visible focus rings, alt text on every recipe image.
- **Resilient UI**: skeleton loaders, empty states, a top-level error boundary, and toast notifications (including an offline/online status toast).

## Tech stack

- **Client**: React 18, Vite, TypeScript, Tailwind CSS, hand-rolled shadcn/ui-style components (Radix primitives + `class-variance-authority`), TanStack Query, React Router, `idb`, `sonner` (toasts), `lucide-react` (icons).
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
  src/main.tsx             App entry, providers, SW registration
  src/App.tsx               Routes + layout
  src/pages/                Home, Details, Favorites
  src/components/           Header, RecipeCard, CategoryChips, ErrorBoundary, ThemeToggle, ui/*
  src/features/favorites/   IndexedDB helpers (db.ts) + React Query hooks (useFavorites.ts)
  src/lib/                  api.ts (proxy client), queryClient.ts, types.ts, utils.ts (cn helper)
  public/manifest.webmanifest
  public/offline.html
  public/sw.js              Hand-written service worker (see "Service worker" note below)
  public/icons/*            Placeholder SVG icons
  vercel.json               SPA fallback + reverse-proxy rewrite to the deployed server
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

The Vite dev server proxies `/api/*` to `http://localhost:5174`, so the client only ever calls same-origin `/api/*` — matching production, where you'd deploy the client behind the same domain/reverse proxy as the server (or set `CLIENT_ORIGIN` for CORS if hosted separately).

### Environment variables

**`server/.env`** (copy from `server/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `MEALDB_API_BASE` | `https://www.themealdb.com/api/json/v1` | TheMealDB base URL |
| `MEALDB_API_KEY` | `1` | TheMealDB API key (`1` is the public dev/test key) — **never sent to the client** |
| `PORT` | `5174` | Port the Express server listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed CORS origins |

The client has no `.env` — it never talks to TheMealDB or holds any secret, only relative `/api/*` calls.

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

- Persisted via `idb` in `client/src/features/favorites/db.ts` (`saveFavorite`, `removeFavorite`, `getFavorite`, `getAllFavorites`, `isFavorite`), keyed by `idMeal`.
- `client/src/features/favorites/useFavorites.ts` wraps those in TanStack Query hooks (`useFavoritesList`, `useIsFavorite`, `useToggleFavorite`) so the UI reacts to changes without prop drilling.
- The Favorites page works with the app fully offline (IndexedDB has no network dependency). Opening a favorited recipe's Details page offline shows the saved summary (image/category/area) with a note that full ingredients/instructions will load next time you're online — unless that detail response was already cached by the service worker's network-first `/api/meal/:id` handler, in which case the full page renders instantly from cache.

### Testing offline behavior

1. `npm run build && npm run preview` in `client/` (service workers are flaky on `vite dev`'s HMR; test against a production build).
2. Open the app, browse a few recipes and categories, and save 1–2 favorites so the caches populate.
3. DevTools → Application → Service Workers → check "Offline" (or Network tab → "Offline").
4. Reload: previously visited pages and images should still render; unvisited recipes show `offline.html`'s friendly fallback (or the Details page's "saved copy" state, if favorited); Favorites remain fully editable.
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
- **Client**: Netlify or Vercel — build command `npm run build`, publish directory `client/dist`. Set a rewrite/proxy so `/api/*` forwards to the deployed server origin (Netlify `_redirects` or `vercel.json` rewrites), keeping the client's calls same-origin in production too.

### Deploying both to Vercel

Both `server/` and `client/` are set up as **separate Vercel projects** (one repo, two projects, each with its own "Root Directory" setting) connected via a rewrite so the browser only ever talks to the client's own origin — same-origin `/api/*` calls, exactly like local dev's Vite proxy. This means `src/lib/api.ts` and `public/sw.js` need zero code changes to work in production.

1. **Deploy the server first.**
   - New Vercel project → same repo → **Root Directory: `server`**.
   - Vercel auto-detects `api/index.ts` as a Node.js serverless function (which exports the Express app from `src/app.ts`); `server/vercel.json` rewrites every request on this project to that function, so all of `/api/search`, `/api/meal/:id`, `/api/categories`, `/api/filter`, `/api/random` reach the same Express instance.
   - Set env vars: `MEALDB_API_KEY` (`1` for dev), `MEALDB_API_BASE` (`https://www.themealdb.com/api/json/v1`). `CLIENT_ORIGIN` is optional here (CORS only matters if something calls this project directly instead of through the client's rewrite below) — set it to the client's URL from step 2 if you want direct access to work too.
   - Deploy, then note the resulting URL (e.g. `https://recipes-app-server.vercel.app`).

2. **Point the client at it, then deploy the client.**
   - Edit `client/vercel.json`, replacing `REPLACE_WITH_YOUR_SERVER_DEPLOYMENT_URL` in the `/api/:path*` rewrite's `destination` with the server URL from step 1, and commit that change.
   - New Vercel project → same repo → **Root Directory: `client`**. Vercel auto-detects the Vite framework (build command `npm run build`, output `dist`).
   - Deploy. `client/vercel.json`'s second rule (`/(.*) → /index.html`) is the SPA fallback so React Router routes like `/recipe/52772` or `/favorites` work on direct load/refresh, not just client-side navigation.
   - Once live, `https://<your-client>.vercel.app/api/*` is transparently proxied to the server project by Vercel itself — the browser never makes a cross-origin request, so no CORS headaching required for the app to work.

If you'd rather avoid the "deploy server, copy its URL, edit a file, redeploy client" two-step, point the server project at a stable custom domain (e.g. `api.yourdomain.com`) first and put that in `client/vercel.json` from the start.

## Security

- The client only ever calls relative `/api/*` paths — grep `client/src` for `themealdb.com` and you'll find nothing outside of comments.
- `MEALDB_API_KEY` is read once in `server/src/routes/mealdb.ts` and used to build the upstream URL server-side; it is never included in any response sent to the client.
- `helmet`, `cors` (restricted to `CLIENT_ORIGIN`), and centralized error handling (no stack traces leaked to clients) are wired up in `server/src/app.ts`.

## Post-generation checklist

- [ ] Run `npm i` in both `server/` and `client/`.
- [ ] `cp server/.env.example server/.env` and adjust if you have a paid TheMealDB key.
- [ ] Replace the placeholder SVG icons in `client/public/icons/` with real branded PNG/SVG icons (at minimum 192×192 and 512×512, plus a maskable variant) — required for full cross-browser install prompts (some browsers don't yet support SVG manifest icons).
- [ ] If you want the official shadcn CLI-managed components going forward, run `npx shadcn@latest init` in `client/` (see shadcn setup notes above) instead of hand-editing `src/components/ui/*`.
- [ ] Bump `CACHE_VERSION` in `client/public/sw.js` before shipping any change to precached files or caching logic, so returning users get the update.
- [ ] `npm run build` in both `server/` and `client/` before deploying.
- [ ] Test the offline flow against `npm run preview` (see "Testing offline behavior" above), not `npm run dev`.
