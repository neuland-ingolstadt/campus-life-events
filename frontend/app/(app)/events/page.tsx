'use client'

import { Suspense } from 'react'
import { EventsDashboard } from '@/components/events/events-dashboard'

export default function EventsPage() {
	return (
		<Suspense fallback={null}>
			<EventsDashboard
				pageTitle="Events"
				tableId="events"
				eventsHeaderDescription="Verwalte und organisiere Events mit erweiterten Filtern"
			/>
		</Suspense>
	)
}
