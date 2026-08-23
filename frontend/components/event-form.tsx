'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
	Building2,
	ChevronDown,
	Globe2,
	Lock,
	SlidersHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

// removed unused date-fns import

import type {
	CreateEventRequest,
	Event,
	UpdateEventRequest
} from '@/client/types.gen'
import { Button } from '@/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '@/components/ui/collapsible'
import DateTimeField from '@/components/ui/datetime-field'
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import {
	deriveEventVisibilityMode,
	type EventVisibilityMode,
	eventVisibilityDescription
} from '@/lib/event-visibility'
import { cn } from '@/lib/utils'
import RequiredLabel from './ui/required-label'

const END_BEFORE_START_ERROR = 'Enddatum darf nicht vor dem Startdatum liegen'

const DESCRIPTION_TEXTAREA_CLASSNAME =
	'field-sizing-fixed min-h-[120px] max-h-[320px] resize-y overflow-y-auto'

const eventSchema = z
	.object({
		title_de: z.string().min(1, 'Deutscher Titel ist erforderlich'),
		title_en: z.string().min(1, 'Englischer Titel ist erforderlich'),
		description_de: z.string().optional(),
		description_en: z.string().optional(),
		start_date_time: z.date({ message: 'Startdatum ist erforderlich' }),
		end_date_time: z.date({ message: 'Enddatum ist erforderlich' }),
		event_url: z
			.string()
			.optional()
			.refine((val) => !val || z.string().url().safeParse(val).success, {
				message: 'Bitte gib eine gültige URL ein'
			}),
		location: z.string().optional(),
		publish_app: z.boolean(),
		publish_newsletter: z.boolean(),
		publish_in_ical: z.boolean(),
		publish_web: z.boolean(),
		host_only: z.boolean()
	})
	.superRefine((data, ctx) => {
		if (
			data.start_date_time &&
			data.end_date_time &&
			data.end_date_time <= data.start_date_time
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: END_BEFORE_START_ERROR,
				path: ['end_date_time']
			})
		}
	})

export type EventFormValues = z.infer<typeof eventSchema>

type EventFormOverrides = Partial<
	Omit<EventFormValues, 'start_date_time' | 'end_date_time'>
> & {
	start_date_time?: Date | undefined
	end_date_time?: Date | undefined
}

