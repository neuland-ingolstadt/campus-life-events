import { requireUser } from '@/lib/server-auth'
import { ICalClient } from './ical-client'

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'

export default async function ICalPage() {
	const user = await requireUser()

	return <ICalClient backendUrl={backendUrl} userId={user.id} />
}
