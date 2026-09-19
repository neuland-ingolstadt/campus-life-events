'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink, Pencil, Share2, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createEvent, updateEvent } from '@/client'
import type {
	Event as ApiEvent,
	CreateEventRequest,
	UpdateEventRequest
} from '@/client/types.gen'
import { PartyPopper } from '@/components/animate-ui/icons/party-popper'
import { EventForm } from '@/components/event-form'
import { EventChangeHistory } from '@/components/events/event-change-history'
import {
	EventOrganizerBadge,
	EventVisibilityIndicator
} from '@/components/events/event-status-badges'
import { Button } from '@/components/ui/button'
import {
	ResponsiveSheet,
	ResponsiveSheetContent,
	ResponsiveSheetDescription,
	ResponsiveSheetFooter,
	ResponsiveSheetHeader,
	ResponsiveSheetTitle
} from '@/components/ui/responsive-sheet'
import { formatInCampusTimeZone } from '@/lib/date-time'
import { deriveEventVisibilityMode } from '@/lib/event-visibility'
import { publicEventShareUrl } from '@/lib/public-event-url'
import { cn } from '@/lib/utils'

export type EventSheetMode = 'view' | 'edit' | 'create' | 'duplicate'

type EventDetailSheetProps = {
	readonly event: ApiEvent | null
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly mode: EventSheetMode
	readonly onModeChange: (mode: EventSheetMode) => void
	readonly organizerName: string
	readonly isOwnOrganizer: boolean
	readonly canManage: boolean
	readonly onDelete: (event: ApiEvent) => void | Promise<void>
}

function DetailRow({
	label,
	children
}: {
	readonly label: string
	readonly children: ReactNode
}) {
	return (
		<div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
			<dt className="text-xs font-medium text-muted-foreground pt-0.5">
				{label}
			</dt>
			<dd className="text-sm text-foreground min-w-0">{children}</dd>
		</div>
	)
}

