'use client'

import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronDown, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { listAuditLogs } from '@/client'
import type { AuditLogEntry, AuditSource } from '@/client/types.gen'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { formatInCampusTimeZone } from '@/lib/date-time'
import {
	type AuditFieldChange,
	diffEventAuditData,
	summarizeAuditEntry
} from '@/lib/event-audit-diff'
import { cn } from '@/lib/utils'

const INITIAL_VISIBLE = 4

type TimelineEntry = {
	id: number
	at: string
	type: AuditLogEntry['type']
	source: AuditSource
	summary: string
	changes: AuditFieldChange[]
}

function buildTimeline(entries: AuditLogEntry[]): TimelineEntry[] {
	return entries.map((entry) => {
		const changes =
			entry.type === 'UPDATE'
				? diffEventAuditData(entry.old_data, entry.new_data)
				: []
		return {
			id: entry.id,
			at: entry.at,
			type: entry.type,
			source: entry.source ?? 'UI',
			summary: summarizeAuditEntry(entry.type, changes),
			changes
		}
	})
}

function relativeLabel(at: string) {
	return formatDistanceToNowStrict(new Date(at), {
		addSuffix: true,
		locale: de
	})
}

function absoluteLabel(at: string) {
	return formatInCampusTimeZone(new Date(at), 'EEEE, dd.MM.yyyy · HH:mm')
}

function SourceIcon({ source }: { source: AuditSource }) {
	if (source !== 'MCP') {
		return null
	}
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground">
					<Sparkles className="size-3.5" aria-hidden />
					<span className="sr-only">via KI (MCP)</span>
				</span>
			</TooltipTrigger>
			<TooltipContent side="top">via KI (MCP)</TooltipContent>
		</Tooltip>
	)
}

function EntryTitle({ entry }: { entry: TimelineEntry }) {
	return (
		<p className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium leading-snug text-foreground">
			<span className="truncate">{entry.summary}</span>
			<SourceIcon source={entry.source} />
		</p>
	)
}

