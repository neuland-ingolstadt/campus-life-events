import { headers } from 'next/headers'
import { requireUser } from '@/lib/server-auth'
import { ICalClient } from './ical-client'

export default async function ICalPage() {
	const user = await requireUser()
	const headersList = await headers()
	const host = headersList.get('host') || 'localhost:3000'
	const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
	const baseUrl = `${protocol}://${host}`

	return (
		<ICalClient backendUrl={baseUrl} userId={user?.organizer_id ?? undefined} />
	)
}
