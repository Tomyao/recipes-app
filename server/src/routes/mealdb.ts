import { Router, type Request, type Response, type NextFunction } from "express";
import { TTLCache } from "../cache.js";

const API_BASE = process.env.MEALDB_API_BASE ?? "https://www.themealdb.com/api/json/v1";
const API_KEY = process.env.MEALDB_API_KEY ?? "1";

// Categories change almost never; searches/lookups change rarely but we keep
// their TTL short so users still see fresh results within a session.
const categoriesCache = new TTLCache<unknown>(1000 * 60 * 60); // 1 hour
const shortCache = new TTLCache<unknown>(1000 * 60 * 5); // 5 minutes

const router = Router();

/** Builds an upstream TheMealDB URL, injecting the API key server-side only. */
function upstreamUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${API_BASE}/${API_KEY}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchUpstream(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error(`TheMealDB responded with ${res.status}`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/** Wraps a route handler so thrown/rejected errors reach the error middleware. */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.s ?? req.query.q ?? "");
    const cacheKey = `search:${q.toLowerCase()}`;
    const data = await shortCache.wrap(cacheKey, 1000 * 60 * 5, () =>
      fetchUpstream(upstreamUrl("search.php", { s: q })),
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json(data);
  }),
);

router.get(
  "/meal/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const cacheKey = `meal:${id}`;
    const data = await shortCache.wrap(cacheKey, 1000 * 60 * 30, () =>
      fetchUpstream(upstreamUrl("lookup.php", { i: id })),
    );
    res.set("Cache-Control", "public, max-age=300");
    res.json(data);
  }),
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const data = await categoriesCache.wrap("categories", 1000 * 60 * 60, () =>
      fetchUpstream(upstreamUrl("categories.php", {})),
    );
    res.set("Cache-Control", "public, max-age=3600");
    res.json(data);
  }),
);

router.get(
  "/filter",
  asyncHandler(async (req, res) => {
    const c = String(req.query.c ?? "");
    if (!c) {
      res.status(400).json({ error: "Missing required query param: c" });
      return;
    }
    const cacheKey = `filter:${c.toLowerCase()}`;
    const data = await shortCache.wrap(cacheKey, 1000 * 60 * 15, () =>
      fetchUpstream(upstreamUrl("filter.php", { c })),
    );
    res.set("Cache-Control", "public, max-age=300");
    res.json(data);
  }),
);

router.get(
  "/random",
  asyncHandler(async (_req, res) => {
    // Never cached — a random meal should differ on every request.
    const data = await fetchUpstream(upstreamUrl("random.php", {}));
    res.set("Cache-Control", "no-store");
    res.json(data);
  }),
);

export default router;
