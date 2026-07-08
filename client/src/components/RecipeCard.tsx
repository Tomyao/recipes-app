import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsFavorite, useToggleFavorite } from "@/features/favorites/useFavorites";
import type { FavoriteMeal } from "@/lib/types";

interface RecipeCardMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string;
  strCategory?: string;
  strArea?: string;
}

export function RecipeCard({ meal }: { meal: RecipeCardMeal }) {
  const { data: favorited } = useIsFavorite(meal.idMeal);
  const toggleFavorite = useToggleFavorite();

  function handleToggle() {
    const favoriteMeal: FavoriteMeal = {
      idMeal: meal.idMeal,
      strMeal: meal.strMeal,
      strCategory: meal.strCategory,
      strArea: meal.strArea,
      strMealThumb: meal.strMealThumb,
      savedAt: Date.now(),
    };
    toggleFavorite.mutate({ meal: favoriteMeal, next: !favorited });
  }

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/recipe/${meal.idMeal}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <img
          src={meal.strMealThumb}
          alt={`Photo of ${meal.strMeal}`}
          loading="lazy"
          width={320}
          height={180}
          className="aspect-video w-full object-cover"
        />
      </Link>
      <CardHeader className="flex-1">
        <CardTitle className="line-clamp-2 text-base">
          <Link to={`/recipe/${meal.idMeal}`} className="hover:underline focus-visible:outline-none">
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
          variant={favorited ? "default" : "outline"}
          size="sm"
          aria-pressed={Boolean(favorited)}
          aria-label={favorited ? `Remove ${meal.strMeal} from favorites` : `Add ${meal.strMeal} to favorites`}
          onClick={handleToggle}
          disabled={toggleFavorite.isPending}
        >
          <Heart className={favorited ? "fill-current" : ""} />
          {favorited ? "Saved" : "Save"}
        </Button>
      </CardFooter>
    </Card>
  );
}
