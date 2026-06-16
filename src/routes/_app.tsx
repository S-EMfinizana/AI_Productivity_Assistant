import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { ResponsibleAIBanner } from "@/components/responsible-ai-banner";
import { TopBar } from "@/components/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <TopBar />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
              <Outlet />
            </div>
          </main>
          <ResponsibleAIBanner />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
