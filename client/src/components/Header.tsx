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
      <div className="container flex flex-wrap items-center gap-3 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
        <Link
          to="/"
          className="order-1 flex shrink-0 items-center gap-2 font-bold text-lg"
          aria-label="Recipes home"
        >
          <ChefHat className="size-6 text-primary" aria-hidden="true" />
          <span>Recipes</span>
        </Link>

        <nav aria-label="Primary" className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-0">
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

        <form
          onSubmit={handleSubmit}
          role="search"
          className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto sm:flex-1"
        >
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
      </div>
    </header>
  );
}
