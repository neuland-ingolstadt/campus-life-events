'use client'

import moment from 'moment'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useCallback } from 'react'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer
} from '@/client/types.gen'

const localizer = momentLocalizer(moment)

type CalendarEvent = {
	id: number
	title: string
	start: Date
	end: Date
	resource: ApiEvent & { organizerName: string; isOwn: boolean }
}

function EventComponent({ event }: { event: CalendarEvent }) {
	return (
		<div className="flex flex-col leading-tight">
			<div className="truncate text-xs font-medium">{event.title}</div>
			<div className="truncate text-[10px] opacity-90">
				{event.resource.organizerName}
			</div>
		</div>
	)
}

interface EventsCalendarProps {
	readonly events: ApiEvent[]
	readonly organizers: ApiOrganizer[]
	readonly organizerId?: number
	readonly isAdmin: boolean
	readonly onOpen: (event: ApiEvent) => void
}

export function EventsCalendar({
	events,
	organizers,
	organizerId,
	isAdmin,
	onOpen
}: EventsCalendarProps) {
	const getOrganizerName = useCallback(
		(id: number) => {
			const organizer = organizers.find((org: ApiOrganizer) => org.id === id)
			return organizer?.name || 'Unbekannte Organisation'
		},
		[organizers]
	)

	const calendarEvents: CalendarEvent[] = events.map((event) => {
		const isOwn =
			isAdmin ||
			(organizerId !== undefined && organizerId === event.organizer_id)

		return {
			id: event.id,
			title: event.title_de,
			start: new Date(event.start_date_time),
			end: new Date(event.end_date_time),
			resource: {
				...event,
				organizerName: getOrganizerName(event.organizer_id),
				isOwn
			}
		}
	})

	const eventStyleGetter = (event: CalendarEvent) => {
		const isOwn = event.resource.isOwn
		return {
			style: {
				backgroundColor: isOwn ? 'var(--primary)' : 'var(--muted-foreground)',
				borderColor: isOwn ? 'var(--primary)' : 'var(--muted-foreground)',
				color: isOwn ? 'var(--primary-foreground)' : 'var(--background)',
				borderRadius: '6px',
				border: 'none',
				fontSize: '12px',
				padding: '2px 6px',
				cursor: 'pointer',
				opacity: isOwn ? 1 : 0.85
			}
		}
	}

	return (
		<div className="h-[600px] w-full bg-background">
			<Calendar
				localizer={localizer}
				events={calendarEvents}
				startAccessor="start"
				endAccessor="end"
				style={{ height: '100%' }}
				views={['month', 'week', 'day', 'agenda']}
				popup
				selectable={false}
				onSelectEvent={(calendarEvent) => {
					onOpen(calendarEvent.resource)
				}}
				eventPropGetter={eventStyleGetter}
				components={{
					event: (props: { event: CalendarEvent }) => (
						<EventComponent event={props.event} />
					)
				}}
				messages={{
					allDay: 'Ganztägig',
					previous: 'Zurück',
					next: 'Weiter',
					today: 'Heute',
					month: 'Monat',
					week: 'Woche',
					day: 'Tag',
					agenda: 'Agenda',
					date: 'Datum',
					time: 'Zeit',
					event: 'Event',
					noEventsInRange: 'Keine Events in diesem Zeitraum',
					showMore: (total: number) => `+${total} weitere`
				}}
			/>
		</div>
	)
}
