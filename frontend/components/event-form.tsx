'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

// removed unused date-fns import

import type {
	CreateEventRequest,
	Event,
	UpdateEventRequest
} from '@/client/types.gen'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import RequiredLabel from './ui/required-label'

const eventSchema = z.object({
	title_de: z.string().min(1, 'Deutscher Titel ist erforderlich'),
	title_en: z.string().min(1, 'Englischer Titel ist erforderlich'),
	description_de: z.string().optional(),
	description_en: z.string().optional(),
	start_date_time: z.date({ message: 'Startdatum ist erforderlich' }),
	end_date_time: z.date().optional(),
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
	publish_web: z.boolean()
})

export type EventFormValues = z.infer<typeof eventSchema>

export function EventForm({
	event,
	onSave,
	isLoading = false
}: {
	event?: Event | null
	onSave: (
		data: CreateEventRequest | UpdateEventRequest
	) => Promise<void> | void
	isLoading?: boolean
}) {
	const [startDate, setStartDate] = useState<Date>()
	const [endDate, setEndDate] = useState<Date>()

	const form = useForm<EventFormValues>({
		resolver: zodResolver(eventSchema),
		defaultValues: {
			title_de: '',
			title_en: '',
			description_de: '',
			description_en: '',
			start_date_time: new Date(),
			end_date_time: undefined,
			event_url: '',
			location: '',
			publish_app: true,
			publish_newsletter: true,
			publish_in_ical: true
		}
	})

	useEffect(() => {
		if (event) {
			const startDateTime = new Date(event.start_date_time)
			const endDateTime = event.end_date_time
				? new Date(event.end_date_time)
				: undefined

			setStartDate(startDateTime)
			setEndDate(endDateTime)
			// time is embedded in the Date object

			form.reset({
				title_de: event.title_de,
				title_en: event.title_en,
				description_de: event.description_de || '',
				description_en: event.description_en || '',
				start_date_time: startDateTime,
				end_date_time: endDateTime,
				event_url: event.event_url || '',
				location: event.location || '',
				publish_app: event.publish_app,
				publish_newsletter: event.publish_newsletter,
				publish_in_ical: event.publish_in_ical,
				publish_web: event.publish_web
			})
		} else {
			form.reset({
				title_de: '',
				title_en: '',
				description_de: '',
				description_en: '',
				start_date_time: new Date(),
				end_date_time: undefined,
				event_url: '',
				location: '',
				publish_app: true,
				publish_newsletter: true,
				publish_in_ical: true,
				publish_web: true
			})
			setStartDate(new Date())
			setEndDate(undefined)
		}
	}, [event, form])

	const onSubmit = async (values: EventFormValues) => {
		if (!startDate) return

		const startDateTime = new Date(startDate)
		const endDateTime = endDate ? new Date(endDate) : undefined

		const payload = {
			...values,
			start_date_time: startDateTime.toISOString(),
			end_date_time: endDateTime?.toISOString(),
			event_url: values.event_url || undefined,
			location: values.location || undefined,
			description_de: values.description_de || undefined,
			description_en: values.description_en || undefined
		} as CreateEventRequest | UpdateEventRequest

		await onSave(payload)
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
										<Input placeholder="Event title in English" {...field} />
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
						<DateTimeField
							label="Beginn"
							required
							value={startDate}
							onValueChange={setStartDate}
						/>
						<DateTimeField
							label="Ende"
							value={endDate}
							onValueChange={setEndDate}
							description="Optional. Leer lassen, wenn keine Endzeit vorhanden ist."
						/>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-bold tracking-tight">Beschreibungen</h2>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
						<FormField
							control={form.control}
							name="description_de"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Deutsche Beschreibung</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Eventbeschreibung auf Deutsch"
											className="min-h-[120px]"
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
											placeholder="Event description in English"
											className="min-h-[120px]"
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
										Optionaler Link zu einer externen Seite
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
									<FormDescription>
										Optionaler Veranstaltungsort oder Raum
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<FormField
								control={form.control}
								name="publish_app"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-md border p-4">
										<div className="space-y-1">
											<FormLabel className="text-sm font-medium">
												In der App veröffentlichen
											</FormLabel>
											<FormDescription className="text-xs">
												Dieses Event in der App anzeigen.
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
								name="publish_newsletter"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-md border p-4">
										<div className="space-y-1">
											<FormLabel className="text-sm font-medium">
												Im Newsletter aufnehmen
											</FormLabel>
											<FormDescription className="text-xs">
												Dieses Event im Newsletter hervorheben.
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
								name="publish_in_ical"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-md border p-4">
										<div className="space-y-1">
											<FormLabel className="text-sm font-medium">
												In iCal-Kalender aufnehmen
											</FormLabel>
											<FormDescription className="text-xs">
												Dieses Event in iCal-Kalendern anzeigen.
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
									<FormItem className="flex items-center justify-between rounded-md border p-4">
										<div className="space-y-1">
											<FormLabel className="text-sm font-medium">
												Öffentlich teilen
											</FormLabel>
											<FormDescription className="text-xs">
												Event über öffentlichen Link teilen.
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
