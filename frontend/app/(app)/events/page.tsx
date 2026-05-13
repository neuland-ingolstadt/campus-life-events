'use client'

import { EventsDashboard } from '@/components/events/events-dashboard'

export default function EventsPage() {
	return (
		<EventsDashboard
			pageTitle="Events"
			tableId="events"
			eventsHeaderDescription="Verwalte und organisiere Events mit erweiterten Filtern"
		/>
	)
}
