import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { UnifiedFooter } from '@/components/unified-footer'

export default function AppLayout({
	children
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<SidebarProvider>
			<DashboardSidebar />
			<main className="flex-1 flex flex-col min-h-screen">
				<div className="flex-1">{children}</div>
				<UnifiedFooter variant="app" />
			</main>
			<Toaster />
		</SidebarProvider>
	)
}
