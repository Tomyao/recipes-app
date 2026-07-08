import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { CategoryChips } from "@/components/CategoryChips";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeGridSkeleton } from "@/components/RecipeCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import type { FilterResult, MealDbMeal } from "@/lib/types";

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("s") ?? "";
  const category = searchParams.get("c");

  const isFiltering = Boolean(category) && !query;

  const { data: meals = [], isLoading, isError, error } = useQuery<(MealDbMeal | FilterResult)[]>({
    queryKey: isFiltering ? ["filter", category] : ["search", query],
    queryFn: async () => {
      if (isFiltering) {
        const res = await api.filterByCategory(category as string);
        return res.meals ?? [];
      }
      const res = await api.search(query);
      return res.meals ?? [];
    },
  });

  function handleCategorySelect(next: string | null) {
    const params = new URLSearchParams();
    if (next) params.set("c", next);
    setSearchParams(params);
  }

  const heading = query ? `Results for "${query}"` : category ? category : "Browse recipes";

  return (
    <div className="container flex flex-col gap-6 py-6">
      <CategoryChips activeCategory={isFiltering ? category : null} onSelect={handleCategorySelect} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{heading}</h1>
        {meals.length > 0 && (
          <p className="text-sm text-muted-foreground">{meals.length} recipe{meals.length === 1 ? "" : "s"}</p>
        )}
      </div>

      {isLoading && <RecipeGridSkeleton />}

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {meals.map((meal) => (
            <RecipeCard key={meal.idMeal} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
