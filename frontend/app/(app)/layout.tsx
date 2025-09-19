import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/query-provider";
import { requireUser } from "@/lib/server-auth";
import Link from "next/link";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return (
    <QueryProvider>
      <SidebarProvider>
        <DashboardSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <div className="flex-1">{children}</div>
          <footer className="border-t px-6 py-4 text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
            <span>© {new Date().getFullYear()} Neuland Ingolstadt e.V.</span>
            <span>•</span>
            <Link href="/imprint" className="hover:underline">Impressum</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:underline">Datenschutz</Link>
            <span>•</span>
            <Link href="https://studver.thi.de" className="hover:underline">StudVer</Link>
          </footer>
        </main>
      </SidebarProvider>
      <Toaster />
    </QueryProvider>
  );
}
