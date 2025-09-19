'use client'

import { useQuery } from '@tanstack/react-query'
import {
	AlertTriangle,
	Instagram,
	Pencil,
	Settings,
	User2Icon,
	UsersIcon
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { listOrganizers } from '@/client'
import type { Organizer } from '@/client/types.gen'
import { OrganizerViewDialog } from '@/components/organizer-view-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

export default function OrganizersPage() {
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const userId = meData?.id as number | undefined
	const isSuperUser = meData?.super_user ?? false
	const { data, isLoading, error } = useQuery({
		queryKey: ['organizers'],
		queryFn: () => listOrganizers()
	})
	const organizers: Organizer[] = (data?.data ?? []) as Organizer[]
	const [viewing, setViewing] = useState<Organizer | null>(null)

	// Get current user's organizer profile
	const currentUserOrganizer = organizers.find((o) => o.id === userId)

	// Check if organizer profile is incomplete (same logic as dashboard)
	const isProfileIncomplete =
		currentUserOrganizer &&
		((!currentUserOrganizer.description_de &&
			!currentUserOrganizer.description_en) ||
			!currentUserOrganizer.website_url)

	return (
		<div className="flex flex-col min-h-screen">
			<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Vereine</h1>
				</div>
			</header>

			<div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
				{isSuperUser && (
					<div className="flex justify-end mb-6">
						<Link href="/organizers/manage">
							<Button size="sm" className="flex items-center gap-2">
								<Settings className="h-4 w-4" />
								Vereine verwalten
							</Button>
						</Link>
					</div>
				)}
				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 3 }).map((_, idx) => (
							<div
								key={`org-skeleton-${Date.now()}-${idx}`}
								className="h-16 bg-muted animate-pulse rounded"
							/>
						))}
					</div>
				) : error ? (
					<p className="text-destructive">Fehler beim Laden der Vereine</p>
				) : (
					<div className="space-y-14	">
						{/* Your organizer first with edit only */}
						{organizers.find((o) => o.id === userId) && (
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
										<User2Icon className="h-6 w-6" />
									</div>
									<div>
										<h2 className="text-xl font-semibold">Dein Verein</h2>
										<p className="text-sm text-muted-foreground">
											Verwalte deine Vereinsinformationen
										</p>
									</div>
								</div>

								{organizers
									.filter((o) => o.id === userId)
									.map((o) => (
										<Card key={o.id}>
											<CardHeader>
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
											<CardContent className="space-y-4">
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
								<div>
									<h2 className="text-xl font-semibold">Andere Vereine</h2>
									<p className="text-sm text-muted-foreground">
										Entdecke andere Vereine und Organisationen
									</p>
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{organizers
									.filter((o) => o.id !== userId)
									.map((o) => (
										<Card
											key={o.id}
											className="cursor-pointer hover:bg-muted-foreground/5"
											onClick={() => setViewing(o)}
										>
											<CardHeader className="pb-3">
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
											<CardContent className="space-y-3">
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
