'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
	Activity,
	AlertTriangle,
	BarChart3,
	Calendar,
	Clock,
	Plus,
	TrendingUp,
	Users
} from 'lucide-react'
import Link from 'next/link'
import { listEvents, listOrganizers } from '@/client'
import type {
	Event as ApiEvent,
	Organizer as ApiOrganizer
} from '@/client/types.gen'
import { ExternalLink } from '@/components/animate-ui/icons/external-link'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import QuickActions from '@/components/quick-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger
} from '@/components/ui/hover-card'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { me } from '@/lib/auth'

export default function Dashboard() {
	const { data: user } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const { data: events = [], isLoading: eventsLoading } = useQuery<ApiEvent[]>({
		queryKey: ['events'],
		queryFn: async () => {
			const response = await listEvents({ throwOnError: true })
			return response.data ?? []
		}
	})
	const { data: organizers = [] } = useQuery<ApiOrganizer[]>({
		queryKey: ['organizers'],
		queryFn: async () => {
			const response = await listOrganizers({ throwOnError: true })
			return response.data ?? []
		}
	})

	const now = new Date()
	const allEvents = events
	const organizerList = organizers
	const isAdmin = user?.account_type === 'ADMIN'

	// Get current user's organizer profile
	const currentUserOrganizer = organizerList.find(
		(o) => o.id === user?.organizer_id
	)

	// Check if organizer profile is incomplete
	const isProfileIncomplete =
		currentUserOrganizer &&
		((!currentUserOrganizer.description_de &&
			!currentUserOrganizer.description_en) ||
			!currentUserOrganizer.website_url)

	// Get user's events
	const userEvents = allEvents.filter(
		(e) => e.organizer_id === user?.organizer_id
	)
	const userUpcomingEvents = userEvents.filter(
		(e) => new Date(e.start_date_time) > now
	)
	const userPublishedEvents = userEvents.filter((e) => e.publish_app)

	// Quick actions moved to dedicated component

	const stats = [
		{
			title: 'Deine Events',
			value: userEvents.length || 0,
			icon: Calendar,
			description: 'Events, die du erstellt hast',
			color: 'text-blue-600',
			gradient: 'from-blue-500/10 to-cyan-500/10'
		},
		{
			title: 'Anstehende Events',
			value: userUpcomingEvents.length,
			icon: Clock,
			description: 'Events, die du erstellt hast und die bevorstehen',
			color: 'text-green-600',
			gradient: 'from-green-500/10 to-emerald-500/10'
		},
		{
			title: 'Veröffentlicht',
			value: userPublishedEvents.length,
			icon: TrendingUp,
			description: 'In der App live',
			color: 'text-purple-600',
			gradient: 'from-purple-500/10 to-pink-500/10'
		},
		{
			title: 'Alle Vereine',
			value: organizerList.length,
			icon: Users,
			description: 'Alle Vereine',
			color: 'text-orange-600',
			gradient: 'from-orange-500/10 to-yellow-500/10'
		}
	]

	return (
		<div className="flex flex-col min-h-screen">
			<header
				className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4"
				style={{
					backdropFilter: 'blur(8px)',
					WebkitBackdropFilter: 'blur(8px)'
				}}
			>
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Dashboard</h1>
				</div>
			</header>

			<div className="flex-1 space-y-8 p-4 md:p-8 pt-6 mb-12">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">
							{user ? `Willkommen zurück, ${user.display_name}` : 'Willkommen'}
						</h2>
						<p className="text-muted-foreground mt-1">
							Verwalte deine Events und dein Vereinsprofil
						</p>
					</div>
				</div>

				{isProfileIncomplete && (
					<div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-amber-800 dark:bg-amber-950">
						<div className="flex items-start gap-3">
							<AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
							<div className="flex-1">
								<h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
									Vereinsprofil vervollständigen
								</h3>
								<p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
									Dein Verein ist noch nicht vollständig. Bitte fülle alle
									Felder aus, um dein Profil zu vervollständigen.
								</p>
								<div className="mt-3">
									<Link href="/organizers">
										<Button size="sm">
											<ExternalLink className="h-3 w-3 mr-1" />
											Bearbeiten
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Quick Actions */}
				<div className="space-y-3">
					<h3 className="text-lg font-semibold">Schnellaktionen</h3>
					<QuickActions userEventsCount={userEvents.length} isAdmin={isAdmin} />
				</div>

				{isAdmin ? (
					<div>
						<h3 className="text-lg font-semibold">Admin-Übersicht</h3>
						<p className="text-muted-foreground mt-1">
							Als Admin kannst du alle Events und Vereine verwalten, alle
							Änderungen im System nachvollziehen und neue Vereine einladen.
						</p>
					</div>
				) : (
					<>
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-semibold">Übersicht</h3>
								<Badge variant="secondary" className="ml-auto">
									<Activity className="h-3 w-3 mr-1" />
									Aktivitäten
								</Badge>
							</div>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								{stats.map((stat, _index) => (
									<Card
										key={stat.title}
										className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
									>
										<div
											className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
										/>
										<div className="relative">
											<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
												<CardTitle className="text-sm font-medium">
													{stat.title}
												</CardTitle>
												<stat.icon className={`h-4 w-4`} />
											</CardHeader>
											<CardContent>
												<div className="flex items-center">
													<div className={`text-2xl font-bold ${stat.color}`}>
														{stat.value}
													</div>
												</div>
												<div className="space-y-2">
													<p className="text-xs text-muted-foreground">
														{stat.description}
													</p>
												</div>
											</CardContent>
										</div>
									</Card>
								))}
							</div>
						</div>

						<Separator className="my-6" />

						{/* Your Events */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
							<Card className="col-span-4 group relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300">
								<div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								<CardHeader className="relative">
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="flex items-center gap-2">
												<Calendar className="h-5 w-5 text-primary" />
												Deine anstehenden Events
											</CardTitle>
											<CardDescription>
												Events, die du erstellt hast und die bevorstehen
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="relative">
									{eventsLoading ? (
										<div className="space-y-3">
											{Array.from({ length: 3 }, (_, i) => (
												<div
													key={`upcoming-skeleton-${Date.now()}-${i}`}
													className="space-y-2"
												>
													<Skeleton className="h-4 w-3/4" />
													<Skeleton className="h-3 w-1/2" />
												</div>
											))}
										</div>
									) : userUpcomingEvents.length === 0 ? (
										<div className="text-center py-8">
											<Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
											<p className="text-muted-foreground mb-4">
												Keine anstehenden Events
											</p>
											<Link href="/events/new">
												<Button size="sm">
													<Plus className="h-4 w-4 mr-2" />
													Erstelle dein erstes Event
												</Button>
											</Link>
										</div>
									) : (
										<div className="space-y-3">
											{userUpcomingEvents.slice(0, 5).map((event) => (
												<HoverCard key={event.id}>
													<HoverCardTrigger asChild>
														<div className="flex items-center justify-between p-3 rounded-lg border hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200 hover:shadow-sm cursor-pointer">
															<div className="space-y-1">
																<div className="flex items-center gap-2">
																	<p className="text-sm font-medium leading-none">
																		{event.title_de}
																	</p>
																	{event.publish_app && (
																		<Badge
																			variant="secondary"
																			className="text-xs"
																		>
																			<TrendingUp className="h-3 w-3 mr-1" />
																			Live
																		</Badge>
																	)}
																</div>
																<p className="text-sm text-muted-foreground">
																	{format(
																		new Date(event.start_date_time),
																		'PPpp'
																	)}
																</p>
															</div>
															<div className="flex items-center gap-2">
																<Link href={`/events/${event.id}`}>
																	<AnimateIcon animateOnHover>
																		<Button size="sm" variant="ghost">
																			<ExternalLink className="h-3 w-3" />
																		</Button>
																	</AnimateIcon>
																</Link>
															</div>
														</div>
													</HoverCardTrigger>
													<HoverCardContent className="w-80">
														<div className="space-y-2">
															<h4 className="font-semibold text-sm">
																{event.title_de}
															</h4>
															<p className="text-xs text-muted-foreground">
																{event.title_en
																	? event.title_en
																	: 'No English title'}
															</p>
															<div className="flex items-center gap-2">
																<Clock className="h-3 w-3 text-muted-foreground" />
																<span className="text-xs">
																	{format(
																		new Date(event.start_date_time),
																		'PPpp'
																	)}
																</span>
															</div>
															{event.publish_app && (
																<div className="flex items-center gap-1 mt-2">
																	<TrendingUp className="h-3 w-3 text-green-600" />
																	<span className="text-xs text-green-600 font-medium">
																		Veröffentlicht und live
																	</span>
																</div>
															)}
														</div>
													</HoverCardContent>
												</HoverCard>
											))}
										</div>
									)}
								</CardContent>
							</Card>

							<Card className="col-span-3 group relative overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-300">
								<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
								<CardHeader className="relative">
									<div className="flex items-center justify-between">
										<div>
											<CardTitle className="flex items-center gap-2">
												<Activity className="h-5 w-5 text-primary" />
												Aktivitäten
											</CardTitle>
											<CardDescription>
												Deine letzten Events und Updates
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="relative">
									{eventsLoading ? (
										<div className="space-y-3">
											{Array.from({ length: 3 }, (_, i) => (
												<div
													key={`recent-skeleton-${Date.now()}-${i}`}
													className="space-y-2"
												>
													<Skeleton className="h-3 w-full" />
													<Skeleton className="h-2 w-1/3" />
												</div>
											))}
										</div>
									) : userEvents.length === 0 ? (
										<div className="text-center py-6">
											<BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
											<p className="text-sm text-muted-foreground">
												Noch keine Events
											</p>
										</div>
									) : (
										<div className="space-y-3">
											{userEvents.slice(0, 4).map((event) => (
												<div
													key={event.id}
													className="flex items-center justify-between p-2 rounded border hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors duration-200"
												>
													<div className="space-y-1">
														<p className="text-sm font-medium leading-none line-clamp-1">
															{event.title_de}
														</p>
														<p className="text-xs text-muted-foreground">
															{format(
																new Date(event.start_date_time),
																'MMM d, yyyy'
															)}
														</p>
													</div>
													{event.publish_app && (
														<Badge variant="outline" className="text-xs">
															Live
														</Badge>
													)}
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</>
				)}
			</div>
		</div>
	)
}
