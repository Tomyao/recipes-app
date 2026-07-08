import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { useFavoritesList, useToggleFavorite } from "@/features/favorites/useFavorites";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { removeFavorite } from "@/features/favorites/db";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SortKey = "recent" | "name";

export function Favorites() {
  const { data: favorites, isLoading } = useFavoritesList();
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const toggleFavorite = useToggleFavorite();
  const queryClient = useQueryClient();

  const categories = useMemo(() => {
    const set = new Set<string>();
    favorites?.forEach((f) => f.strCategory && set.add(f.strCategory));
    return Array.from(set).sort();
  }, [favorites]);

  const visible = useMemo(() => {
    let list = favorites ?? [];
    if (categoryFilter) list = list.filter((f) => f.strCategory === categoryFilter);
    list = [...list].sort((a, b) =>
      sortKey === "name" ? a.strMeal.localeCompare(b.strMeal) : b.savedAt - a.savedAt,
    );
    return list;
  }, [favorites, categoryFilter, sortKey]);

  async function handleClearAll() {
    if (!favorites) return;
    await Promise.all(favorites.map((f) => removeFavorite(f.idMeal)));
    queryClient.invalidateQueries({ queryKey: ["favorites"] });
    toast.success("Cleared all favorites");
  }

  if (isLoading) {
    return (
      <div className="container flex flex-col gap-6 py-6">
        <h1 className="text-xl font-semibold">Your favorites</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="container py-6">
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Recipes you save are stored on this device and available offline."
          action={
            <Button asChild>
              <Link to="/">Browse recipes</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Your favorites ({favorites.length})</h1>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sort-favorites" className="text-sm text-muted-foreground">
            Sort by
          </label>
          <select
            id="sort-favorites"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="recent">Recently saved</option>
            <option value="name">Name (A–Z)</option>
          </select>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 />
                Clear all
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear all favorites?</DialogTitle>
                <DialogDescription>
                  This removes all {favorites.length} saved recipes from this device. This can't be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={handleClearAll}>
                    Clear all
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter favorites by category">
          <Button variant={categoryFilter === null ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setCategoryFilter(null)}>
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c}
              variant={categoryFilter === c ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setCategoryFilter(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((meal) => (
          <Card key={meal.idMeal} className="flex flex-col overflow-hidden">
            <Link to={`/recipe/${meal.idMeal}`}>
              <img
                src={meal.strMealThumb}
                alt={`Photo of ${meal.strMeal}`}
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
            </Link>
            <CardHeader className="flex-1">
              <CardTitle className="line-clamp-2 text-base">
                <Link to={`/recipe/${meal.idMeal}`} className="hover:underline">
                  {meal.strMeal}
                </Link>
              </CardTitle>
              <CardContent className="flex flex-wrap gap-1.5 p-0">
                {meal.strCategory && <Badge variant="secondary">{meal.strCategory}</Badge>}
                {meal.strArea && <Badge variant="outline">{meal.strArea}</Badge>}
              </CardContent>
            </CardHeader>
            <CardFooter className="justify-end pt-0">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Remove ${meal.strMeal} from favorites`}
                onClick={() => toggleFavorite.mutate({ meal, next: false })}
              >
                <Trash2 />
                Remove
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
