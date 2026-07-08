import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Toggles the `dark` class on <html> and persists the choice for next visit. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={theme === "dark"}
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
