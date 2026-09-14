'use client'

import { ChevronRight } from 'lucide-react'
import type { Event as ApiEvent } from '@/client/types.gen'
import {
	EventOrganizerBadge,
	EventVisibilityIndicator
} from '@/components/events/event-status-badges'
import { EventsEmptyState } from '@/components/events/events-empty-state'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { formatInCampusTimeZone } from '@/lib/date-time'
import { deriveEventVisibilityMode } from '@/lib/event-visibility'

interface EventsMobileListProps {
	readonly events: ApiEvent[]
	readonly getOrganizerName: (organizerId: number) => string
	readonly organizerId?: number
	readonly onOpen: (event: ApiEvent) => void
}

export function EventsMobileList({
	events,
	getOrganizerName,
	organizerId,
	onOpen
}: EventsMobileListProps) {
	if (events.length === 0) {
		return (
			<div className="rounded-md border">
				<EventsEmptyState />
			</div>
		)
	}

	return (
		<ul className="flex flex-col gap-3">
			{events.map((event) => {
				const isOwn =
					organizerId !== undefined && organizerId === event.organizer_id
				const visibility = deriveEventVisibilityMode(event)

				return (
					<li key={event.id}>
						<Card
							className="gap-0 py-0 shadow-sm overflow-hidden cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							tabIndex={0}
							onClick={() => onOpen(event)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									onOpen(event)
								}
							}}
						>
							<CardHeader className="px-4 pt-4 pb-2 gap-2 space-y-0">
								<div className="flex items-start gap-2">
									<CardTitle className="flex-1 text-base font-semibold leading-snug break-words">
										{event.title_de}
									</CardTitle>
									<ChevronRight
										className="mt-0.5 size-4 shrink-0 text-muted-foreground"
										aria-hidden
									/>
								</div>
								{event.description_de ? (
									<CardDescription className="line-clamp-2 text-xs">
										{event.description_de}
									</CardDescription>
								) : null}
							</CardHeader>
							<CardContent className="px-4 pb-4 space-y-3">
								<div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
									<div className="text-muted-foreground">Start</div>
									<div className="font-medium text-right tabular-nums">
										{formatInCampusTimeZone(
											new Date(event.start_date_time),
											'dd.MM.yyyy'
										)}{' '}
										<span className="text-muted-foreground font-normal">
											{formatInCampusTimeZone(
												new Date(event.start_date_time),
												'HH:mm'
											)}
										</span>
									</div>
									<div className="text-muted-foreground">Ende</div>
									<div className="font-medium text-right tabular-nums">
										{formatInCampusTimeZone(
											new Date(event.end_date_time),
											'dd.MM.yyyy'
										)}{' '}
										<span className="text-muted-foreground font-normal">
											{formatInCampusTimeZone(
												new Date(event.end_date_time),
												'HH:mm'
											)}
										</span>
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<EventOrganizerBadge
										name={getOrganizerName(event.organizer_id)}
										isOwn={isOwn}
									/>
									<EventVisibilityIndicator mode={visibility} />
								</div>
							</CardContent>
						</Card>
					</li>
				)
			})}
		</ul>
	)
}
