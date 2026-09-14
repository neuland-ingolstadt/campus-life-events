'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, formatDistanceStrict, startOfDay } from 'date-fns'
import { de } from 'date-fns/locale'
import {
	AlertTriangle,
	Calendar,
	ChevronRight,
	Clock,
	MapPin,
	Pencil,
	Plus,
	TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { listEvents, listOrganizers } from '@/client'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer
} from '@/client/types.gen'
import { DashboardMcpTeaser } from '@/components/dashboard-mcp-teaser'
import {
	EventDetailSheet,
	type EventSheetMode
} from '@/components/events/event-detail-sheet'
import { EventVisibilityIndicator } from '@/components/events/event-status-badges'
import { McpAnnounceDialog } from '@/components/mcp-announce-dialog'
import QuickActions from '@/components/quick-actions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { me } from '@/lib/auth'
import { formatInCampusTimeZone } from '@/lib/date-time'
import { deriveEventVisibilityMode } from '@/lib/event-visibility'
import { scheduleOptimisticEventDelete } from '@/lib/optimistic-event-delete'

const weekSkeletonKeys = [
	'week-skeleton-1',
	'week-skeleton-2',
	'week-skeleton-3',
	'week-skeleton-4'
]

function useNowTicker(intervalMs = 60_000) {
	const [now, setNow] = useState(() => new Date())

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), intervalMs)
		return () => window.clearInterval(id)
	}, [intervalMs])

	return now
}

