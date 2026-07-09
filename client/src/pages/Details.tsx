import { useEffect, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Heart, WifiOff, Youtube } from "lucide-react";
import { api } from "@/lib/api";
import { getFavorite, saveFavorite } from "@/features/favorites/db";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/useFavorites";
import { toIngredients, toFavorite, type Ingredient } from "@/lib/types";
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
    // Default networkMode ("online") would just pause this query while offline
    // instead of erroring, so it'd never reach isError and never fall back to
    // the cached copy below. "always" lets the service worker's own
    // network-first/cache-fallback handling decide the outcome instead.
    networkMode: "always",
  });

  // If the network/proxy request failed (e.g. offline) but this recipe was
  // previously saved, fall back to the offline copy in IndexedDB.
  const favoriteFallback = useQuery({
    queryKey: ["favorite-fallback", id],
    queryFn: () => getFavorite(id),
    enabled: Boolean(id) && mealQuery.isError,
    // Pure IndexedDB read — must run regardless of connectivity.
    networkMode: "always",
  });

  const { data: favorited } = useIsFavorite(id);
  const toggleFavorite = useToggleFavorite();

  const meal = mealQuery.data?.meals?.[0];

  // If this recipe was favorited from a shallow listing card (which lacks
  // ingredients/instructions), backfill the full details into IndexedDB now
  // that we have them, so the offline copy is complete next time. Preserves
  // the original savedAt (see saveFavorite), so this doesn't reorder favorites.
  useEffect(() => {
    if (favorited && meal) {
      saveFavorite(toFavorite(meal)).catch(() => {});
    }
  }, [favorited, meal]);

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
        <RecipeContent
          banner={
            <div
              role="status"
              className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
            >
              <WifiOff className="size-4" aria-hidden="true" />
              You're offline — showing your saved copy of this recipe.
            </div>
          }
          title={cached.strMeal}
          thumb={cached.strMealThumb}
          category={cached.strCategory}
          area={cached.strArea}
          tags={cached.strTags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []}
          instructions={
            cached.strInstructions ||
            "Full instructions aren't available for this saved copy yet — reopen this recipe once you're back online to refresh it."
          }
          youtube={cached.strYoutube}
          source={cached.strSource}
          ingredients={cached.ingredients ?? []}
          favorited={Boolean(favorited)}
          onToggleFavorite={() => toggleFavorite.mutate({ meal: cached, next: !favorited })}
          togglingFavorite={toggleFavorite.isPending}
        />
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

  return (
    <RecipeContent
      title={meal.strMeal}
      thumb={meal.strMealThumb}
      category={meal.strCategory}
      area={meal.strArea}
      tags={meal.strTags?.split(",").map((t) => t.trim()).filter(Boolean) ?? []}
      instructions={meal.strInstructions}
      youtube={meal.strYoutube}
      source={meal.strSource}
      ingredients={toIngredients(meal)}
      favorited={Boolean(favorited)}
      onToggleFavorite={() => toggleFavorite.mutate({ meal: toFavorite(meal), next: !favorited })}
      togglingFavorite={toggleFavorite.isPending}
    />
  );
}

interface RecipeContentProps {
  banner?: ReactNode;
  title: string;
  thumb?: string;
  category?: string;
  area?: string;
  tags: string[];
  instructions?: string;
  youtube?: string | null;
  source?: string | null;
  ingredients: Ingredient[];
  favorited: boolean;
  onToggleFavorite: () => void;
  togglingFavorite: boolean;
}

/** Shared recipe layout, used by both the live (network) view and the offline cached-favorite fallback. */
function RecipeContent({
  banner,
  title,
  thumb,
  category,
  area,
  tags,
  instructions,
  youtube,
  source,
  ingredients,
  favorited,
  onToggleFavorite,
  togglingFavorite,
}: RecipeContentProps) {
  return (
    <article className="container flex flex-col gap-6 py-6">
      {banner}

      {/*
        Named grid areas so, on desktop, the ingredients column sits on the
        right and spans the full height, while the title, favorite button,
        now-smaller photo, and instructions stack together in the left/main
        column (button directly above the photo). On mobile it's a plain
        single-column stack.
      */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 md:[grid-template-areas:'title_title_ingredients'_'favorite_favorite_ingredients'_'image_image_ingredients'_'instructions_instructions_ingredients']">
        <div className="order-first flex flex-col gap-3 md:order-none md:[grid-area:title]">
          <h1 className="text-2xl font-bold">{title}</h1>

          <div className="flex flex-wrap gap-1.5">
            {category && <Badge variant="secondary">{category}</Badge>}
            {area && <Badge variant="outline">{area}</Badge>}
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          variant={favorited ? "default" : "outline"}
          aria-pressed={favorited}
          aria-label={favorited ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
          onClick={onToggleFavorite}
          disabled={togglingFavorite}
          className="order-1 w-fit md:order-none md:[grid-area:favorite]"
        >
          <Heart className={favorited ? "fill-current" : ""} />
          {favorited ? "Saved to favorites" : "Save to favorites"}
        </Button>

        <img
          src={thumb}
          alt={`Photo of ${title}`}
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
            {instructions}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {youtube && (
              <Button variant="outline" asChild>
                <a href={youtube} target="_blank" rel="noreferrer">
                  <Youtube />
                  Watch on YouTube
                </a>
              </Button>
            )}
            {source && (
              <Button variant="outline" asChild>
                <a href={source} target="_blank" rel="noreferrer">
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