function EntryBody({
	entry,
	expanded,
	onToggle,
	reducedMotion
}: {
	entry: TimelineEntry
	expanded: boolean
	onToggle: () => void
	reducedMotion: boolean | null
}) {
	const hasDetails = entry.changes.length > 0
	const single = entry.changes.length === 1 ? entry.changes[0] : null

	return (
		<div className="min-w-0 flex-1 pb-5">
			{hasDetails && !single ? (
				<button
					type="button"
					onClick={onToggle}
					aria-expanded={expanded}
					className="group flex w-full items-start justify-between gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<div className="min-w-0 space-y-1">
						<EntryTitle entry={entry} />
						<p
							className="text-xs text-muted-foreground tabular-nums"
							title={absoluteLabel(entry.at)}
						>
							{relativeLabel(entry.at)}
						</p>
					</div>
					<ChevronDown
						className={cn(
							'mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
							expanded && 'rotate-180'
						)}
						aria-hidden
					/>
				</button>
			) : (
				<div className="space-y-1">
					<EntryTitle entry={entry} />
					{single ? (
						<p className="text-xs leading-relaxed text-muted-foreground">
							<span className="text-foreground/80">{single.from}</span>
							<span className="mx-1.5 text-muted-foreground">→</span>
							<span className="text-foreground/80">{single.to}</span>
						</p>
					) : null}
					<p
						className="text-xs text-muted-foreground tabular-nums"
						title={absoluteLabel(entry.at)}
					>
						{relativeLabel(entry.at)}
					</p>
				</div>
			)}

			<AnimatePresence initial={false}>
				{expanded && entry.changes.length > 1 ? (
					<motion.ul
						initial={reducedMotion ? false : { height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
						transition={{
							duration: reducedMotion ? 0 : 0.18,
							ease: [0.16, 1, 0.3, 1]
						}}
						className="mt-2.5 space-y-2 overflow-hidden border-l border-border/70 pl-3"
					>
						{entry.changes.map((change) => (
							<li key={change.key} className="space-y-0.5">
								<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
									{change.label}
								</p>
								<p className="text-xs leading-relaxed text-muted-foreground">
									<span className="text-foreground/80">{change.from}</span>
									<span className="mx-1.5 text-muted-foreground">→</span>
									<span className="text-foreground/80">{change.to}</span>
								</p>
							</li>
						))}
					</motion.ul>
				) : null}
			</AnimatePresence>
		</div>
	)
}

function TimelineSkeleton() {
	return (
		<div className="space-y-4 pt-1">
			{[0, 1, 2].map((key) => (
				<div key={key} className="flex gap-3">
					<Skeleton className="mt-1 size-2.5 shrink-0 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-3 w-20" />
					</div>
				</div>
			))}
		</div>
	)
}

export function EventChangeHistory({
	eventId,
	enabled
}: {
	readonly eventId: number
	readonly enabled: boolean
}) {
	const reducedMotion = useReducedMotion()
	const [expandedId, setExpandedId] = useState<number | null>(null)
	const [showAll, setShowAll] = useState(false)

	const { data: entries = [], isLoading } = useQuery<AuditLogEntry[]>({
		queryKey: ['audit-logs', 'event', eventId],
		enabled,
		refetchOnMount: 'always',
		queryFn: async () => {
			const response = await listAuditLogs({
				query: { event_id: eventId, limit: 50 },
				throwOnError: true
			})
			return response.data ?? []
		}
	})

	const timeline = useMemo(() => buildTimeline(entries), [entries])
	const visible = showAll ? timeline : timeline.slice(0, INITIAL_VISIBLE)
	const hiddenCount = Math.max(0, timeline.length - INITIAL_VISIBLE)

	if (!enabled) {
		return null
	}

	return (
		<section className="mt-8 border-t pt-6">
			<div className="mb-4 flex items-baseline justify-between gap-3">
				<h3 className="text-sm font-semibold tracking-tight">Verlauf</h3>
				{timeline.length > 0 ? (
					<p className="text-xs text-muted-foreground tabular-nums">
						{timeline.length} {timeline.length === 1 ? 'Eintrag' : 'Einträge'}
					</p>
				) : null}
			</div>

			{isLoading ? (
				<TimelineSkeleton />
			) : timeline.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Noch keine Änderungen erfasst.
				</p>
			) : (
				<>
					<ol className="relative">
						{visible.map((entry, index) => {
							const isLast = index === visible.length - 1 && hiddenCount === 0
							return (
								<li key={entry.id} className="relative flex gap-3">
									<div className="flex w-2.5 shrink-0 flex-col items-center">
										<span
											className={cn(
												'mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-background',
												entry.type === 'CREATE' &&
													'bg-emerald-500/80 dark:bg-emerald-400/80',
												entry.type === 'UPDATE' && 'bg-foreground/55',
												entry.type === 'DELETE' && 'bg-destructive/80'
											)}
										/>
										{isLast ? null : (
											<span className="mt-1 w-px flex-1 bg-border/80" />
										)}
									</div>
									<motion.div
										initial={reducedMotion ? false : { opacity: 0, y: 4 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: reducedMotion ? 0 : 0.2,
											delay: reducedMotion ? 0 : Math.min(index, 5) * 0.03,
											ease: [0.16, 1, 0.3, 1]
										}}
										className="min-w-0 flex-1"
									>
										<EntryBody
											entry={entry}
											expanded={expandedId === entry.id}
											reducedMotion={reducedMotion}
											onToggle={() =>
												setExpandedId((current) =>
													current === entry.id ? null : entry.id
												)
											}
										/>
									</motion.div>
								</li>
							)
						})}
					</ol>

					{hiddenCount > 0 && !showAll ? (
						<button
							type="button"
							onClick={() => setShowAll(true)}
							className="mt-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{hiddenCount} weitere anzeigen
						</button>
					) : null}
				</>
			)}
		</section>
	)
}
