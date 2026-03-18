import { AppStateProvider } from "./state/AppState";
import Viewport from "./components/Viewport";
import ControlPanel from "./components/ControlPanel";
import UnfoldView from "./components/UnfoldView";
import TopBar from "./components/TopBar";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

export default function App() {
  return (
    <AppStateProvider>
      <SidebarProvider>
        <div className="h-dvh w-screen flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border px-2 h-12">
              <div className="flex items-center gap-2 align-middle h-full">
                <img
                  src={"/assets/icons/poly-path-logo.svg"}
                  alt="Poly-Path Logo"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold tracking-tight shadow-cyan-500/50 text-shadow-lg">
                  Poly-Path
                </span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <ControlPanel />
            </SidebarContent>
          </Sidebar>

          {/* Main content */}
          <SidebarInset className="flex flex-col min-h-0">
            <TopBar />

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