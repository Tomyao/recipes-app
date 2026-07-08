import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RecipeCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <CardContent className="flex gap-1.5 p-0">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </CardContent>
      </CardHeader>
      <CardFooter className="justify-end pt-0">
        <Skeleton className="h-9 w-20 rounded-md" />
      </CardFooter>
    </Card>
  );
}

export function RecipeGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}
