import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAllFavorites, isFavorite, removeFavorite, saveFavorite } from "./db";
import { api } from "@/lib/api";
import { toFavorite, type FavoriteMeal } from "@/lib/types";

const FAVORITES_KEY = ["favorites"] as const;
const favoriteKey = (id: string) => ["favorites", id] as const;

/** All saved favorites, sorted most-recent-first. Works fully offline (IndexedDB only). */
export function useFavoritesList() {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getAllFavorites,
    staleTime: 0,
    // React Query's default networkMode ("online") pauses queries while
    // navigator.onLine is false — but this query never touches the network,
    // it only reads IndexedDB, so it must run regardless of connectivity.
    networkMode: "always",
  });
}

/** Whether a single meal is currently favorited. */
export function useIsFavorite(idMeal: string | undefined) {
  return useQuery({
    queryKey: favoriteKey(idMeal ?? ""),
    queryFn: () => isFavorite(idMeal as string),
    enabled: Boolean(idMeal),
    networkMode: "always",
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    mutationFn: async ({ meal, next }: { meal: FavoriteMeal; next: boolean }) => {
      if (next) {
        // Save immediately with whatever data we have (works offline). If this
        // came from a shallow listing card without ingredients, also fetch the
        // full recipe and upgrade the saved copy, so it's ready for offline
        // viewing without ever requiring a Details visit.
        await saveFavorite(meal);
        if (!meal.ingredients) {
          try {
            const res = await api.getMeal(meal.idMeal);
            const full = res.meals?.[0];
            if (full) await saveFavorite(toFavorite(full));
          } catch {
            // Offline or request failed — the shallow save above still stands;
            // Details will backfill full data next time it's opened online.
          }
        }
      } else {
        await removeFavorite(meal.idMeal);
      }
      return next;
    },
    onSuccess: (next, { meal }) => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
      queryClient.invalidateQueries({ queryKey: favoriteKey(meal.idMeal) });
      toast.success(next ? `Saved "${meal.strMeal}" to favorites` : `Removed "${meal.strMeal}" from favorites`);
    },
    onError: () => {
      toast.error("Couldn't update favorites. Please try again.");
    },
  });
}
