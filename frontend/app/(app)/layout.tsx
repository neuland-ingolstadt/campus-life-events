import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { UnifiedFooter } from '@/components/unified-footer'
import { requireUser } from '@/lib/server-auth'

export default async function AppLayout({
	children
}: Readonly<{ children: React.ReactNode }>) {
	await requireUser()
	return (
		<SidebarProvider>
			<DashboardSidebar />
			<SidebarInset className="min-h-svh min-w-0">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<div className="min-w-0 flex-1">{children}</div>
					<UnifiedFooter variant="app" />
				</div>
			</SidebarInset>
			<Toaster />
		</SidebarProvider>
	)
}
