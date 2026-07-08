import type { Category, FilterResult, MealDbMeal } from "./types";

/**
 * Thin client for our own Express proxy. The client NEVER calls TheMealDB
 * directly — every request goes through same-origin /api/* so the API key
 * stays server-side. In dev, Vite proxies /api to the Express server.
 */

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path);
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
