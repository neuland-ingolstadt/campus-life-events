'use client'

import { useQuery } from '@tanstack/react-query'
import { de } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { useMemo } from 'react'
import { listPublicEvents } from '@/client'
import type { PublicEventResponse } from '@/client/types.gen'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip'
import {
	buildActivityHeatmap,
	type HeatmapDay,
	type HeatmapSeries,
	heatmapDayLabels
} from '@/lib/activity-heatmap'
import { CAMPUS_TIME_ZONE } from '@/lib/date-time'
import { cn } from '@/lib/utils'

const CLUB_LEVELS = [
	'bg-muted',
	'bg-emerald-200 dark:bg-emerald-950',
	'bg-emerald-300 dark:bg-emerald-800',
	'bg-emerald-500 dark:bg-emerald-600',
	'bg-emerald-600 dark:bg-emerald-400'
] as const

const THI_LEVELS = [
	'bg-muted',
	'bg-sky-200 dark:bg-sky-950',
	'bg-sky-300 dark:bg-sky-800',
	'bg-sky-500 dark:bg-sky-600',
	'bg-sky-600 dark:bg-sky-400'
] as const

const MIXED_LEVELS = [
	'bg-muted',
	'bg-[linear-gradient(135deg,#a7f3d0_50%,#bae6fd_50%)] dark:bg-[linear-gradient(135deg,#022c22_50%,#082f49_50%)]',
	'bg-[linear-gradient(135deg,#6ee7b7_50%,#7dd3fc_50%)] dark:bg-[linear-gradient(135deg,#065f46_50%,#075985_50%)]',
	'bg-[linear-gradient(135deg,#10b981_50%,#0ea5e9_50%)] dark:bg-[linear-gradient(135deg,#059669_50%,#0284c7_50%)]',
	'bg-[linear-gradient(135deg,#059669_50%,#0284c7_50%)] dark:bg-[linear-gradient(135deg,#34d399_50%,#38bdf8_50%)]'
] as const

function cellClass(series: HeatmapSeries, level: HeatmapDay['level']) {
	if (series === 'empty' || level === 0) return CLUB_LEVELS[0]
	if (series === 'club') return CLUB_LEVELS[level]
	if (series === 'thi') return THI_LEVELS[level]
	return MIXED_LEVELS[level]
}

function tooltipText(day: HeatmapDay) {
	const dateLabel = formatInTimeZone(
		day.date,
		CAMPUS_TIME_ZONE,
		'EEEE, dd.MM.yyyy',
		{ locale: de }
	)
	if (!day.inRange) {
		return dateLabel
	}
	if (day.total === 0) {
		return `Keine öffentlichen Events · ${dateLabel}`
	}
	const parts: string[] = []
	if (day.clubCount > 0) {
		parts.push(
			`${day.clubCount} Vereins-Event${day.clubCount === 1 ? '' : 's'}`
		)
	}
	if (day.thiCount > 0) {
		parts.push(`${day.thiCount} THI-Event${day.thiCount === 1 ? '' : 's'}`)
	}
	return `${parts.join(', ')} · ${dateLabel}`
}

