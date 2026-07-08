import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryChipsProps {
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryChips({ activeCategory, onSelect }: CategoryChipsProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
    staleTime: 1000 * 60 * 60,
  });

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Loading categories">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  if (isError || !data?.categories?.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
      <Button
        variant={activeCategory === null ? "default" : "outline"}
        size="sm"
        className="shrink-0 rounded-full"
        aria-pressed={activeCategory === null}
        onClick={() => onSelect(null)}
      >
        Random
      </Button>
      {data.categories.map((category) => (
        <Button
          key={category.idCategory}
          variant={activeCategory === category.strCategory ? "default" : "outline"}
          size="sm"
          className="shrink-0 rounded-full"
          aria-pressed={activeCategory === category.strCategory}
          onClick={() => onSelect(category.strCategory)}
        >
          {category.strCategory}
        </Button>
      ))}
    </div>
  );
}
