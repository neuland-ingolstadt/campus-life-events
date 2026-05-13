'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import type { Event as ApiEvent } from '@/client/types.gen'
import { EventActionsCell } from '@/components/events/event-actions-cell'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip'

interface EventsMobileListProps {
	readonly events: ApiEvent[]
	readonly getOrganizerName: (organizerId: number) => string
	readonly organizerId?: number
	readonly isAdmin: boolean
	readonly onDelete: (id: number) => Promise<void>
}

export function EventsMobileList({
	events,
	getOrganizerName,
	organizerId,
	isAdmin,
	onDelete
}: EventsMobileListProps) {
	if (events.length === 0) {
		return (
			<div className="rounded-md border flex min-h-24 items-center justify-center text-muted-foreground text-sm">
				Keine Einträge.
			</div>
		)
	}

	return (
		<ul className="flex flex-col gap-3">
			{events.map((event) => {
				const canManage =
					isAdmin ||
					(organizerId !== undefined && organizerId === event.organizer_id)
				const isPublic = event.publish_app || event.publish_newsletter

				return (
					<li key={event.id}>
						<Card className="gap-0 py-0 shadow-sm overflow-hidden">
							<CardHeader className="px-4 pt-4 pb-2 gap-2 space-y-0">
								<CardTitle className="text-base font-semibold leading-snug">
									<Link
										href={`/events/${event.id}`}
										className="hover:underline break-words"
									>
										{event.title_de}
									</Link>
								</CardTitle>
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
										{format(new Date(event.start_date_time), 'dd.MM.yyyy')}{' '}
										<span className="text-muted-foreground font-normal">
											{format(new Date(event.start_date_time), 'HH:mm')}
										</span>
									</div>
									<div className="text-muted-foreground">Ende</div>
									<div className="font-medium text-right tabular-nums">
										{format(new Date(event.end_date_time), 'dd.MM.yyyy')}{' '}
										<span className="text-muted-foreground font-normal">
											{format(new Date(event.end_date_time), 'HH:mm')}
										</span>
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<div className="text-xs font-medium bg-primary/5 text-primary border border-primary/20 rounded-full px-2 py-1 max-w-full break-words">
										{getOrganizerName(event.organizer_id)}
									</div>
									<Tooltip>
										<TooltipTrigger asChild>
											<div
												className={`border border-primary/20 rounded-full px-2 py-1 text-xs shrink-0 ${
													isPublic
														? 'border-border text-blue-500 bg-blue-500/5'
														: 'border-border text-purple-500 bg-purple-500/5'
												}`}
											>
												{isPublic ? 'Extern' : 'Intern'}
											</div>
										</TooltipTrigger>
										<TooltipContent>
											{isPublic
												? 'Öffentliches Event: Beworben in Newsletter / App'
												: 'Internes Event: Nicht im Newsletter / App'}
										</TooltipContent>
									</Tooltip>
								</div>
								{canManage ? (
									<div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
										<EventActionsCell
											event={event}
											canManage={canManage}
											onDelete={onDelete}
										/>
									</div>
								) : null}
							</CardContent>
						</Card>
					</li>
				)
			})}
		</ul>
	)
}
