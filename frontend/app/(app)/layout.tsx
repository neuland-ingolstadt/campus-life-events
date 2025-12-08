export const dynamic = 'force-dynamic'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
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
			<main className="flex-1 flex flex-col min-h-screen">
				<div className="flex-1">{children}</div>
				<UnifiedFooter variant="app" />
			</main>
			<Toaster />
		</SidebarProvider>
	)
}
