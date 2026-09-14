'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Globe2, MapPin, Pencil } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateOrganizer } from '@/client'
import type { Organizer, UpdateOrganizerRequest } from '@/client/types.gen'
import { Instagram } from '@/components/icons/instagram-icon'
import { Linkedin } from '@/components/icons/linkedin-icon'
import { OrganizerForm } from '@/components/organizer-form'
import { OrganizerKindBadge } from '@/components/organizer-kind-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet'
import { formatInCampusTimeZone } from '@/lib/date-time'
import { cn } from '@/lib/utils'

export type OrganizerSheetMode = 'view' | 'edit'

type Props = {
	readonly organizer: Organizer | null
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly mode: OrganizerSheetMode
	readonly onModeChange: (mode: OrganizerSheetMode) => void
	readonly canEdit?: boolean
	readonly onSaved?: (organizer: Organizer) => void
}

function DetailRow({
	label,
	children
}: {
	readonly label: string
	readonly children: ReactNode
}) {
	return (
		<div className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-3">
			<dt className="pt-0.5 text-xs font-medium text-muted-foreground">
				{label}
			</dt>
			<dd className="min-w-0 text-sm text-foreground">{children}</dd>
		</div>
	)
}

function ExternalLinkRow({
	href,
	label
}: {
	readonly href: string
	readonly label: string
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex max-w-full items-center gap-1.5 text-primary underline-offset-2 hover:underline"
		>
			<span className="truncate">{label}</span>
			<ExternalLink className="size-3.5 shrink-0" />
		</a>
	)
}

