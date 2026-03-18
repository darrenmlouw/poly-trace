import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggleButton } from "./ThemeToggleButton";

export default function TopBar() {
  return (
    <header className="shrink-0 h-12 px-4 border-b border-border bg-card flex items-center gap-3">
      <SidebarTrigger />

      <div className="flex-1 text-center md:hidden">
        <img
          src={"/assets/icons/poly-path-logo.svg"}
          alt="Poly-Path Logo"
          className="w-6 h-6 inline-block mr-2"
        />
        <span className="text-md font-medium tracking-tight shadow-cyan-500/50 text-shadow-lg">
          Poly-Path
        </span>
      </div>

      <span className="text-xs text-muted-foreground hidden sm:inline">
        Click the 3D surface to place points A &amp; B
      </span>

      <div className="ml-auto">
        <ThemeToggleButton />
      </div>
    </header>
  );
}