export function EventDetailSheet({
	event,
	open,
	onOpenChange,
	mode,
	onModeChange,
	organizerName,
	isOwnOrganizer,
	canManage,
	onDelete
}: EventDetailSheetProps) {
	const qc = useQueryClient()
	const reducedMotion = useReducedMotion()
	const [saving, setSaving] = useState(false)
	const [saveArmed, setSaveArmed] = useState(false)
	const [showSuccess, setShowSuccess] = useState(false)
	const formModeFocusRef = useRef<HTMLDivElement>(null)

	const isCreate = mode === 'create'
	const isDuplicate = mode === 'duplicate' && canManage && event !== null
	const isEdit = mode === 'edit' && canManage && event !== null
	const isFormMode = isCreate || isEdit || isDuplicate

	useEffect(() => {
		if (!open) {
			setShowSuccess(false)
		}
	}, [open])

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
		if ((mode === 'edit' || mode === 'duplicate') && !canManage) {
			onModeChange('view')
		}
	}, [open, canManage, mode, onModeChange])

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
		mutationFn: async (values: CreateEventRequest | UpdateEventRequest) => {
			if (isCreate || isDuplicate) {
				await createEvent({
					body: values as CreateEventRequest,
					throwOnError: true
				})
				return
			}
			if (!event) {
				return
			}
			await updateEvent({
				path: { id: event.id },
				body: values as UpdateEventRequest,
				throwOnError: true
			})
		},
		onSuccess: async () => {
			await qc.invalidateQueries({
				predicate: (q) => q.queryKey[0] === 'events'
			})
			if (event) {
				await qc.invalidateQueries({ queryKey: ['event', event.id] })
				await qc.invalidateQueries({
					queryKey: ['audit-logs', 'event', event.id]
				})
			}

			const celebrate = isCreate || isDuplicate
			if (celebrate && !reducedMotion) {
				setShowSuccess(true)
				await new Promise((resolve) => window.setTimeout(resolve, 900))
				setShowSuccess(false)
			}

			toast.success(
				isDuplicate
					? 'Event erfolgreich dupliziert'
					: isCreate
						? 'Event erfolgreich erstellt'
						: 'Event erfolgreich aktualisiert'
			)
			onModeChange('view')
			onOpenChange(false)
		},
		onError: () => {
			toast.error(
				isDuplicate
					? 'Event konnte nicht dupliziert werden'
					: isCreate
						? 'Event konnte nicht erstellt werden'
						: 'Event konnte nicht gespeichert werden'
			)
		}
	})

	async function onSave(values: CreateEventRequest | UpdateEventRequest) {
		setSaving(true)
		try {
			await saveMutation.mutateAsync(values)
		} finally {
			setSaving(false)
		}
	}

	const visibility = event ? deriveEventVisibilityMode(event) : null
	const hasPublicPage = Boolean(event?.publish_web && event?.publish_app)

	const shareUrl = useMemo(() => {
		if (!event || !hasPublicPage) {
			return ''
		}
		return publicEventShareUrl(event.id)
	}, [event, hasPublicPage])

	const handleShare = useCallback(() => {
		if (!shareUrl || typeof navigator === 'undefined') {
			return
		}
		void navigator.clipboard.writeText(shareUrl)
		toast.success('Öffentlicher Link wurde in die Zwischenablage kopiert.')
	}, [shareUrl])

	const hasViewActions = Boolean(event && (hasPublicPage || canManage))
	const isPending = saving || saveMutation.isPending
	const contentKey = `${mode}-${event?.id ?? 'new'}`
	const duplicateInitialValues = useMemo(
		() =>
			isDuplicate
				? {
						start_date_time: undefined as Date | undefined,
						end_date_time: undefined as Date | undefined
					}
				: undefined,
		[isDuplicate]
	)

	const motionTransition = reducedMotion
		? { duration: 0 }
		: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const }

	return (
		<ResponsiveSheet
			open={open}
			onOpenChange={onOpenChange}
			handleOnly={isFormMode}
		>
			<ResponsiveSheetContent
				side="right"
				onOpenAutoFocus={(event) => event.preventDefault()}
				className={cn(
					'flex w-full flex-col gap-0 p-0 transition-[max-width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
					isFormMode ? 'sm:max-w-2xl md:max-w-3xl' : 'sm:max-w-md md:max-w-lg'
				)}
			>
				{isCreate || event ? (
					<>
						<ResponsiveSheetHeader className="shrink-0 border-b pr-12 gap-3 overflow-hidden">
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={`header-${mode}`}
									initial={reducedMotion ? false : { opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={reducedMotion ? undefined : { opacity: 0 }}
									transition={motionTransition}
									className="space-y-3"
								>
									{isCreate ? (
										<>
											<ResponsiveSheetTitle className="text-left leading-snug">
												Neues Event
											</ResponsiveSheetTitle>
											<ResponsiveSheetDescription className="text-left">
												Fülle die Angaben aus, um dein Event zu erstellen.
											</ResponsiveSheetDescription>
										</>
									) : isDuplicate ? (
										<div className="flex items-center gap-2.5">
											<span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary text-primary-foreground">
												<Copy className="size-3.5" />
											</span>
											<div className="min-w-0">
												<ResponsiveSheetTitle className="text-left leading-snug">
													Event duplizieren
												</ResponsiveSheetTitle>
												<ResponsiveSheetDescription className="text-left">
													Kopie von „{event?.title_de}“ – setze neue Termine.
												</ResponsiveSheetDescription>
											</div>
										</div>
									) : isEdit ? (
										<>
											<ResponsiveSheetTitle className="text-left leading-snug">
												Event bearbeiten
											</ResponsiveSheetTitle>
											<ResponsiveSheetDescription className="text-left">
												Aktualisiere Details und Sichtbarkeit.
											</ResponsiveSheetDescription>
										</>
									) : event ? (
										<>
											<div className="space-y-2">
												<ResponsiveSheetTitle className="text-left leading-snug">
													{event.title_de}
												</ResponsiveSheetTitle>
												{event.title_en && event.title_en !== event.title_de ? (
													<ResponsiveSheetDescription className="text-left">
														{event.title_en}
													</ResponsiveSheetDescription>
												) : (
													<ResponsiveSheetDescription className="sr-only">
														Eventdetails
													</ResponsiveSheetDescription>
												)}
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<EventOrganizerBadge
													name={organizerName}
													isOwn={isOwnOrganizer}
												/>
												{visibility ? (
													<EventVisibilityIndicator mode={visibility} />
												) : null}
											</div>
										</>
									) : null}
								</motion.div>
							</AnimatePresence>
						</ResponsiveSheetHeader>

						<div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
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
											<EventForm
												key={contentKey}
												formId="event-sheet-form"
												hideSubmitButton
												event={isCreate ? null : event}
												initialValues={duplicateInitialValues}
												onSave={onSave}
												isLoading={isPending}
											/>
										) : event ? (
											<>
												<dl className="space-y-4">
													<DetailRow label="Start">
														<span className="tabular-nums">
															{formatInCampusTimeZone(
																new Date(event.start_date_time),
																'dd.MM.yyyy HH:mm'
															)}
														</span>
													</DetailRow>
													<DetailRow label="Ende">
														<span className="tabular-nums">
															{formatInCampusTimeZone(
																new Date(event.end_date_time),
																'dd.MM.yyyy HH:mm'
															)}
														</span>
													</DetailRow>
													{event.location ? (
														<DetailRow label="Ort">{event.location}</DetailRow>
													) : null}
													{event.event_url ? (
														<DetailRow label="Link">
															<a
																href={event.event_url}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline break-all"
															>
																{event.event_url}
																<ExternalLink className="size-3.5 shrink-0" />
															</a>
														</DetailRow>
													) : null}
													{event.description_de ? (
														<DetailRow label="Beschreibung">
															<p className="whitespace-pre-wrap text-sm leading-relaxed">
																{event.description_de}
															</p>
														</DetailRow>
													) : null}
													{event.description_en ? (
														<DetailRow label="Beschreibung (EN)">
															<p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
																{event.description_en}
															</p>
														</DetailRow>
													) : null}
												</dl>
												{canManage ? (
													<EventChangeHistory
														eventId={event.id}
														enabled={open && !isFormMode}
													/>
												) : null}
											</>
										) : null}
									</motion.div>
								</AnimatePresence>
							</div>

							<AnimatePresence>
								{showSuccess ? (
									<motion.div
										initial={reducedMotion ? false : { opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={reducedMotion ? undefined : { opacity: 0 }}
										className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 backdrop-blur-sm"
									>
										<span className="flex size-14 items-center justify-center rounded-full border bg-primary text-primary-foreground">
											<PartyPopper className="size-7" animate />
										</span>
										<p className="text-sm font-medium">
											{isDuplicate
												? 'Kopie erstellt'
												: isCreate
													? 'Event erstellt'
													: 'Gespeichert'}
										</p>
									</motion.div>
								) : null}
							</AnimatePresence>
						</div>

						{!isFormMode && event && hasViewActions ? (
							<ResponsiveSheetFooter className="border-t gap-3 sm:flex-col sm:space-x-0">
								{canManage ? (
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
									{hasPublicPage ? (
										<>
											<Button asChild variant="outline" size="sm">
												<Link href={`/e/${event.id}`} target="_blank">
													Öffentliche Seite
													<ExternalLink className="size-3.5" />
												</Link>
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleShare}
											>
												<Share2 className="size-3.5" />
												Link kopieren
											</Button>
										</>
									) : null}
									{canManage ? (
										<>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => onModeChange('duplicate')}
											>
												<Copy className="size-3.5" />
												Duplizieren
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												className="text-destructive hover:text-destructive"
												onClick={() => onDelete(event)}
											>
												<Trash2 className="size-3.5" />
												Löschen
											</Button>
										</>
									) : null}
								</div>
							</ResponsiveSheetFooter>
						) : null}

						{isFormMode ? (
							<ResponsiveSheetFooter className="border-t flex-row gap-2 sm:justify-between">
								<Button
									type="button"
									variant="outline"
									disabled={isPending || showSuccess}
									onClick={() => {
										if (isCreate) {
											onOpenChange(false)
											return
										}
										onModeChange('view')
									}}
								>
									{isCreate ? 'Abbrechen' : 'Zurück zur Ansicht'}
								</Button>
								<Button
									type="button"
									disabled={!saveArmed || isPending || showSuccess}
									onClick={() => {
										const form = document.getElementById('event-sheet-form')
										if (form instanceof HTMLFormElement) {
											form.requestSubmit()
										}
									}}
								>
									{isPending
										? 'Speichern...'
										: isDuplicate
											? 'Kopie erstellen'
											: isCreate
												? 'Event erstellen'
												: 'Event aktualisieren'}
								</Button>
							</ResponsiveSheetFooter>
						) : null}
					</>
				) : null}
			</ResponsiveSheetContent>
		</ResponsiveSheet>
	)
}