export default function Dashboard() {
	const qc = useQueryClient()
	const now = useNowTicker()
	const { data: user } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const { data: events = [], isLoading: eventsLoading } = useQuery<ApiEvent[]>({
		queryKey: ['events'],
		queryFn: async () => {
			const response = await listEvents({
				query: { limit: 5000 },
				throwOnError: true
			})
			return response.data?.items ?? []
		}
	})
	const { data: organizers = [] } = useQuery<ApiOrganizer[]>({
		queryKey: ['organizers'],
		queryFn: async () => {
			const response = await listOrganizers({ throwOnError: true })
			return response.data ?? []
		}
	})

	const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null)
	const [sheetMode, setSheetMode] = useState<EventSheetMode>('view')
	const [sheetOpen, setSheetOpen] = useState(false)

	const organizerList = organizers
	const isAdmin = user?.account_type === 'ADMIN'
	const organizerId = user?.organizer_id ?? undefined

	const currentUserOrganizer = organizerList.find(
		(o) => o.id === user?.organizer_id
	)

	const isProfileIncomplete =
		currentUserOrganizer &&
		((!currentUserOrganizer.description_de &&
			!currentUserOrganizer.description_en) ||
			!currentUserOrganizer.website_url)

	const userEvents = events.filter((e) => e.organizer_id === user?.organizer_id)
	const userUpcomingEvents = useMemo(
		() =>
			userEvents
				.filter((e) => new Date(e.start_date_time) > now)
				.sort(
					(a, b) =>
						new Date(a.start_date_time).getTime() -
						new Date(b.start_date_time).getTime()
				),
		[userEvents, now]
	)
	const userPublishedEvents = userEvents.filter((e) => e.publish_app)
	const nextUpEvent = userUpcomingEvents[0] ?? null

	const nextUpRelative = useMemo(() => {
		if (!nextUpEvent) {
			return null
		}
		return formatDistanceStrict(new Date(nextUpEvent.start_date_time), now, {
			addSuffix: true,
			locale: de
		})
	}, [nextUpEvent, now])

	const thisWeekEvents = useMemo(() => {
		const weekEnd = addDays(startOfDay(now), 7)
		return userUpcomingEvents
			.filter((event) => new Date(event.start_date_time) <= weekEnd)
			.slice(0, 5)
	}, [userUpcomingEvents, now])

	const getOrganizerName = useCallback(
		(id: number) => {
			const organizer = organizerList.find((org) => org.id === id)
			return organizer?.name || 'Unbekannte Organisation'
		},
		[organizerList]
	)

	const openEvent = useCallback((event: ApiEvent) => {
		setSelectedEvent(event)
		setSheetMode('view')
		setSheetOpen(true)
	}, [])

	const openCreate = useCallback(() => {
		setSelectedEvent(null)
		setSheetMode('create')
		setSheetOpen(true)
	}, [])

	const openEdit = useCallback((event: ApiEvent) => {
		setSelectedEvent(event)
		setSheetMode('edit')
		setSheetOpen(true)
	}, [])

	const onDelete = useCallback(
		(event: ApiEvent) => {
			scheduleOptimisticEventDelete({
				queryClient: qc,
				event,
				onRemoved: () => {
					if (selectedEvent?.id === event.id) {
						setSheetOpen(false)
						setSelectedEvent(null)
						setSheetMode('view')
					}
				}
			})
		},
		[qc, selectedEvent?.id]
	)

	return (
		<div className="flex flex-col min-h-screen">
			<McpAnnounceDialog />
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Dashboard</h1>
				</div>
			</header>

			<div className="flex-1 space-y-8 p-4 md:p-8 pt-6 mb-12">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">
							{user ? `Willkommen zurück, ${user.display_name}` : 'Willkommen'}
						</h2>
						<p className="text-muted-foreground mt-1">
							Verwalte deine Events und dein Organisationsprofil
						</p>
					</div>
					{user?.account_type === 'ORGANIZER' && (
						<div className="shrink-0 sm:pt-1">
							<DashboardMcpTeaser />
						</div>
					)}
				</div>

				{isProfileIncomplete ? (
					<Alert className="border-amber-500/40 bg-amber-500/10 text-foreground [&>svg]:text-amber-700 dark:[&>svg]:text-amber-400">
						<AlertTriangle />
						<AlertTitle>Organisationsprofil vervollständigen</AlertTitle>
						<AlertDescription className="gap-3">
							<p>
								Beschreibung oder Website fehlen noch. Vervollständige dein
								Profil, damit andere Vereine euch besser finden.
							</p>
							<Button asChild size="sm" className="mt-1 w-fit">
								<Link
									href={
										currentUserOrganizer
											? `/organizers?edit=${currentUserOrganizer.id}`
											: '/organizers'
									}
								>
									Profil bearbeiten
								</Link>
							</Button>
						</AlertDescription>
					</Alert>
				) : null}

				<div className="space-y-3">
					<h3 className="text-lg font-semibold">Schnellaktionen</h3>
					<QuickActions userEventsCount={userEvents.length} isAdmin={isAdmin} />
				</div>

				{isAdmin ? (
					<div>
						<h3 className="text-lg font-semibold">Admin-Übersicht</h3>
						<p className="text-muted-foreground mt-1">
							Als Admin kannst du alle Events und Organisationen verwalten, alle
							Änderungen im System nachvollziehen und neue Organisationen
							einladen.
						</p>
					</div>
				) : (
					<>
						<section className="space-y-4">
							<h3 className="text-lg font-semibold">Übersicht</h3>
							{eventsLoading ? (
								<div className="grid gap-4 lg:grid-cols-3">
									<Skeleton className="h-48 w-full rounded-lg lg:col-span-2" />
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
										<Skeleton className="h-[5.5rem] w-full rounded-lg" />
										<Skeleton className="h-[5.5rem] w-full rounded-lg" />
									</div>
								</div>
							) : (
								<div className="grid gap-4 lg:grid-cols-3 lg:items-stretch">
									{nextUpEvent ? (
										<div className="flex h-full min-h-48 flex-col gap-4 rounded-lg border bg-card p-5 sm:p-6 lg:col-span-2">
											<div className="flex flex-wrap items-center justify-between gap-2">
												<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
													Nächstes Event
												</p>
												<EventVisibilityIndicator
													mode={deriveEventVisibilityMode(nextUpEvent)}
												/>
											</div>

											<button
												type="button"
												onClick={() => openEvent(nextUpEvent)}
												className="rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<h4 className="text-xl font-semibold tracking-tight leading-snug">
													{nextUpEvent.title_de}
												</h4>
												<p className="mt-2 text-sm text-muted-foreground">
													<span className="font-medium text-foreground">
														{nextUpRelative}
													</span>
													<span className="mx-1.5 text-border">·</span>
													<span className="tabular-nums">
														{formatInCampusTimeZone(
															new Date(nextUpEvent.start_date_time),
															'EEEE, dd.MM.yyyy · HH:mm'
														)}
													</span>
												</p>
												{nextUpEvent.location ? (
													<p className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground">
														<MapPin className="size-3.5 shrink-0" />
														<span className="truncate">
															{nextUpEvent.location}
														</span>
													</p>
												) : null}
											</button>

											<div className="mt-auto flex flex-wrap gap-2 pt-1">
												<Button
													type="button"
													size="sm"
													onClick={() => openEdit(nextUpEvent)}
												>
													<Pencil className="size-3.5" />
													Bearbeiten
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => openEvent(nextUpEvent)}
												>
													Details
													<ChevronRight className="size-3.5" />
												</Button>
											</div>
										</div>
									) : (
										<div className="flex min-h-48 flex-col items-start justify-center gap-3 rounded-lg border border-dashed px-5 py-6 sm:px-6 lg:col-span-2">
											<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Nächstes Event
											</p>
											<div>
												<p className="text-base font-medium">
													Kein anstehendes Event
												</p>
												<p className="mt-1 text-sm text-muted-foreground">
													Plane dein nächstes Campus-Event – der Countdown
													startet hier.
												</p>
											</div>
											{organizerId !== undefined ? (
												<Button type="button" size="sm" onClick={openCreate}>
													<Plus className="size-4" />
													Event erstellen
												</Button>
											) : null}
										</div>
									)}

									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:content-stretch">
										<div className="flex h-full flex-col justify-between rounded-lg border bg-card p-5">
											<div className="flex items-center justify-between gap-2">
												<p className="text-sm font-medium">Anstehend</p>
												<Clock className="size-4 text-muted-foreground" />
											</div>
											<div className="mt-4">
												<p className="text-3xl font-bold tracking-tight tabular-nums">
													{userUpcomingEvents.length}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													Kommende eigene Events
												</p>
											</div>
										</div>

										<div className="flex h-full flex-col justify-between rounded-lg border bg-card p-5">
											<div className="flex items-center justify-between gap-2">
												<p className="text-sm font-medium">Bewerben</p>
												<TrendingUp className="size-4 text-muted-foreground" />
											</div>
											<div className="mt-4">
												<p className="text-3xl font-bold tracking-tight tabular-nums">
													{userPublishedEvents.length}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													In App / Newsletter
												</p>
											</div>
										</div>
									</div>
								</div>
							)}
						</section>

						<section className="space-y-4">
							<div className="flex flex-wrap items-end justify-between gap-3">
								<div>
									<h3 className="text-lg font-semibold">Diese Woche</h3>
									<p className="text-sm text-muted-foreground">
										Deine nächsten Events in den kommenden sieben Tagen
									</p>
								</div>
								{organizerId !== undefined ? (
									<Button type="button" size="sm" onClick={openCreate}>
										<Plus className="size-4" />
										Neues Event
									</Button>
								) : null}
							</div>

							{eventsLoading ? (
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
									{weekSkeletonKeys.map((key) => (
										<Skeleton key={key} className="h-28 w-full rounded-lg" />
									))}
								</div>
							) : thisWeekEvents.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
									<Calendar className="mb-3 size-10 text-muted-foreground" />
									<p className="text-sm font-medium">
										Keine Events in dieser Woche
									</p>
									<p className="mt-1 max-w-sm text-sm text-muted-foreground">
										Lege ein Event an oder schau in der Übersicht nach späteren
										Terminen.
									</p>
									<div className="mt-4 flex flex-wrap justify-center gap-2">
										{organizerId !== undefined ? (
											<Button type="button" size="sm" onClick={openCreate}>
												<Plus className="size-4" />
												Event erstellen
											</Button>
										) : null}
										<Button asChild size="sm" variant="outline">
											<Link href="/events">Zur Eventübersicht</Link>
										</Button>
									</div>
								</div>
							) : (
								<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
									{thisWeekEvents.map((event) => (
										<li key={event.id}>
											<button
												type="button"
												onClick={() => openEvent(event)}
												className="flex h-full w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="flex items-start justify-between gap-2">
													<p className="line-clamp-2 text-sm font-medium leading-snug">
														{event.title_de}
													</p>
													<ChevronRight
														className="mt-0.5 size-4 shrink-0 text-muted-foreground"
														aria-hidden
													/>
												</div>
												<div className="mt-auto space-y-2">
													<p className="text-xs text-muted-foreground tabular-nums">
														{formatInCampusTimeZone(
															new Date(event.start_date_time),
															'EEE, dd.MM. · HH:mm'
														)}
													</p>
													<EventVisibilityIndicator
														mode={deriveEventVisibilityMode(event)}
													/>
												</div>
											</button>
										</li>
									))}
								</ul>
							)}
						</section>
					</>
				)}
			</div>

			<EventDetailSheet
				event={selectedEvent}
				open={sheetOpen}
				onOpenChange={(open) => {
					setSheetOpen(open)
					if (!open) {
						setSelectedEvent(null)
						setSheetMode('view')
					}
				}}
				mode={sheetMode}
				onModeChange={setSheetMode}
				organizerName={
					selectedEvent
						? getOrganizerName(selectedEvent.organizer_id)
						: currentUserOrganizer?.name || ''
				}
				isOwnOrganizer={
					selectedEvent !== null &&
					organizerId !== undefined &&
					organizerId === selectedEvent.organizer_id
				}
				canManage={
					sheetMode === 'create' ||
					(selectedEvent !== null &&
						(isAdmin ||
							(organizerId !== undefined &&
								organizerId === selectedEvent.organizer_id)))
				}
				onDelete={onDelete}
			/>
		</div>
	)
}
