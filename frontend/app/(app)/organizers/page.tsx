'use client'

import { useQuery } from '@tanstack/react-query'
import {
	AlertTriangle,
	ChevronRight,
	ExternalLink,
	Globe2,
	MapPin,
	Pencil,
	User2Icon,
	UsersIcon
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { listOrganizers } from '@/client'
import type { Organizer } from '@/client/types.gen'
import { Instagram } from '@/components/icons/instagram-icon'
import { Linkedin } from '@/components/icons/linkedin-icon'
import {
	OrganizerDetailSheet,
	type OrganizerSheetMode
} from '@/components/organizer-detail-sheet'
import { OrganizerKindBadge } from '@/components/organizer-kind-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { me } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ORGANIZER_SKELETON_KEYS = Array.from(
	{ length: 6 },
	(_, idx) => `organizer-skeleton-${idx}`
)

function LinkChip({
	href,
	icon,
	label,
	emptyLabel
}: {
	readonly href?: string | null
	readonly icon: ReactNode
	readonly label: string
	readonly emptyLabel: string
}) {
	if (href) {
		return (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				onClick={(event) => event.stopPropagation()}
				className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
			>
				{icon}
				{label}
				<ExternalLink className="size-3 text-muted-foreground" />
			</a>
		)
	}

	return (
		<span className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground">
			{icon}
			{emptyLabel}
		</span>
	)
}

function OrganizersPageContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
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
	const [selected, setSelected] = useState<Organizer | null>(null)
	const [sheetMode, setSheetMode] = useState<OrganizerSheetMode>('view')
	const [sheetOpen, setSheetOpen] = useState(false)

	const currentUserOrganizer = organizers.find((o) => o.id === organizerId)
	const otherOrganizers = organizers.filter((o) => o.id !== organizerId)

	const isProfileIncomplete =
		currentUserOrganizer &&
		((!currentUserOrganizer.description_de &&
			!currentUserOrganizer.description_en) ||
			!currentUserOrganizer.website_url)

	const canManageOrganizer = useCallback(
		(organizer: Organizer) =>
			isAdmin || (organizerId !== undefined && organizer.id === organizerId),
		[isAdmin, organizerId]
	)

	const openOrganizer = useCallback(
		(organizer: Organizer, mode: OrganizerSheetMode = 'view') => {
			setSelected(organizer)
			setSheetMode(
				mode === 'edit' && canManageOrganizer(organizer) ? 'edit' : 'view'
			)
			setSheetOpen(true)
		},
		[canManageOrganizer]
	)

	const clearEditQuery = useCallback(() => {
		if (!searchParams.get('edit')) {
			return
		}
		router.replace('/organizers', { scroll: false })
	}, [router, searchParams])

	useEffect(() => {
		const editParam = searchParams.get('edit')
		if (!editParam) {
			return
		}
		const editId = Number(editParam)
		if (!Number.isFinite(editId) || organizers.length === 0) {
			return
		}
		const target = organizers.find((organizer) => organizer.id === editId)
		if (!target) {
			clearEditQuery()
			return
		}
		openOrganizer(target, canManageOrganizer(target) ? 'edit' : 'view')
		clearEditQuery()
	}, [
		searchParams,
		organizers,
		openOrganizer,
		canManageOrganizer,
		clearEditQuery
	])

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Organisationen</h1>
				</div>
			</header>

			<div className="mb-12 flex-1 space-y-8 p-4 pt-6 md:p-8">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Organisationen</h2>
					<p className="mt-1 text-muted-foreground">
						Dein Profil und weitere Organisationen am Campus
					</p>
				</div>

				{isLoading ? (
					<div className="space-y-8">
						<div className="space-y-4">
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-56 w-full rounded-lg" />
						</div>
						<div className="space-y-4">
							<Skeleton className="h-6 w-56" />
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{ORGANIZER_SKELETON_KEYS.map((key) => (
									<Skeleton key={key} className="h-36 w-full rounded-lg" />
								))}
							</div>
						</div>
					</div>
				) : error ? (
					<p className="text-destructive">
						Fehler beim Laden der Organisationen
					</p>
				) : (
					<>
						{currentUserOrganizer ? (
							<section className="space-y-4">
								<div className="flex items-center gap-3">
									<span className="flex size-8 items-center justify-center rounded-lg border bg-muted/60">
										<User2Icon className="size-4" />
									</span>
									<div>
										<h3 className="text-lg font-semibold">
											Deine Organisation
										</h3>
										<p className="text-sm text-muted-foreground">
											Verwalte Angaben, Links und Sichtbarkeit deines Profils
										</p>
									</div>
								</div>

								{isProfileIncomplete ? (
									<Alert className="border-amber-500/40 bg-amber-500/10 text-foreground [&>svg]:text-amber-700 dark:[&>svg]:text-amber-400">
										<AlertTriangle />
										<AlertTitle>
											Organisationsprofil vervollständigen
										</AlertTitle>
										<AlertDescription>
											Beschreibung oder Website fehlen noch. Ergänze die Angaben
											über Bearbeiten, damit andere euch besser finden.
										</AlertDescription>
									</Alert>
								) : null}

								<div className="flex flex-col gap-5 rounded-lg border bg-card p-5 sm:p-6">
									<div className="flex flex-wrap items-center justify-between gap-4">
										<div className="flex min-w-0 items-center gap-3">
											<Avatar className="size-12 shrink-0">
												<AvatarFallback className="bg-gradient-to-br from-primary/90 to-primary text-lg font-semibold text-primary-foreground">
													{currentUserOrganizer.name.charAt(0).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 space-y-2">
												<h4 className="text-xl font-semibold tracking-tight leading-snug">
													{currentUserOrganizer.name}
												</h4>
												<div className="flex flex-wrap items-center gap-2">
													<OrganizerKindBadge
														kind={currentUserOrganizer.organizer_kind}
														showIcon
													/>
													{currentUserOrganizer.non_profit ? (
														<span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium">
															Gemeinnützig
														</span>
													) : null}
												</div>
											</div>
										</div>
										<Button
											type="button"
											size="sm"
											onClick={() =>
												openOrganizer(currentUserOrganizer, 'edit')
											}
										>
											<Pencil className="size-3.5" />
											Bearbeiten
										</Button>
									</div>

									<p className="text-sm leading-relaxed text-muted-foreground">
										{currentUserOrganizer.description_de ||
											currentUserOrganizer.description_en ||
											'Noch keine Beschreibung hinterlegt.'}
									</p>

									{currentUserOrganizer.location ? (
										<p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
											<MapPin className="size-3.5 shrink-0" />
											{currentUserOrganizer.location}
										</p>
									) : null}

									<div className="flex flex-wrap gap-2">
										<LinkChip
											href={currentUserOrganizer.website_url}
											icon={<Globe2 className="size-3.5" />}
											label="Website"
											emptyLabel="Keine Website"
										/>
										<LinkChip
											href={currentUserOrganizer.instagram_url}
											icon={<Instagram className="size-3.5" />}
											label="Instagram"
											emptyLabel="Kein Instagram"
										/>
										<LinkChip
											href={currentUserOrganizer.linkedin_url}
											icon={<Linkedin className="size-3.5" />}
											label="LinkedIn"
											emptyLabel="Kein LinkedIn"
										/>
									</div>

									<div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Registrierungsnummer
											</p>
											<p>
												{currentUserOrganizer.registration_number ||
													'Keine Angabe'}
											</p>
										</div>
										<div className="space-y-1">
											<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
												Gemeinnützig
											</p>
											<p>{currentUserOrganizer.non_profit ? 'Ja' : 'Nein'}</p>
										</div>
									</div>
								</div>
							</section>
						) : null}

						<section className="space-y-4">
							<div className="flex flex-wrap items-end justify-between gap-3">
								<div className="flex items-center gap-3">
									<span className="flex size-8 items-center justify-center rounded-lg border bg-muted/60">
										<UsersIcon className="size-4" />
									</span>
									<div>
										<h3 className="text-lg font-semibold">
											{isAdmin
												? 'Alle Organisationen'
												: 'Weitere Organisationen'}
										</h3>
										<p className="text-sm text-muted-foreground">
											{isAdmin ? (
												<>
													Verwende die{' '}
													<Link
														href="/organizers/manage"
														className="text-primary underline-offset-2 hover:underline"
													>
														Admin-Seite
													</Link>
													, um Organisationen zu verwalten.
												</>
											) : (
												'Entdecke weitere Organisationen am Campus'
											)}
										</p>
									</div>
								</div>
							</div>

							{otherOrganizers.length === 0 ? (
								<div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
									<UsersIcon className="mb-3 size-10 text-muted-foreground" />
									<p className="text-sm font-medium">
										Keine weiteren Organisationen
									</p>
									<p className="mt-1 max-w-sm text-sm text-muted-foreground">
										Sobald weitere Organisationen freigeschaltet sind,
										erscheinen sie hier.
									</p>
								</div>
							) : (
								<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{otherOrganizers.map((organizer) => (
										<li key={organizer.id}>
											<button
												type="button"
												onClick={() => openOrganizer(organizer, 'view')}
												className={cn(
													'flex h-full w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left',
													'transition-colors hover:bg-muted/50',
													'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
												)}
											>
												<div className="flex items-center gap-3">
													<Avatar className="size-8 shrink-0">
														<AvatarFallback className="bg-gradient-to-br from-primary/90 to-primary text-sm font-semibold text-primary-foreground">
															{organizer.name.charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="flex min-w-0 flex-1 items-center justify-between gap-2">
														<p className="line-clamp-2 text-sm font-medium leading-snug">
															{organizer.name}
														</p>
														<ChevronRight
															className="size-4 shrink-0 text-muted-foreground"
															aria-hidden
														/>
													</div>
												</div>
												<p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
													{organizer.description_de ||
														organizer.description_en ||
														'Keine Beschreibung verfügbar'}
												</p>
												{organizer.location ? (
													<p className="mt-auto inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
														<MapPin className="size-3 shrink-0" />
														<span className="truncate">
															{organizer.location}
														</span>
													</p>
												) : (
													<p className="mt-auto text-xs text-muted-foreground">
														Details anzeigen
													</p>
												)}
											</button>
										</li>
									))}
								</ul>
							)}
						</section>
					</>
				)}

				<OrganizerDetailSheet
					organizer={selected}
					open={sheetOpen}
					onOpenChange={(open) => {
						setSheetOpen(open)
						if (!open) {
							setSelected(null)
							setSheetMode('view')
							clearEditQuery()
						}
					}}
					mode={sheetMode}
					onModeChange={setSheetMode}
					canEdit={selected !== null && canManageOrganizer(selected)}
					onSaved={(updated) => setSelected(updated)}
				/>
			</div>
		</div>
	)
}

export default function OrganizersPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen flex-col">
					<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4">
						<SidebarTrigger className="-ml-1" />
						<div className="flex items-center gap-2">
							<h1 className="text-lg font-semibold">Organisationen</h1>
						</div>
					</header>
					<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-56 w-full rounded-lg" />
					</div>
				</div>
			}
		>
			<OrganizersPageContent />
		</Suspense>
	)
}
