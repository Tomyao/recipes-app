/** Raw meal shape as returned by TheMealDB (loosely typed — the API has ~20 optional ingredient/measure pairs). */
export interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strTags?: string | null;
  strYoutube?: string | null;
  strSource?: string | null;
  [key: `strIngredient${number}`]: string | undefined;
  [key: `strMeasure${number}`]: string | undefined;
}

export interface Category {
  idCategory: string;
  strCategory: string;
  strCategoryThumb: string;
  strCategoryDescription: string;
}

export interface FilterResult {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

/** Flattened ingredient/measure pair, derived from a MealDbMeal's numbered fields. */
export interface Ingredient {
  /** Position in TheMealDB's strIngredient1..20 list — stable and unique even when two slots share the same ingredient name. */
  id: number;
  ingredient: string;
  measure: string;
}

/** Shape we persist to IndexedDB for offline favorites — full recipe content, so Details still renders completely offline. */
export interface FavoriteMeal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strMealThumb?: string;
  strInstructions?: string;
  strTags?: string | null;
  strYoutube?: string | null;
  strSource?: string | null;
  /** Omitted when favorited from a listing view (e.g. a category grid) whose API response doesn't include ingredients. */
  ingredients?: Ingredient[];
  savedAt: number;
}

export function toIngredients(meal: MealDbMeal): Ingredient[] {
  const ingredients: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (ingredient) {
      ingredients.push({ id: i, ingredient, measure: measure || "" });
    }
  }
  return ingredients;
}

export function toFavorite(meal: MealDbMeal): FavoriteMeal {
  return {
    idMeal: meal.idMeal,
    strMeal: meal.strMeal,
    strCategory: meal.strCategory,
    strArea: meal.strArea,
    strMealThumb: meal.strMealThumb,
    strInstructions: meal.strInstructions,
    strTags: meal.strTags,
    strYoutube: meal.strYoutube,
    strSource: meal.strSource,
    ingredients: toIngredients(meal),
    savedAt: Date.now(),
  };
}
