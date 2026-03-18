import { AppStateProvider } from "./state/AppState";
import Viewport from "./components/Viewport";
import ControlPanel from "./components/ControlPanel";
import UnfoldView from "./components/UnfoldView";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

export default function App() {
  return (
    <AppStateProvider>
      <SidebarProvider>
        <div className="h-dvh w-screen flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-sm font-semibold tracking-tight">
                  Poly-Path
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Shortest Surface Path Visualizer
              </span>
            </SidebarHeader>
            <SidebarContent>
              <ControlPanel />
            </SidebarContent>
          </Sidebar>

          {/* Main content */}
          <SidebarInset className="flex flex-col min-h-0">
            {/* Top bar with trigger */}
            <header className="shrink-0 h-12 px-4 border-b border-border bg-card flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Click the 3D surface to place points A &amp; B
              </span>
            </header>

            {/* Viewport + Unfold */}
            <div className="flex-1 min-h-0 w-full flex flex-col md:flex-row pl-4 pt-4 pb-4 gap-4">
              <div className="h-[50%] md:h-auto md:flex-[3] min-h-0 min-w-0 flex pr-4 md:pr-0">
                <Viewport />
              </div>
              <div className="h-[50%] md:h-auto md:flex-[2] min-h-0 min-w-0 flex">
                <UnfoldView />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AppStateProvider>
  );
}
