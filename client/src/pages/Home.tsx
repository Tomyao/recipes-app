import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { CategoryChips } from "@/components/CategoryChips";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeCardSkeleton, RecipeGridSkeleton } from "@/components/RecipeCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FilterResult, MealDbMeal } from "@/lib/types";

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("s") ?? "";
  const category = searchParams.get("c");

  const isFiltering = Boolean(category) && !query;
  const isRandom = !query && !category;

  const { data: meals = [], isLoading, isFetching, isError, error, refetch } = useQuery<
    (MealDbMeal | FilterResult)[]
  >({
    queryKey: isRandom ? ["random"] : isFiltering ? ["filter", category] : ["search", query],
    queryFn: async () => {
      if (isRandom) {
        const res = await api.getRandom();
        return res.meals ?? [];
      }
      if (isFiltering) {
        const res = await api.filterByCategory(category as string);
        return res.meals ?? [];
      }
      const res = await api.search(query);
      return res.meals ?? [];
    },
    // Keep the random pick pinned once fetched — only the Shuffle button's
    // explicit refetch() should change it, not remounts or window focus.
    staleTime: isRandom ? Infinity : undefined,
  });

  function handleCategorySelect(next: string | null) {
    const params = new URLSearchParams();
    if (next) params.set("c", next);
    setSearchParams(params);
  }

  const heading = query ? `Results for "${query}"` : category ? category : "Random pick";

  return (
    <div className="container flex flex-col gap-6 py-6">
      <CategoryChips activeCategory={isFiltering ? category : isRandom ? "random" : null} onSelect={handleCategorySelect} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{heading}</h1>
        {isRandom ? (
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
            Shuffle
          </Button>
        ) : (
          meals.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {meals.length} recipe{meals.length === 1 ? "" : "s"}
            </p>
          )
        )}
      </div>

      {isLoading &&
        (isRandom ? (
          <div className="max-w-sm">
            <RecipeCardSkeleton />
          </div>
        ) : (
          <RecipeGridSkeleton />
        ))}

      {isError && (
        <EmptyState
          icon={SearchX}
          title="Couldn't load recipes"
          description={error instanceof Error ? error.message : "Please check your connection and try again."}
        />
      )}

      {!isLoading && !isError && meals.length === 0 && (
        <EmptyState icon={SearchX} title="No recipes found" description="Try a different search term or category." />
      )}

      {!isLoading && !isError && meals.length > 0 && (
        <div className={cn("grid grid-cols-1 gap-4", !isRandom && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", isRandom && "max-w-sm")}>
          {meals.map((meal) => (
            <RecipeCard key={meal.idMeal} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
