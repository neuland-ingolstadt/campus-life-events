import { requireAdmin } from '@/lib/server-auth'
import { AdminDashboardClient } from './admin-client'

export default async function AdminPage() {
	await requireAdmin()
	return <AdminDashboardClient />
}
