'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, ExternalLink, Pencil, Share2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createEvent, updateEvent } from '@/client'
import type {
	Event as ApiEvent,
	CreateEventRequest,
	UpdateEventRequest
} from '@/client/types.gen'
import { EventForm } from '@/components/event-form'
import {
	EventOrganizerBadge,
	EventVisibilityIndicator
} from '@/components/events/event-status-badges'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
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
import { deriveEventVisibilityMode } from '@/lib/event-visibility'
import { cn } from '@/lib/utils'

export type EventSheetMode = 'view' | 'edit' | 'create'

type EventDetailSheetProps = {
	readonly event: ApiEvent | null
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly mode: EventSheetMode
	readonly onModeChange: (mode: EventSheetMode) => void
	readonly organizerName: string
	readonly isOwnOrganizer: boolean
	readonly canManage: boolean
	readonly onDelete: (id: number) => Promise<void>
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
	const [saving, setSaving] = useState(false)
	const [saveArmed, setSaveArmed] = useState(false)

	const isCreate = mode === 'create'
	const isEdit = mode === 'edit' && canManage && event !== null
	const isFormMode = isCreate || isEdit

	useEffect(() => {
		if (!open) {
			return
		}
		if (mode === 'edit' && !canManage) {
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
			if (isCreate) {
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
			}
			toast.success(
				isCreate
					? 'Event erfolgreich erstellt'
					: 'Event erfolgreich aktualisiert'
			)
			onModeChange('view')
			onOpenChange(false)
		},
		onError: () => {
			toast.error(
				isCreate
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

	const shareUrl = useMemo(() => {
		if (!event || typeof window === 'undefined') {
			return ''
		}
		return `${window.location.origin}/e/${event.id}`
	}, [event])

	const handleShare = useCallback(() => {
		if (!shareUrl || typeof navigator === 'undefined') {
			return
		}
		void navigator.clipboard.writeText(shareUrl)
		toast.success('Öffentlicher Link wurde in die Zwischenablage kopiert.')
	}, [shareUrl])

	const hasViewActions = Boolean(event && (event.publish_web || canManage))
	const isPending = saving || saveMutation.isPending

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className={cn(
					'flex w-full flex-col gap-0 p-0',
					isFormMode ? 'sm:max-w-2xl md:max-w-3xl' : 'sm:max-w-md md:max-w-lg'
				)}
			>
				{isCreate || event ? (
					<>
						<SheetHeader className="border-b pr-12 gap-3">
							{isCreate ? (
								<>
									<SheetTitle className="text-left leading-snug">
										Neues Event
									</SheetTitle>
									<SheetDescription className="text-left">
										Fülle die Angaben aus, um dein Event zu erstellen.
									</SheetDescription>
								</>
							) : isEdit ? (
								<>
									<SheetTitle className="text-left leading-snug">
										Event bearbeiten
									</SheetTitle>
									<SheetDescription className="text-left">
										Aktualisiere Details und Sichtbarkeit.
									</SheetDescription>
								</>
							) : event ? (
								<>
									<div className="space-y-2">
										<SheetTitle className="text-left leading-snug">
											{event.title_de}
										</SheetTitle>
										{event.title_en && event.title_en !== event.title_de ? (
											<SheetDescription className="text-left">
												{event.title_en}
											</SheetDescription>
										) : (
											<SheetDescription className="sr-only">
												Eventdetails
											</SheetDescription>
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
						</SheetHeader>

						<div className="flex-1 overflow-y-auto px-4 py-4">
							{isFormMode ? (
								<EventForm
									key={isCreate ? 'create' : `edit-${event?.id}`}
									formId="event-sheet-form"
									hideSubmitButton
									event={isCreate ? null : event}
									onSave={onSave}
									isLoading={isPending}
								/>
							) : event ? (
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
										<DetailRow label="Description">
											<p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
												{event.description_en}
											</p>
										</DetailRow>
									) : null}
								</dl>
							) : null}
						</div>

						{!isFormMode && event && hasViewActions ? (
							<SheetFooter className="border-t gap-3 sm:flex-col sm:space-x-0">
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
									{event.publish_web ? (
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
											<Button asChild variant="outline" size="sm">
												<Link href={`/events/${event.id}/duplicate`}>
													<Copy className="size-3.5" />
													Duplizieren
												</Link>
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														type="button"
														variant="outline"
														size="sm"
														className="text-destructive hover:text-destructive"
													>
														<Trash2 className="size-3.5" />
														Löschen
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Event löschen</AlertDialogTitle>
														<AlertDialogDescription>
															Bist du sicher, dass du "{event.title_de}" löschen
															möchtest? Diese Aktion kann nicht rückgängig
															gemacht werden.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Abbrechen</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => onDelete(event.id)}
														>
															Löschen
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</>
									) : null}
								</div>
							</SheetFooter>
						) : null}

						{isFormMode ? (
							<SheetFooter className="border-t flex-row gap-2 sm:justify-between">
								<Button
									type="button"
									variant="outline"
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
									disabled={!saveArmed || isPending}
									onClick={() => {
										const form = document.getElementById('event-sheet-form')
										if (form instanceof HTMLFormElement) {
											form.requestSubmit()
										}
									}}
								>
									{isPending
										? 'Speichern...'
										: isCreate
											? 'Event erstellen'
											: 'Event aktualisieren'}
								</Button>
							</SheetFooter>
						) : null}
					</>
				) : null}
			</SheetContent>
		</Sheet>
	)
}
