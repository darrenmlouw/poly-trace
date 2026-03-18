import { useTheme } from "../components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label="Toggle theme"
      title={`Switch to ${nextTheme} mode`}
    >
      {theme === "light" ? <Moon /> : <Sun className="text-yellow-400" />}
    </Button>
  );
}