export function EventForm({
	event,
	onSave,
	isLoading = false,
	initialValues
}: {
	event?: Event | null
	onSave: (
		data: CreateEventRequest | UpdateEventRequest
	) => Promise<void> | void
	isLoading?: boolean
	initialValues?: EventFormOverrides
}) {
	const [startDate, setStartDate] = useState<Date>()
	const [endDate, setEndDate] = useState<Date>()
	const [channelsOpen, setChannelsOpen] = useState(false)

	const form = useForm<EventFormValues>({
		resolver: zodResolver(eventSchema),
		defaultValues: {
			title_de: '',
			title_en: '',
			description_de: '',
			description_en: '',
			start_date_time: undefined,
			end_date_time: undefined,
			event_url: '',
			location: '',
			publish_app: true,
			publish_newsletter: true,
			publish_in_ical: true,
			publish_web: true,
			host_only: false
		}
	})

	const visibilityMode = deriveEventVisibilityMode({
		host_only: form.watch('host_only'),
		publish_app: form.watch('publish_app'),
		publish_newsletter: form.watch('publish_newsletter')
	})

	const applyVisibilityMode = (mode: EventVisibilityMode) => {
		if (mode === 'host_only') {
			form.setValue('host_only', true, { shouldDirty: true })
			form.setValue('publish_app', false, { shouldDirty: true })
			form.setValue('publish_newsletter', false, { shouldDirty: true })
			form.setValue('publish_in_ical', false, { shouldDirty: true })
			form.setValue('publish_web', false, { shouldDirty: true })
			setChannelsOpen(false)
			return
		}

		form.setValue('host_only', false, { shouldDirty: true })

		if (mode === 'internal') {
			form.setValue('publish_app', false, { shouldDirty: true })
			form.setValue('publish_newsletter', false, { shouldDirty: true })
			form.setValue('publish_in_ical', true, { shouldDirty: true })
			form.setValue('publish_web', true, { shouldDirty: true })
			return
		}

		form.setValue('publish_app', true, { shouldDirty: true })
		form.setValue('publish_newsletter', true, { shouldDirty: true })
		form.setValue('publish_in_ical', true, { shouldDirty: true })
		form.setValue('publish_web', true, { shouldDirty: true })
	}

	const publishApp = form.watch('publish_app')
	const publishNewsletter = form.watch('publish_newsletter')
	const publishInIcal = form.watch('publish_in_ical')
	const publishWeb = form.watch('publish_web')
	const activeChannelLabels = [
		publishApp ? 'App' : null,
		publishNewsletter ? 'Newsletter' : null,
		publishInIcal ? 'iCal' : null,
		publishWeb ? 'Web' : null
	].filter(Boolean)

	const validateChronology = useCallback(
		(nextStart?: Date, nextEnd?: Date) => {
			if (!nextStart || !nextEnd) {
				return
			}
			if (nextEnd <= nextStart) {
				form.setError('end_date_time', {
					type: 'manual',
					message: END_BEFORE_START_ERROR
				})
				return
			}
			form.clearErrors('end_date_time')
		},
		[form]
	)

	const handleStartDateChange = (value?: Date) => {
		setStartDate(value)
		if (value) {
			form.clearErrors('start_date_time')
			form.setValue('start_date_time', value, { shouldDirty: true })
		}
		validateChronology(value, endDate)
	}

	const handleEndDateChange = (value?: Date) => {
		setEndDate(value)
		if (value) {
			form.clearErrors('end_date_time')
			form.setValue('end_date_time', value, { shouldDirty: true })
		}
		validateChronology(startDate, value)
	}

	useEffect(() => {
		const hasInitialValue = <K extends keyof EventFormOverrides>(key: K) =>
			initialValues && Object.hasOwn(initialValues, key)

		const baseStartDate = event ? new Date(event.start_date_time) : new Date()
		const baseEndDate = event
			? new Date(event.end_date_time)
			: new Date(baseStartDate)

		const nextStartDate = hasInitialValue('start_date_time')
			? initialValues?.start_date_time
			: event
				? baseStartDate
				: undefined

		const nextEndDate = hasInitialValue('end_date_time')
			? initialValues?.end_date_time
			: event
				? baseEndDate
				: undefined

		const baseValues: Partial<EventFormValues> & {
			start_date_time?: Date | undefined
			end_date_time?: Date | undefined
		} = event
			? {
					title_de: event.title_de,
					title_en: event.title_en,
					description_de: event.description_de || '',
					description_en: event.description_en || '',
					start_date_time: baseStartDate,
					end_date_time: baseEndDate,
					event_url: event.event_url || '',
					location: event.location || '',
					publish_app: event.publish_app,
					publish_newsletter: event.publish_newsletter,
					publish_in_ical: event.publish_in_ical,
					publish_web: event.publish_web,
					host_only: event.host_only
				}
			: {
					title_de: '',
					title_en: '',
					description_de: '',
					description_en: '',
					start_date_time: undefined,
					end_date_time: undefined,
					event_url: '',
					location: '',
					publish_app: true,
					publish_newsletter: true,
					publish_in_ical: true,
					publish_web: true,
					host_only: false
				}

		const resolvedValues = {
			...baseValues,
			...initialValues,
			start_date_time: hasInitialValue('start_date_time')
				? initialValues?.start_date_time
				: baseValues.start_date_time,
			end_date_time: hasInitialValue('end_date_time')
				? initialValues?.end_date_time
				: baseValues.end_date_time
		} as EventFormValues

		form.reset(resolvedValues)
		setStartDate(nextStartDate)
		setEndDate(nextEndDate)
		validateChronology(nextStartDate, nextEndDate)
	}, [event, form, initialValues, validateChronology])

	useEffect(() => {
		if (startDate) {
			form.setValue('start_date_time', startDate)
		}
		if (endDate) {
			form.setValue('end_date_time', endDate)
		}
	}, [startDate, endDate, form])

	const { isDirty } = form.formState
	useUnsavedChangesWarning(isDirty)

	const onSubmit = async (values: EventFormValues) => {
		const startDateTime = startDate || values.start_date_time
		const endDateTime = endDate || values.end_date_time

		if (!startDateTime || !endDateTime) {
			if (!startDateTime) {
				form.setError('start_date_time', {
					type: 'manual',
					message: 'Startdatum ist erforderlich'
				})
			}
			if (!endDateTime) {
				form.setError('end_date_time', {
					type: 'manual',
					message: 'Enddatum ist erforderlich'
				})
			}
			return
		}

		form.clearErrors(['start_date_time', 'end_date_time'])

		const payload = {
			...values,
			start_date_time: (startDateTime instanceof Date
				? startDateTime
				: new Date(startDateTime)
			).toISOString(),
			end_date_time: (endDateTime instanceof Date
				? endDateTime
				: new Date(endDateTime)
			).toISOString(),
			event_url: values.event_url || undefined,
			location: values.location || undefined,
			description_de: values.description_de || undefined,
			description_en: values.description_en || undefined
		} as CreateEventRequest | UpdateEventRequest

		await onSave(payload)
		form.reset({
			...values,
			start_date_time: startDateTime,
			end_date_time: endDateTime
		})
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col gap-6 max-w-5xl"
			>
				<div>
					<h2 className="text-xl font-bold tracking-tight">
						Eventinformationen
					</h2>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
						<FormField
							control={form.control}
							name="title_de"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Deutscher Titel <RequiredLabel />
									</FormLabel>
									<FormControl>
										<Input placeholder="Eventtitel auf Deutsch" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="title_en"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Englischer Titel <RequiredLabel />
									</FormLabel>
									<FormControl>
										<Input placeholder="Eventtitel auf Englisch" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-bold tracking-tight">Zeitplan</h2>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<DateTimeField
								label="Beginn"
								required
								value={startDate}
								onValueChange={handleStartDateChange}
							/>
							{form.formState.errors.start_date_time && (
								<p className="text-sm text-destructive">
									{form.formState.errors.start_date_time.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<DateTimeField
								label="Ende"
								required
								value={endDate}
								onValueChange={handleEndDateChange}
							/>
							{form.formState.errors.end_date_time && (
								<p className="text-sm text-destructive">
									{form.formState.errors.end_date_time.message}
								</p>
							)}
						</div>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-bold tracking-tight">Beschreibungen</h2>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
						<FormField
							control={form.control}
							name="description_de"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Deutsche Beschreibung</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Eventbeschreibung auf Deutsch"
											className={DESCRIPTION_TEXTAREA_CLASSNAME}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description_en"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Englische Beschreibung</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Eventbeschreibung auf Englisch"
											className={DESCRIPTION_TEXTAREA_CLASSNAME}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-bold tracking-tight">
						Links & Sichtbarkeit
					</h2>
					<div className="mt-3 space-y-6">
						<FormField
							control={form.control}
							name="event_url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Event-URL</FormLabel>
									<FormControl>
										<Input placeholder="https://example.com" {...field} />
									</FormControl>
									<FormDescription>
										Link zur Event- oder Ticketseite. Nicht deine Website der
										Organisation, diese kannst du in deinem{' '}
										<Link href={'/organizers'} className="font-bold">
											Profil
										</Link>{' '}
										hinterlegen.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="location"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Veranstaltungsort</FormLabel>
									<FormControl>
										<Input
											placeholder="z.B. Hörsaal A, Raum 101, Online"
											{...field}
										/>
									</FormControl>

									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="space-y-3">
							<FormLabel>Sichtbarkeit</FormLabel>
							<Tabs
								value={visibilityMode}
								onValueChange={(value) => {
									if (
										value === 'public' ||
										value === 'internal' ||
										value === 'host_only'
									) {
										applyVisibilityMode(value)
									}
								}}
								className="gap-3"
							>
								<TabsList className="flex h-11 w-full flex-row">
									<TabsTrigger
										value="public"
										className="flex-1 gap-1.5 text-xs sm:text-sm"
									>
										<Globe2 />
										Öffentlich
									</TabsTrigger>
									<TabsTrigger
										value="internal"
										className="flex-1 gap-1.5 text-xs sm:text-sm"
									>
										<Building2 />
										Intern
									</TabsTrigger>
									<TabsTrigger
										value="host_only"
										className="flex-1 gap-1.5 text-xs sm:text-sm"
									>
										<Lock />
										Nur uns
									</TabsTrigger>
								</TabsList>
							</Tabs>
							<p className="min-h-10 text-sm text-muted-foreground">
								{eventVisibilityDescription(visibilityMode)}
							</p>

							{visibilityMode === 'host_only' ? (
								<div className="inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground">
									<Lock className="h-3.5 w-3.5" />
									Keine Kanäle
								</div>
							) : (
								<Collapsible
									open={channelsOpen}
									onOpenChange={setChannelsOpen}
									className="w-fit"
								>
									<CollapsibleTrigger asChild>
										<button
											type="button"
											className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<SlidersHorizontal className="h-3.5 w-3.5" />
											Kanäle anpassen
											<ChevronDown
												className={cn(
													'h-3.5 w-3.5 transition-transform',
													channelsOpen && 'rotate-180'
												)}
											/>
										</button>
									</CollapsibleTrigger>
									<CollapsibleContent className="mt-2 w-[min(100%,36rem)] space-y-3 rounded-md border bg-muted/20 p-3">
										<p className="text-xs text-muted-foreground">
											Aktiv:{' '}
											{activeChannelLabels.length > 0
												? activeChannelLabels.join(' · ')
												: 'keine'}
										</p>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
											<FormField
												control={form.control}
												name="publish_app"
												render={({ field }) => (
													<FormItem className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
														<div className="space-y-0.5">
															<FormLabel className="text-sm font-medium">
																Neuland Next App
															</FormLabel>
															<FormDescription className="text-xs">
																In der App öffentlich anzeigen.
															</FormDescription>
														</div>
														<FormControl>
															<Switch
																checked={field.value}
																disabled={visibilityMode !== 'public'}
																onCheckedChange={field.onChange}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="publish_newsletter"
												render={({ field }) => (
													<FormItem className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
														<div className="space-y-0.5">
															<FormLabel className="text-sm font-medium">
																Campus Life Newsletter
															</FormLabel>
															<FormDescription className="text-xs">
																Im Newsletter der THI bewerben.
															</FormDescription>
														</div>
														<FormControl>
															<Switch
																checked={field.value}
																disabled={visibilityMode !== 'public'}
																onCheckedChange={field.onChange}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="publish_in_ical"
												render={({ field }) => (
													<FormItem className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
														<div className="space-y-0.5">
															<FormLabel className="text-sm font-medium">
																iCal-Kalender
															</FormLabel>
															<FormDescription className="text-xs">
																Im Organisations-iCal aufführen.
															</FormDescription>
														</div>
														<FormControl>
															<Switch
																checked={field.value}
																onCheckedChange={field.onChange}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="publish_web"
												render={({ field }) => (
													<FormItem className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
														<div className="space-y-0.5">
															<FormLabel className="text-sm font-medium">
																Öffentliche Event-Seite
															</FormLabel>
															<FormDescription className="text-xs">
																Teilbare Event-Seite erstellen.
															</FormDescription>
														</div>
														<FormControl>
															<Switch
																checked={field.value}
																onCheckedChange={field.onChange}
															/>
														</FormControl>
													</FormItem>
												)}
											/>
										</div>
										{visibilityMode === 'public' ? (
											<p className="text-xs text-muted-foreground">
												Die gemeinsame iCal-Ansicht aller Organisationen zeigt
												das Event nur, wenn iCal und App aktiviert sind.
											</p>
										) : (
											<p className="text-xs text-muted-foreground">
												App und Newsletter sind bei internen Events fest
												deaktiviert.
											</p>
										)}
									</CollapsibleContent>
								</Collapsible>
							)}
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-2">
					<Button type="submit" disabled={isLoading} size="lg" className="px-8">
						{isLoading
							? 'Speichern...'
							: event
								? 'Event aktualisieren'
								: 'Event erstellen'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
