import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { FavoriteMeal } from "@/lib/types";

const DB_NAME = "recipes-app";
const DB_VERSION = 1;
const STORE_NAME = "favorites";

interface RecipesDbSchema extends DBSchema {
  favorites: {
    key: string; // idMeal
    value: FavoriteMeal;
    indexes: { "by-savedAt": number };
  };
}

let dbPromise: Promise<IDBPDatabase<RecipesDbSchema>> | null = null;

/** Lazily opens (and upgrades) the shared IndexedDB connection. */
function getDb(): Promise<IDBPDatabase<RecipesDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<RecipesDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "idMeal" });
        store.createIndex("by-savedAt", "savedAt");
      },
    });
  }
  return dbPromise;
}

export async function saveFavorite(meal: FavoriteMeal): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, meal);
}

export async function removeFavorite(idMeal: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, idMeal);
}

export async function getFavorite(idMeal: string): Promise<FavoriteMeal | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, idMeal);
}

export async function getAllFavorites(): Promise<FavoriteMeal[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE_NAME, "by-savedAt");
  return all.reverse(); // most recently saved first
}

export async function isFavorite(idMeal: string): Promise<boolean> {
  return (await getFavorite(idMeal)) !== undefined;
}
