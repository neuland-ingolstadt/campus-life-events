'use client'

import moment from 'moment'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback } from 'react'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer
} from '@/client/types.gen'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { me } from '@/lib/auth'

const localizer = momentLocalizer(moment)

type CalendarEvent = {
	id: number
	title: string
	start: Date
	end: Date
	resource: ApiEvent & { organizerName: string }
}

interface EventComponentProps {
	event: CalendarEvent
	organizerId?: number
	isAdmin: boolean
	onDelete: (id: number) => Promise<void>
}

function EventComponent({
	event,
	organizerId,
	isAdmin,
	onDelete
}: EventComponentProps) {
	const isOwnEvent =
		isAdmin ||
		(organizerId !== undefined && organizerId === event.resource.organizer_id)

	return (
		<div className="flex flex-col text-white">
			<div className="font-medium text-xs truncate text-white">
				{event.title}
			</div>
			<div className="text-xs opacity-90 truncate text-white">
				{event.resource.organizerName}
			</div>
			{isOwnEvent && (
				<div className="flex gap-1 mt-1">
					<Link href={`/events/${event.id}`}>
						<Button
							variant="ghost"
							size="sm"
							className="h-4 px-1 text-xs hover:bg-white/20 text-white"
							onClick={(e) => e.stopPropagation()}
						>
							<Pencil className="h-3 w-3 " color="lightgrey" />
						</Button>
					</Link>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-4 px-1 text-xs hover:bg-white/20 text-white"
								onClick={(e) => e.stopPropagation()}
							>
								<Trash2 className="h-3 w-3 " color="lightgrey" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Event löschen</AlertDialogTitle>
								<AlertDialogDescription>
									Bist du sicher, dass du "{event.title}" löschen möchtest?
									Diese Aktion kann nicht rückgängig gemacht werden.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Abbrechen</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => onDelete(event.id as number)}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Löschen
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			)}
		</div>
	)
}

interface EventsCalendarProps {
	events: ApiEvent[]
	organizers: ApiOrganizer[]
	onDelete: (id: number) => Promise<void>
}

export function EventsCalendar({
	events,
	organizers,
	onDelete
}: EventsCalendarProps) {
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const organizerId = meData?.organizer_id ?? undefined
	const isAdmin = meData?.account_type === 'ADMIN'

	// State for calendar view and date

	const getOrganizerName = useCallback(
		(organizerId: number) => {
			const organizer = organizers.find(
				(org: ApiOrganizer) => org.id === organizerId
			)
			return organizer?.name || 'Unbekannter Verein'
		},
		[organizers]
	)

	// Transform events to calendar format
	const calendarEvents: CalendarEvent[] = events.map((event) => ({
		id: event.id,
		title: event.title_de,
		start: new Date(event.start_date_time),
		end: new Date(event.end_date_time),
		resource: {
			...event,
			organizerName: getOrganizerName(event.organizer_id)
		}
	}))

	const eventStyleGetter = (event: CalendarEvent) => {
		const isOwnEvent =
			isAdmin ||
			(organizerId !== undefined && organizerId === event.resource.organizer_id)
		return {
			style: {
				backgroundColor: isOwnEvent ? '#3b82f6' : '#6b7280',
				borderColor: isOwnEvent ? '#2563eb' : '#4b5563',
				color: 'white',
				borderRadius: '4px',
				border: 'none',
				fontSize: '12px',
				padding: '2px 4px'
			}
		}
	}

	return (
		<div className="h-[600px] bg-background w-full force-light-theme">
			<Calendar
				localizer={localizer}
				events={calendarEvents}
				startAccessor="start"
				endAccessor="end"
				style={{ height: '100%' }}
				views={['month', 'week', 'day', 'agenda']}
				popup
				eventPropGetter={eventStyleGetter}
				components={{
					event: (props: { event: CalendarEvent }) => (
						<EventComponent
							event={props.event}
							organizerId={organizerId}
							isAdmin={isAdmin}
							onDelete={onDelete}
						/>
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
