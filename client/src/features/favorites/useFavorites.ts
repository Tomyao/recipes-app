import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAllFavorites, isFavorite, removeFavorite, saveFavorite } from "./db";
import type { FavoriteMeal } from "@/lib/types";

const FAVORITES_KEY = ["favorites"] as const;
const favoriteKey = (id: string) => ["favorites", id] as const;

/** All saved favorites, sorted most-recent-first. Works fully offline (IndexedDB only). */
export function useFavoritesList() {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getAllFavorites,
    staleTime: 0,
  });
}

/** Whether a single meal is currently favorited. */
export function useIsFavorite(idMeal: string | undefined) {
  return useQuery({
    queryKey: favoriteKey(idMeal ?? ""),
    queryFn: () => isFavorite(idMeal as string),
    enabled: Boolean(idMeal),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meal, next }: { meal: FavoriteMeal; next: boolean }) => {
      if (next) {
        await saveFavorite(meal);
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