export function OrganizerDetailSheet({
	organizer,
	open,
	onOpenChange,
	mode,
	onModeChange,
	canEdit = false,
	onSaved
}: Props) {
	const qc = useQueryClient()
	const reducedMotion = useReducedMotion()
	const [saving, setSaving] = useState(false)
	const [saveArmed, setSaveArmed] = useState(false)
	const formModeFocusRef = useRef<HTMLDivElement>(null)

	const isEdit = mode === 'edit' && canEdit && organizer !== null
	const isFormMode = isEdit

	useEffect(() => {
		if (!open || !isFormMode) {
			return
		}
		const frame = window.requestAnimationFrame(() => {
			formModeFocusRef.current?.focus()
		})
		return () => window.cancelAnimationFrame(frame)
	}, [open, isFormMode])

	useEffect(() => {
		if (!open) {
			return
		}
		if (mode === 'edit' && !canEdit) {
			onModeChange('view')
		}
	}, [open, canEdit, mode, onModeChange])

	useEffect(() => {
		if (!isFormMode) {
			setSaveArmed(false)
			return
		}
		const timeoutId = window.setTimeout(() => {
			setSaveArmed(true)
		}, 0)
		return () => window.clearTimeout(timeoutId)
	}, [isFormMode])

	const saveMutation = useMutation({
		mutationFn: async (values: UpdateOrganizerRequest) => {
			if (!organizer) {
				return null
			}
			const response = await updateOrganizer({
				path: { id: organizer.id },
				body: values,
				throwOnError: true
			})
			return response.data ?? null
		},
		onSuccess: async (updated) => {
			await qc.invalidateQueries({ queryKey: ['organizers'] })
			if (organizer) {
				await qc.invalidateQueries({ queryKey: ['organizers', organizer.id] })
			}
			await qc.invalidateQueries({ queryKey: ['organizers-admin'] })
			toast.success('Organisation erfolgreich aktualisiert')
			if (updated) {
				onSaved?.(updated)
			}
			onModeChange('view')
		},
		onError: () => {
			toast.error('Organisation konnte nicht gespeichert werden')
		}
	})

	async function onSave(values: UpdateOrganizerRequest) {
		setSaving(true)
		try {
			await saveMutation.mutateAsync(values)
		} finally {
			setSaving(false)
		}
	}

	const isPending = saving || saveMutation.isPending
	const contentKey = `${mode}-${organizer?.id ?? 'none'}`
	const motionTransition = reducedMotion
		? { duration: 0 }
		: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const }
	const hasViewActions = Boolean(
		organizer &&
			(canEdit ||
				organizer.website_url ||
				organizer.instagram_url ||
				organizer.linkedin_url)
	)

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				onOpenAutoFocus={(event) => event.preventDefault()}
				className={cn(
					'flex w-full flex-col gap-0 p-0 transition-[max-width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
					isFormMode ? 'sm:max-w-2xl md:max-w-3xl' : 'sm:max-w-md md:max-w-lg'
				)}
			>
				{organizer ? (
					<>
						<SheetHeader className="gap-3 overflow-hidden border-b pr-12">
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={`header-${mode}`}
									initial={reducedMotion ? false : { opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={reducedMotion ? undefined : { opacity: 0 }}
									transition={motionTransition}
									className="space-y-3"
								>
									{isEdit ? (
										<>
											<SheetTitle className="text-left leading-snug">
												Organisation bearbeiten
											</SheetTitle>
											<SheetDescription className="text-left">
												Aktualisiere Profil, Beschreibungen und Links.
											</SheetDescription>
										</>
									) : (
										<div className="flex items-start gap-3">
											<Avatar className="size-11 shrink-0">
												<AvatarFallback className="bg-gradient-to-br from-primary/90 to-primary text-lg font-semibold text-primary-foreground">
													{organizer.name.charAt(0).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 space-y-2">
												<SheetTitle className="text-left leading-snug">
													{organizer.name}
												</SheetTitle>
												<SheetDescription className="sr-only">
													Organisationsdetails
												</SheetDescription>
												<div className="flex flex-wrap items-center gap-2">
													<OrganizerKindBadge
														kind={organizer.organizer_kind}
														showIcon
													/>
													{organizer.non_profit ? (
														<span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium">
															Gemeinnützig
														</span>
													) : null}
												</div>
											</div>
										</div>
									)}
								</motion.div>
							</AnimatePresence>
						</SheetHeader>

						<div className="relative flex-1 overflow-x-hidden overflow-y-auto">
							{isFormMode ? (
								<div
									ref={formModeFocusRef}
									tabIndex={-1}
									className="sr-only outline-none"
								/>
							) : null}

							<div className="px-4 py-4">
								<AnimatePresence mode="wait" initial={false}>
									<motion.div
										key={contentKey}
										initial={reducedMotion ? false : { opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={reducedMotion ? undefined : { opacity: 0 }}
										transition={motionTransition}
									>
										{isFormMode ? (
											<OrganizerForm
												key={contentKey}
												formId="organizer-sheet-form"
												hideSubmitButton
												organizer={organizer}
												onSave={onSave}
												isLoading={isPending}
											/>
										) : (
											<dl className="space-y-4">
												{organizer.description_de ? (
													<DetailRow label="Beschreibung">
														<p className="whitespace-pre-wrap leading-relaxed">
															{organizer.description_de}
														</p>
													</DetailRow>
												) : null}
												{organizer.description_en ? (
													<DetailRow label="Beschreibung (EN)">
														<p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
															{organizer.description_en}
														</p>
													</DetailRow>
												) : null}
												{!organizer.description_de &&
												!organizer.description_en ? (
													<DetailRow label="Beschreibung">
														<span className="text-muted-foreground">
															Keine Beschreibung verfügbar
														</span>
													</DetailRow>
												) : null}

												{organizer.location ? (
													<DetailRow label="Standort">
														<span className="inline-flex items-center gap-1.5">
															<MapPin className="size-3.5 shrink-0 text-muted-foreground" />
															{organizer.location}
														</span>
													</DetailRow>
												) : null}

												<DetailRow label="Website">
													{organizer.website_url ? (
														<ExternalLinkRow
															href={organizer.website_url}
															label={organizer.website_url}
														/>
													) : (
														<span className="text-muted-foreground">–</span>
													)}
												</DetailRow>
												<DetailRow label="Instagram">
													{organizer.instagram_url ? (
														<span className="inline-flex max-w-full items-center gap-1.5">
															<Instagram className="size-3.5 shrink-0" />
															<ExternalLinkRow
																href={organizer.instagram_url}
																label={organizer.instagram_url}
															/>
														</span>
													) : (
														<span className="text-muted-foreground">–</span>
													)}
												</DetailRow>
												<DetailRow label="LinkedIn">
													{organizer.linkedin_url ? (
														<span className="inline-flex max-w-full items-center gap-1.5">
															<Linkedin className="size-3.5 shrink-0" />
															<ExternalLinkRow
																href={organizer.linkedin_url}
																label={organizer.linkedin_url}
															/>
														</span>
													) : (
														<span className="text-muted-foreground">–</span>
													)}
												</DetailRow>

												<DetailRow label="Register">
													{organizer.registration_number || (
														<span className="text-muted-foreground">–</span>
													)}
												</DetailRow>

												<DetailRow label="Aktualisiert">
													<span className="tabular-nums text-muted-foreground">
														{formatInCampusTimeZone(
															new Date(organizer.updated_at),
															'dd.MM.yyyy HH:mm'
														)}
													</span>
												</DetailRow>
											</dl>
										)}
									</motion.div>
								</AnimatePresence>
							</div>
						</div>

						{!isFormMode && hasViewActions ? (
							<SheetFooter className="gap-3 border-t sm:flex-col sm:space-x-0">
								{canEdit ? (
									<Button
										type="button"
										className="w-full"
										onClick={() => onModeChange('edit')}
									>
										<Pencil className="size-3.5" />
										Bearbeiten
									</Button>
								) : null}
								<div className="flex w-full flex-wrap gap-2">
									{organizer.website_url ? (
										<Button asChild variant="outline" size="sm">
											<a
												href={organizer.website_url}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Globe2 className="size-3.5" />
												Website
											</a>
										</Button>
									) : null}
									{organizer.instagram_url ? (
										<Button asChild variant="outline" size="sm">
											<a
												href={organizer.instagram_url}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Instagram className="size-3.5" />
												Instagram
											</a>
										</Button>
									) : null}
									{organizer.linkedin_url ? (
										<Button asChild variant="outline" size="sm">
											<a
												href={organizer.linkedin_url}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Linkedin className="size-3.5" />
												LinkedIn
											</a>
										</Button>
									) : null}
								</div>
							</SheetFooter>
						) : null}

						{isFormMode ? (
							<SheetFooter className="flex-row gap-2 border-t sm:justify-between">
								<Button
									type="button"
									variant="outline"
									disabled={isPending}
									onClick={() => onModeChange('view')}
								>
									Zurück zur Ansicht
								</Button>
								<Button
									type="button"
									disabled={!saveArmed || isPending}
									onClick={() => {
										const form = document.getElementById('organizer-sheet-form')
										if (form instanceof HTMLFormElement) {
											form.requestSubmit()
										}
									}}
								>
									{isPending ? 'Speichern...' : 'Organisation aktualisieren'}
								</Button>
							</SheetFooter>
						) : null}
					</>
				) : null}
			</SheetContent>
		</Sheet>
	)
}
