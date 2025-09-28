'use client'

import { useQuery } from '@tanstack/react-query'
import {
	AlertTriangle,
	Instagram,
	Linkedin,
	Pencil,
	User2Icon,
	UsersIcon
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { listOrganizers } from '@/client'
import type { Organizer } from '@/client/types.gen'
import { OrganizerViewDialog } from '@/components/organizer-view-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

const ORGANIZER_SKELETON_KEYS = Array.from(
	{ length: 3 },
	(_, idx) => `organizer-skeleton-${idx}`
)

export default function OrganizersPage() {
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const organizerId = meData?.organizer_id ?? undefined
	const isAdmin = meData?.account_type === 'ADMIN'
	const {
		data: organizers = [],
		isLoading,
		error
	} = useQuery<Organizer[]>({
		queryKey: ['organizers'],
		queryFn: async () => {
			const response = await listOrganizers({ throwOnError: true })
			return response.data ?? []
		}
	})
	const [viewing, setViewing] = useState<Organizer | null>(null)

	// Get current user's organizer profile
	const currentUserOrganizer = organizers.find((o) => o.id === organizerId)

	// Check if organizer profile is incomplete (same logic as dashboard)
	const isProfileIncomplete =
		currentUserOrganizer &&
		((!currentUserOrganizer.description_de &&
			!currentUserOrganizer.description_en) ||
			!currentUserOrganizer.website_url)

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
					<h1 className="text-lg font-semibold">Vereine</h1>
				</div>
			</header>

			<div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
				{isLoading ? (
					<div className="space-y-2">
						{ORGANIZER_SKELETON_KEYS.map((key) => (
							<div key={key} className="h-16 bg-muted animate-pulse rounded" />
						))}
					</div>
				) : error ? (
					<p className="text-destructive">Fehler beim Laden der Vereine</p>
				) : (
					<div className="space-y-14	">
						{/* Your organizer first with edit only */}
						{organizers.find((o) => o.id === organizerId) && (
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
										<User2Icon className="h-6 w-6" />
									</div>
									<div>
										<h2 className="text-xl font-bold">Dein Verein</h2>
										<p className="text-sm text-muted-foreground">
											Verwalte deine Vereinsinformationen
										</p>
									</div>
								</div>

								{organizers
									.filter((o) => o.id === organizerId)
									.map((o) => (
										<Card
											key={o.id}
											className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
										>
											<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
											<CardHeader className="relative">
												<div className="flex flex-row items-start justify-between gap-4">
													<div className="flex-1 space-y-2">
														<CardTitle className="text-xl flex items-center gap-3">
															<Avatar className="h-10 w-10">
																<AvatarFallback className=" from-primary/90 to-primary bg-gradient-to-br text-primary-foreground font-semibold text-lg">
																	{o.name.charAt(0).toUpperCase()}
																</AvatarFallback>
															</Avatar>
															{o.name}
														</CardTitle>
													</div>
													<div className="flex gap-2">
														<Link href={`/organizers/${o.id}`}>
															<Button size="sm" variant="outline">
																<Pencil className="h-4 w-4 mr-2" />
																Bearbeiten
															</Button>
														</Link>
													</div>
												</div>
											</CardHeader>
											<CardContent className="space-y-4 relative">
												{isProfileIncomplete && (
													<div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-amber-800 dark:bg-amber-950">
														<div className="flex items-start gap-3">
															<AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
															<div className="flex-1">
																<h3 className="text-sm font-medium text-orange-800 dark:text-orange-200">
																	Vereinsprofil vervollständigen
																</h3>
																<p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
																	Tippe auf Bearbeiten und aktualisiere deine
																	Informationen.
																</p>
															</div>
														</div>
													</div>
												)}

												<div className="space-y-3">
													<div>
														<h4 className="text-sm font-medium text-foreground mb-2">
															Beschreibung
														</h4>
														<p className="text-sm text-muted-foreground leading-relaxed">
															{o.description_de ||
																o.description_en ||
																'Keine Beschreibung verfügbar.'}
														</p>
													</div>

													<div>
														<h4 className="text-sm font-medium text-foreground mb-2">
															Links & Kontakt
														</h4>
														<div className="flex flex-wrap gap-4">
															{o.website_url ? (
																<a
																	href={o.website_url}
																	target="_blank"
																	rel="noreferrer"
																	className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors"
																>
																	<svg
																		className="h-4 w-4"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																		aria-label="External link icon"
																	>
																		<title>External link icon</title>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
																		/>
																	</svg>
																	Website
																</a>
															) : (
																<div className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground">
																	<svg
																		className="h-4 w-4"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																		aria-label="External link icon"
																	>
																		<title>External link icon</title>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
																		/>
																	</svg>
																	Keine Website
																</div>
															)}
															{o.instagram_url ? (
																<a
																	href={o.instagram_url}
																	target="_blank"
																	rel="noreferrer"
																	className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-pink-600 hover:bg-pink-50 transition-colors"
																>
																	<Instagram className="h-4 w-4" />
																	Instagram
																</a>
															) : (
																<div className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground">
																	<Instagram className="h-4 w-4" />
																	Kein Instagram
																</div>
															)}
															{o.linkedin_url ? (
																<a
																	href={o.linkedin_url}
																	target="_blank"
																	rel="noreferrer"
																	className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-sky-600 hover:bg-sky-50 transition-colors"
																>
																	<Linkedin className="h-4 w-4" />
																	LinkedIn
																</a>
															) : (
																<div className="inline-flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground">
																	<Linkedin className="h-4 w-4" />
																	Kein LinkedIn
																</div>
															)}
														</div>
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
															<div className="space-y-1">
																<p className="font-medium text-foreground">
																	Registrierungsnummer
																</p>
																<p className="text-muted-foreground">
																	{o.registration_number || 'Keine Angabe'}
																</p>
															</div>
															<div className="space-y-1">
																<p className="font-medium text-foreground">
																	Gemeinnützig
																</p>
																<p className="text-muted-foreground">
																	{o.non_profit ? 'Ja' : 'Nein'}
																</p>
															</div>
														</div>
													</div>
												</div>
											</CardContent>
										</Card>
									))}
							</div>
						)}

						{/* Other organizers as clickable cards for details */}
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
									<UsersIcon className="h-6 w-6" />
								</div>
								{isAdmin ? (
									<div>
										<h2 className="text-xl font-bold">Alle Vereine</h2>
										<p className="text-sm text-muted-foreground">
											Verwende die{' '}
											<Link
												href="/organizers/manage"
												className="text-primary hover:underline"
											>
												Admin-Seite
											</Link>{' '}
											um alle Vereine zu verwalten.
										</p>
									</div>
								) : (
									<div>
										<h2 className="text-xl font-bold">Andere Vereine</h2>
										<p className="text-sm text-muted-foreground">
											Entdecke andere Vereine und Organisationen
										</p>
									</div>
								)}
							</div>

							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{organizers
									.filter((o) => o.id !== organizerId)
									.map((o) => (
										<Card
											key={o.id}
											className="cursor-pointer group relative overflow-hidden transition-all duration-300 hover:shadow-lg"
											onClick={() => setViewing(o)}
										>
											<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
											<CardHeader className="pb-3 relative">
												<div className="flex items-center gap-3">
													<Avatar className="h-10 w-10 flex-shrink-0">
														<AvatarFallback className=" from-primary/90 to-primary bg-gradient-to-br text-primary-foreground font-semibold text-lg">
															{o.name.charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="flex-1 min-w-0">
														<CardTitle className="text-lg leading-tight">
															{o.name}
														</CardTitle>
													</div>
												</div>
											</CardHeader>
											<CardContent className="space-y-3 relative">
												<p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
													{o.description_de ||
														o.description_en ||
														'Keine Beschreibung verfügbar'}
												</p>

												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<span>Klicken für Details</span>
												</div>
											</CardContent>
										</Card>
									))}
							</div>
						</div>
					</div>
				)}
				<OrganizerViewDialog
					open={!!viewing}
					onOpenChange={(o) => !o && setViewing(null)}
					organizer={viewing}
				/>
			</div>
		</div>
	)
}
