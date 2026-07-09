import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Heart, WifiOff, Youtube } from "lucide-react";
import { api } from "@/lib/api";
import { getFavorite } from "@/features/favorites/db";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/useFavorites";
import { toIngredients, toFavorite } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

export function Details() {
  const { id = "" } = useParams<{ id: string }>();

  const mealQuery = useQuery({
    queryKey: ["meal", id],
    queryFn: () => api.getMeal(id),
    enabled: Boolean(id),
  });

  // If the network/proxy request failed (e.g. offline) but this recipe was
  // previously saved, fall back to the offline copy in IndexedDB.
  const favoriteFallback = useQuery({
    queryKey: ["favorite-fallback", id],
    queryFn: () => getFavorite(id),
    enabled: Boolean(id) && mealQuery.isError,
  });

  const { data: favorited } = useIsFavorite(id);
  const toggleFavorite = useToggleFavorite();

  const meal = mealQuery.data?.meals?.[0];

  if (mealQuery.isLoading) {
    return (
      <div className="container flex flex-col gap-4 py-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mx-auto aspect-video w-full max-w-2xl rounded-lg" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (mealQuery.isError) {
    const cached = favoriteFallback.data;
    if (cached) {
      return (
        <div className="container flex flex-col gap-6 py-6">
          <div role="status" className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            <WifiOff className="size-4" aria-hidden="true" />
            You're offline — showing your saved copy of this recipe.
          </div>
          <img
            src={cached.strMealThumb}
            alt={`Photo of ${cached.strMeal}`}
            className="mx-auto aspect-video w-full max-w-2xl rounded-lg object-cover"
          />
          <h1 className="text-2xl font-bold">{cached.strMeal}</h1>
          <div className="flex gap-2">
            {cached.strCategory && <Badge variant="secondary">{cached.strCategory}</Badge>}
            {cached.strArea && <Badge variant="outline">{cached.strArea}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Full ingredients and instructions aren't available offline for this recipe yet — they'll load next time you're online.
          </p>
        </div>
      );
    }

    return (
      <div className="container py-6">
        <EmptyState
          icon={WifiOff}
          title="Couldn't load this recipe"
          description="You're offline and this recipe hasn't been saved to favorites yet. Reconnect and try again."
        />
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="container py-6">
        <EmptyState icon={WifiOff} title="Recipe not found" />
      </div>
    );
  }

  const ingredients = toIngredients(meal);
  const tags = meal.strTags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <article className="container flex flex-col gap-6 py-6">
      {/*
        Named grid areas so, on desktop, the ingredients column sits on the
        right and spans the full height, while the title, favorite button,
        now-smaller photo, and instructions stack together in the left/main
        column (button directly above the photo). On mobile it's a plain
        single-column stack.
      */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 md:[grid-template-areas:'title_title_ingredients'_'favorite_favorite_ingredients'_'image_image_ingredients'_'instructions_instructions_ingredients']">
        <div className="order-first flex flex-col gap-3 md:order-none md:[grid-area:title]">
          <h1 className="text-2xl font-bold">{meal.strMeal}</h1>

          <div className="flex flex-wrap gap-1.5">
            {meal.strCategory && <Badge variant="secondary">{meal.strCategory}</Badge>}
            {meal.strArea && <Badge variant="outline">{meal.strArea}</Badge>}
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          variant={favorited ? "default" : "outline"}
          aria-pressed={Boolean(favorited)}
          aria-label={favorited ? `Remove ${meal.strMeal} from favorites` : `Add ${meal.strMeal} to favorites`}
          onClick={() => toggleFavorite.mutate({ meal: toFavorite(meal), next: !favorited })}
          disabled={toggleFavorite.isPending}
          className="order-1 w-fit md:order-none md:[grid-area:favorite]"
        >
          <Heart className={favorited ? "fill-current" : ""} />
          {favorited ? "Saved to favorites" : "Save to favorites"}
        </Button>

        <img
          src={meal.strMealThumb}
          alt={`Photo of ${meal.strMeal}`}
          className="order-2 mx-auto aspect-video w-full max-w-2xl rounded-lg object-cover md:order-none md:mx-0 md:max-w-sm md:[grid-area:image]"
        />

        <section
          aria-labelledby="ingredients-heading"
          className="order-3 md:order-none md:[grid-area:ingredients]"
        >
          <h2 id="ingredients-heading" className="mb-3 text-lg font-semibold">
            Ingredients
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {ingredients.map(({ id, ingredient, measure }) => (
              <li key={id} className="flex justify-between gap-4 border-b border-border py-1.5">
                <span>{ingredient}</span>
                <span className="text-muted-foreground">{measure}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="instructions-heading"
          className="order-4 md:order-none md:[grid-area:instructions]"
        >
          <h2 id="instructions-heading" className="mb-3 text-lg font-semibold">
            Instructions
          </h2>
          <div className="flex flex-col gap-3 whitespace-pre-line text-sm leading-relaxed">
            {meal.strInstructions}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {meal.strYoutube && (
              <Button variant="outline" asChild>
                <a href={meal.strYoutube} target="_blank" rel="noreferrer">
                  <Youtube />
                  Watch on YouTube
                </a>
              </Button>
            )}
            {meal.strSource && (
              <Button variant="outline" asChild>
                <a href={meal.strSource} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Original source
                </a>
              </Button>
            )}
          </div>
        </section>
      </div>
    </article>
  );
}
