import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChefHat, Search, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function Header() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("s") ?? "");
  const isOnline = useOnlineStatus();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/?s=${encodeURIComponent(trimmed)}` : "/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold text-lg" aria-label="Recipes home">
          <ChefHat className="size-6 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Recipes</span>
        </Link>

        <form onSubmit={handleSubmit} role="search" className="flex flex-1 items-center gap-2">
          <Label htmlFor="recipe-search" className="sr-only">
            Search recipes by name
          </Label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="recipe-search"
              type="search"
              placeholder="Search recipes..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {!isOnline && (
            <span
              className="mr-1 flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
              role="status"
            >
              <WifiOff className="size-3.5" aria-hidden="true" />
              Offline
            </span>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/favorites">Favorites</Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
