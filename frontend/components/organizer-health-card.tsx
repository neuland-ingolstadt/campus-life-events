'use client'

import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getOrganizerHealth } from '@/client'
import type { OrganizerHealthResponse } from '@/client/types.gen'
import { Button } from '@/components/ui/button'

const TEMP_MOCK_HEALTH = false

function formatCount(value: number): string {
	const rounded = Math.round(value * 10) / 10
	if (Number.isInteger(rounded)) {
		return String(rounded)
	}
	return rounded.toLocaleString('de-DE', {
		maximumFractionDigits: 1
	})
}

function mockHealth(organizerId: number): OrganizerHealthResponse {
	const eighteenDaysAgo = new Date(
		Date.now() - 18 * 24 * 60 * 60 * 1000
	).toISOString()
	return {
		organizer_id: organizerId,
		previous_login_at: eighteenDaysAgo,
		last_login_at: new Date().toISOString(),
		future_events_count: 1,
		peer_future_events_median: 3,
		future_events_vs_peer_ratio: 3,
		peer_sample_size: 12,
		profile_fields_filled: 1,
		profile_fields_total: 4,
		profile_completeness: 0.25,
		peer_profile_complete_share: 0.7,
		show_login_nudge: true,
		show_event_nudge: true,
		show_profile_nudge: true
	}
}

type Insight = {
	key: string
	label: string
	metric: string
	detail: string
	action?: {
		label: string
		onClick?: () => void
		href?: string
	}
}

function buildInsights(
	health: OrganizerHealthResponse,
	onCreateEvent?: () => void
): Insight[] {
	const insights: Insight[] = []

	if (health.show_login_nudge && health.previous_login_at) {
		const relative = formatDistanceToNowStrict(
			new Date(health.previous_login_at),
			{ addSuffix: true, locale: de }
		)
		insights.push({
			key: 'login',
			label: 'Lange weg',
			metric: relative,
			detail:
				'In der Zeit können Termine, Freigaben und Newsletter-Fristen an euch vorbeigehen.'
		})
	}

	if (health.show_event_nudge && health.peer_future_events_median != null) {
		const medianLabel = formatCount(health.peer_future_events_median)
		const own = health.future_events_count
		insights.push({
			key: 'events',
			label: 'Zu wenig Termine',
			metric: own === 0 ? 'Keine' : String(own),
			detail:
				own === 0
					? `Andere Vereine stehen mit ~${medianLabel} Terminen in App und Newsletter – ihr seid unsichtbar.`
					: `Andere Vereine haben gerade eher ${medianLabel}. Weniger Termine heißt weniger Reichweite.`,
			action: onCreateEvent
				? { label: 'Jetzt Termin anlegen', onClick: onCreateEvent }
				: { label: 'Jetzt Termin anlegen', href: '/events/new' }
		})
	}

	if (health.show_profile_nudge) {
		insights.push({
			key: 'profile',
			label: 'Profil lückenhaft',
			metric: `${health.profile_fields_filled} von ${health.profile_fields_total}`,
			detail:
				'Ohne Beschreibung und Website wirkt ihr unvollständig – Studierende und Vereine überspringen euch leichter.',
			action: {
				label: 'Profil jetzt ergänzen',
				href: `/organizers?edit=${health.organizer_id}`
			}
		})
	}

	return insights
}

type OrganizerHealthCardProps = {
	organizerId: number
	onCreateEvent?: () => void
}

export function OrganizerHealthCard({
	organizerId,
	onCreateEvent
}: OrganizerHealthCardProps) {
	const { data: health } = useQuery<OrganizerHealthResponse | null>({
		queryKey: [
			'organizers',
			'me',
			'health',
			TEMP_MOCK_HEALTH ? 'mock' : 'live'
		],
		queryFn: async () => {
			if (TEMP_MOCK_HEALTH) {
				return mockHealth(organizerId)
			}
			try {
				const response = await getOrganizerHealth({ throwOnError: true })
				return response.data ?? null
			} catch {
				return null
			}
		}
	})

	if (!health) {
		return null
	}

	const insights = buildInsights(health, onCreateEvent)
	if (insights.length === 0) {
		return null
	}

	return (
		<section className="space-y-3">
			<div>
				<h3 className="text-lg font-semibold">Achtung – Handlungsbedarf</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Nur ihr seht das. Andere Vereine holen euch gerade ab.
				</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{insights.map((insight) => (
					<div
						key={insight.key}
						className="flex flex-col rounded-lg border border-destructive/25 bg-card p-5"
					>
						<p className="text-xs font-medium uppercase tracking-wide text-destructive">
							{insight.label}
						</p>
						<p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
							{insight.metric}
						</p>
						<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
							{insight.detail}
						</p>
						{insight.action ? (
							<div className="mt-auto pt-4">
								{insight.action.onClick ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={insight.action.onClick}
									>
										{insight.action.label}
										<ChevronRight className="size-3.5" />
									</Button>
								) : insight.action.href ? (
									<Button asChild size="sm" variant="outline">
										<Link href={insight.action.href}>
											{insight.action.label}
											<ChevronRight className="size-3.5" />
										</Link>
									</Button>
								) : null}
							</div>
						) : null}
					</div>
				))}
			</div>
		</section>
	)
}