function HeatmapGrid({
	events,
	isLoading
}: {
	events: PublicEventResponse[]
	isLoading: boolean
}) {
	const model = useMemo(() => buildActivityHeatmap(events), [events])
	const dayLabels = heatmapDayLabels()

	if (isLoading) {
		return <Skeleton className="h-[148px] w-full rounded-lg" />
	}

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto pb-1">
				<div className="inline-block min-w-full">
					<div className="flex gap-1">
						<div className="w-7 shrink-0" />
						<div className="flex gap-1">
							{model.weeks.map((week, weekIndex) => {
								const month = model.monthLabels.find(
									(entry) => entry.weekIndex === weekIndex
								)
								return (
									<div
										key={`month-${week[0]?.dateKey ?? weekIndex}`}
										className="flex h-4 w-2.5 items-start justify-start overflow-visible"
									>
										{month ? (
											<span className="whitespace-nowrap text-[10px] leading-none text-muted-foreground">
												{month.label}
											</span>
										) : null}
									</div>
								)
							})}
						</div>
					</div>

					<div className="mt-1.5 flex gap-1">
						<div className="flex w-7 shrink-0 flex-col gap-1 pt-0">
							{dayLabels.map((label, index) => (
								<div
									key={label}
									className={cn(
										'flex h-2.5 items-center text-[10px] leading-none text-muted-foreground',
										index % 2 === 1 ? 'opacity-100' : 'opacity-0'
									)}
								>
									{label}
								</div>
							))}
						</div>

						<div className="flex gap-1">
							{model.weeks.map((week) => (
								<div
									key={week[0]?.dateKey}
									className="flex w-2.5 flex-col gap-1"
								>
									{week.map((day) => (
										<Tooltip key={day.dateKey}>
											<TooltipTrigger asChild>
												<button
													type="button"
													className={cn(
														'size-2.5 rounded-[3px] ring-1 ring-black/5 transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:ring-white/10',
														!day.inRange && 'opacity-30',
														cellClass(day.series, day.level)
													)}
													aria-label={tooltipText(day)}
												/>
											</TooltipTrigger>
											<TooltipContent side="top">
												{tooltipText(day)}
											</TooltipContent>
										</Tooltip>
									))}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
				<p>
					{model.totals.club + model.totals.thi} öffentliche Events in den
					letzten {model.weeks.length} Wochen
					{model.totals.days > 0 ? ` · ${model.totals.days} aktive Tage` : ''}
				</p>
				<div className="flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-1.5">
						<span className="size-2.5 rounded-[3px] bg-emerald-500 dark:bg-emerald-400" />
						<span>Vereine ({model.totals.club})</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="size-2.5 rounded-[3px] bg-sky-500 dark:bg-sky-400" />
						<span>THI ({model.totals.thi})</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="size-2.5 rounded-[3px] bg-[linear-gradient(135deg,#10b981_50%,#0ea5e9_50%)]" />
						<span>Beide</span>
					</div>
					<div className="flex items-center gap-1">
						<span>Weniger</span>
						<span className="size-2.5 rounded-[3px] bg-muted ring-1 ring-black/5 dark:ring-white/10" />
						<span className="size-2.5 rounded-[3px] bg-emerald-200 ring-1 ring-black/5 dark:bg-emerald-950 dark:ring-white/10" />
						<span className="size-2.5 rounded-[3px] bg-emerald-300 ring-1 ring-black/5 dark:bg-emerald-800 dark:ring-white/10" />
						<span className="size-2.5 rounded-[3px] bg-emerald-500 ring-1 ring-black/5 dark:bg-emerald-600 dark:ring-white/10" />
						<span className="size-2.5 rounded-[3px] bg-emerald-600 ring-1 ring-black/5 dark:bg-emerald-400 dark:ring-white/10" />
						<span>Mehr</span>
					</div>
				</div>
			</div>
		</div>
	)
}

export function ActivityHeatmap() {
	const { data: events = [], isLoading } = useQuery<PublicEventResponse[]>({
		queryKey: ['public-events', 'heatmap'],
		queryFn: async () => {
			const response = await listPublicEvents({
				query: { limit: 5000 },
				throwOnError: true
			})
			return response.data ?? []
		}
	})

	return (
		<section className="space-y-3">
			<div>
				<h3 className="text-lg font-semibold">Campus-Aktivität</h3>
				<p className="text-sm text-muted-foreground">
					Öffentliche Events der letzten 12 Monate
				</p>
			</div>
			<div className="rounded-lg border bg-card p-4 sm:p-5">
				<HeatmapGrid events={events} isLoading={isLoading} />
			</div>
		</section>
	)
}
