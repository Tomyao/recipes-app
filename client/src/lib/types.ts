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
  ingredient: string;
  measure: string;
}

/** Trimmed-down shape we persist to IndexedDB for offline favorites. */
export interface FavoriteMeal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strMealThumb?: string;
  savedAt: number;
}

export function toIngredients(meal: MealDbMeal): Ingredient[] {
  const ingredients: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (ingredient) {
      ingredients.push({ ingredient, measure: measure || "" });
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
    savedAt: Date.now(),
  };
}
