'use client'

import moment from 'moment'
import {
	Calendar,
	type CalendarEvent,
	momentLocalizer
} from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback } from 'react'
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

interface EventComponentProps {
	event: CalendarEvent & {
		resource: {
			organizer_id: number
			organizerName: string
		}
	}
	userId?: number
	onDelete: (id: number) => Promise<void>
}

function EventComponent({ event, userId, onDelete }: EventComponentProps) {
	const isOwnEvent = userId && userId === event.resource.organizer_id

	return (
		<div className="flex flex-col">
			<div className="font-medium text-xs truncate">{event.title}</div>
			<div className="text-xs opacity-90 truncate">
				{event.resource.organizerName}
			</div>
			{isOwnEvent && (
				<div className="flex gap-1 mt-1">
					<Link href={`/events/${event.id}`}>
						<Button
							variant="ghost"
							size="sm"
							className="h-4 px-1 text-xs hover:bg-white/20"
							onClick={(e) => e.stopPropagation()}
						>
							<Pencil className="h-3 w-3" />
						</Button>
					</Link>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-4 px-1 text-xs hover:bg-white/20"
								onClick={(e) => e.stopPropagation()}
							>
								<Trash2 className="h-3 w-3" />
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

interface Event {
	id: number
	title_de: string
	title_en?: string
	description_de?: string
	description_en?: string
	start_date_time: string
	end_date_time?: string
	organizer_id: number
}

interface Organizer {
	id: number
	name: string
}

interface EventsCalendarProps {
	events: Event[]
	organizers: Organizer[]
	onDelete: (id: number) => Promise<void>
}

export function EventsCalendar({
	events,
	organizers,
	onDelete
}: EventsCalendarProps) {
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const userId = meData?.id as number | undefined

	const getOrganizerName = useCallback(
		(organizerId: number) => {
			const organizer = organizers.find(
				(org: Organizer) => org.id === organizerId
			)
			return organizer?.name || 'Unbekannter Verein'
		},
		[organizers]
	)

	// Transform events to calendar format
	const calendarEvents = events.map((event) => ({
		id: event.id,
		title: event.title_de,
		start: new Date(event.start_date_time),
		end: event.end_date_time
			? new Date(event.end_date_time)
			: new Date(event.start_date_time),
		resource: {
			...event,
			organizerName: getOrganizerName(event.organizer_id)
		}
	}))

	const eventStyleGetter = (event: CalendarEvent) => {
		const isOwnEvent =
			userId &&
			userId === (event.resource as { organizer_id: number }).organizer_id
		return {
			backgroundColor: isOwnEvent ? '#3b82f6' : '#6b7280',
			borderColor: isOwnEvent ? '#2563eb' : '#4b5563',
			color: 'white',
			borderRadius: '4px',
			border: 'none',
			fontSize: '12px',
			padding: '2px 4px'
		}
	}

	return (
		<div className="h-[600px] w-full">
			<Calendar
				localizer={localizer}
				events={calendarEvents}
				startAccessor="start"
				endAccessor="end"
				style={{ height: '100%' }}
				views={['month', 'week', 'day', 'agenda']}
				defaultView="month"
				popup
				eventPropGetter={eventStyleGetter}
				components={{
					event: (props: { event: CalendarEvent }) => (
						<EventComponent
							event={
								props.event as CalendarEvent & {
									resource: { organizer_id: number; organizerName: string }
								}
							}
							userId={userId}
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
