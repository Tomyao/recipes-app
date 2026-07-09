import type { Category, FilterResult, MealDbMeal } from "./types";

/**
 * Thin client for our own Express proxy. The client NEVER calls TheMealDB
 * directly — every request goes through our own proxy so the API key stays
 * server-side. In dev, Vite proxies relative /api/* to the local Express
 * server. In production, if the client and server are deployed as separate
 * origins (e.g. two independent Vercel projects), set VITE_API_BASE_URL to
 * the server's URL; leave it unset for same-origin deployments, where
 * relative paths keep working as-is.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // Response wasn't JSON (e.g. offline HTML fallback served by the SW) — keep default message.
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

interface MealsResponse {
  meals: MealDbMeal[] | null;
}

interface CategoriesResponse {
  categories: Category[];
}

interface FilterResponse {
  meals: FilterResult[] | null;
}

export const api = {
  search: (query: string) => request<MealsResponse>(`/api/search?s=${encodeURIComponent(query)}`),
  getMeal: (id: string) => request<MealsResponse>(`/api/meal/${encodeURIComponent(id)}`),
  getCategories: () => request<CategoriesResponse>("/api/categories"),
  filterByCategory: (category: string) =>
    request<FilterResponse>(`/api/filter?c=${encodeURIComponent(category)}`),
  getRandom: () => request<MealsResponse>("/api/random"),
};
