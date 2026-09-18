'use client'

import { useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { listEvents, listOrganizers } from '@/client'
import type { Event } from '@/client/types.gen'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { me } from '@/lib/auth'
import { formatInCampusTimeZone } from '@/lib/date-time'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 300
const OVERLAP_LIMIT = 50

interface ScheduleOverlapHintProps {
	readonly start?: Date
	readonly end?: Date
	readonly excludeEventId?: number
	readonly className?: string
}

function useDebouncedIsoRange(start?: Date, end?: Date) {
	const [range, setRange] = useState<{ start: string; end: string } | null>(
		null
	)

	useEffect(() => {
		if (!start || !end || end <= start) {
			setRange(null)
			return
		}

		const timeoutId = window.setTimeout(() => {
			setRange({
				start: start.toISOString(),
				end: end.toISOString()
			})
		}, DEBOUNCE_MS)

		return () => window.clearTimeout(timeoutId)
	}, [start, end])

	return range
}

function formatOverlapSummary(eventCount: number) {
	if (eventCount === 1) {
		return '1 Event zur gleichen Zeit'
	}
	return `${eventCount} Events zur gleichen Zeit`
}

function formatEventTimeRange(event: Event) {
	const start = formatInCampusTimeZone(event.start_date_time, 'dd.MM. HH:mm')
	const end = formatInCampusTimeZone(event.end_date_time, 'HH:mm')
	return `${start}–${end}`
}

export function ScheduleOverlapHint({
	start,
	end,
	excludeEventId,
	className
}: ScheduleOverlapHintProps) {
	const range = useDebouncedIsoRange(start, end)
	const [open, setOpen] = useState(false)

	const { data: meData } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me
	})
	const ownOrganizerId = meData?.organizer_id ?? undefined

	const { data: organizers = [] } = useQuery({
		queryKey: ['organizers'],
		queryFn: async () => {
			const response = await listOrganizers({})
			return response.data ?? []
		}
	})

	const organizerNameById = useMemo(() => {
		const map = new Map<number, string>()
		for (const organizer of organizers) {
			map.set(organizer.id, organizer.name)
		}
		return map
	}, [organizers])

	const { data: overlapEvents = [] } = useQuery({
		queryKey: ['events', 'schedule-overlap', range?.start, range?.end],
		enabled: range !== null,
		queryFn: async () => {
			if (!range) {
				return []
			}
			const response = await listEvents({
				query: {
					overlaps_start: range.start,
					overlaps_end: range.end,
					limit: OVERLAP_LIMIT
				}
			})
			return response.data?.items ?? []
		}
	})

	const peerEvents = useMemo(() => {
		return overlapEvents.filter((event) => {
			if (excludeEventId !== undefined && event.id === excludeEventId) {
				return false
			}
			if (
				ownOrganizerId !== undefined &&
				event.organizer_id === ownOrganizerId
			) {
				return false
			}
			return true
		})
	}, [excludeEventId, overlapEvents, ownOrganizerId])

	const eventCount = peerEvents.length

	if (eventCount === 0) {
		return null
	}

	return (
		<div className={cn('mt-3', className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							'inline-flex max-w-full items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-left text-sm text-amber-950 transition-colors dark:text-amber-100',
							'hover:bg-amber-500/15',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
							open && 'bg-amber-500/20'
						)}
						aria-expanded={open}
					>
						<TriangleAlert
							className="size-3.5 shrink-0 text-amber-700 dark:text-amber-400"
							aria-hidden
						/>
						<span className="min-w-0 truncate">
							{formatOverlapSummary(eventCount)}
						</span>
					</button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					side="bottom"
					sideOffset={8}
					collisionPadding={16}
					className="w-[min(22rem,calc(100vw-2rem))] p-0"
				>
					<ul className="max-h-64 overflow-y-auto py-1">
						{peerEvents.map((event) => {
							const organizerName =
								organizerNameById.get(event.organizer_id) ??
								`#${event.organizer_id}`

							return (
								<li
									key={event.id}
									className="border-b border-border/50 px-3 py-2 last:border-b-0"
								>
									<p className="truncate text-sm font-medium text-foreground">
										{organizerName}
									</p>
									<p className="truncate text-sm text-muted-foreground">
										{event.title_de}
									</p>
									<p className="mt-0.5 text-xs text-muted-foreground">
										{formatEventTimeRange(event)}
									</p>
								</li>
							)
						})}
					</ul>
				</PopoverContent>
			</Popover>
		</div>
	)
}
