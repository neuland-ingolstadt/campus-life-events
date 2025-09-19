'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import type {
	CreateEventRequest,
	Event,
	Organizer,
	UpdateEventRequest
} from '@/client/types.gen'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const eventSchema = z.object({
	title_de: z.string().min(1, 'Deutscher Titel ist erforderlich'),
	title_en: z.string().min(1, 'Englischer Titel ist erforderlich'),
	description_de: z.string().optional(),
	description_en: z.string().optional(),
	start_date_time: z.date().refine((date) => date instanceof Date, {
		message: 'Startdatum ist erforderlich'
	}),
	end_date_time: z.date().optional(),
	event_url: z.string().url().optional().or(z.literal('')),
	publish_app: z.boolean(),
	publish_newsletter: z.boolean(),
	audit_note: z.string().optional()
})

type EventFormValues = z.infer<typeof eventSchema>

interface EventDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	event?: Event | null
	organizers?: Organizer[]
	currentOrganizerId?: number
	onSave: (data: CreateEventRequest | UpdateEventRequest) => void
	isLoading?: boolean
}

export function EventDialog({
	open,
	onOpenChange,
	event,
	organizers,
	currentOrganizerId,
	onSave,
	isLoading = false
}: EventDialogProps) {
	const [startDate, setStartDate] = useState<Date>()
	const [endDate, setEndDate] = useState<Date>()
	const [startTime, setStartTime] = useState('')
	const [endTime, setEndTime] = useState('')

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
			publish_app: true,
			publish_newsletter: true,
			audit_note: ''
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
			setStartTime(format(startDateTime, 'HH:mm'))
			setEndTime(endDateTime ? format(endDateTime, 'HH:mm') : '')

			form.reset({
				title_de: event.title_de,
				title_en: event.title_en,
				description_de: event.description_de || '',
				description_en: event.description_en || '',
				start_date_time: startDateTime,
				end_date_time: endDateTime,
				event_url: event.event_url || '',
				publish_app: event.publish_app,
				publish_newsletter: event.publish_newsletter,
				audit_note: ''
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
				publish_app: true,
				publish_newsletter: true,
				audit_note: ''
			})
			setStartDate(new Date())
			setEndDate(undefined)
			setStartTime('')
			setEndTime('')
		}
	}, [event, form])

	const onSubmit = (values: EventFormValues) => {
		if (!startDate) return

		const startDateTime = new Date(startDate)
		if (startTime) {
			const [hours, minutes] = startTime.split(':').map(Number)
			startDateTime.setHours(hours, minutes, 0, 0)
		}

		let endDateTime: Date | undefined
		if (endDate) {
			endDateTime = new Date(endDate)
			if (endTime) {
				const [hours, minutes] = endTime.split(':').map(Number)
				endDateTime.setHours(hours, minutes, 0, 0)
			}
		}

		const eventData = {
			...values,
			start_date_time: startDateTime.toISOString(),
			end_date_time: endDateTime?.toISOString(),
			event_url: values.event_url || undefined,
			description_de: values.description_de || undefined,
			description_en: values.description_en || undefined,
			audit_note: values.audit_note || undefined
		}

		onSave(eventData)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[800px]">
				<DialogHeader>
					<DialogTitle>
						{event ? 'Event bearbeiten' : 'Neues Event erstellen'}
					</DialogTitle>
					<DialogDescription>
						{event
							? 'Aktualisiere unten die Eventdetails.'
							: 'Fülle die Angaben aus, um ein neues Event zu erstellen.'}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{/* Organizer is derived from session; no selector here */}

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="title_de"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Deutscher Titel *</FormLabel>
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
										<FormLabel>Englischer Titel *</FormLabel>
										<FormControl>
											<Input placeholder="Event title in English" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="description_de"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Deutsche Beschreibung</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Eventbeschreibung auf Deutsch"
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
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<FormLabel>Startdatum & Uhrzeit *</FormLabel>
								<div className="flex gap-2">
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													'flex-1 justify-start text-left font-normal',
													!startDate && 'text-muted-foreground'
												)}
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{startDate
													? format(startDate, 'PPP')
													: 'Datum auswählen'}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0">
											<Calendar
												mode="single"
												selected={startDate}
												onSelect={setStartDate}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<Input
										type="time"
										value={startTime}
										onChange={(e) => setStartTime(e.target.value)}
										className="w-32"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<FormLabel>Enddatum & Uhrzeit</FormLabel>
								<div className="flex gap-2">
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													'flex-1 justify-start text-left font-normal',
													!endDate && 'text-muted-foreground'
												)}
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{endDate ? format(endDate, 'PPP') : 'Datum auswählen'}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0">
											<Calendar
												mode="single"
												selected={endDate}
												onSelect={setEndDate}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<Input
										type="time"
										value={endTime}
										onChange={(e) => setEndTime(e.target.value)}
										className="w-32"
									/>
								</div>
							</div>
						</div>

						<FormField
							control={form.control}
							name="event_url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Event-URL</FormLabel>
									<FormControl>
										<Input placeholder="https://example.com/event" {...field} />
									</FormControl>
									<FormDescription>
										Optionaler externer Link zum Event
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="publish_app"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">
												In der App veröffentlichen
											</FormLabel>
											<FormDescription>
												Dieses Event in der mobilen App anzeigen
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
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
										<div className="space-y-0.5">
											<FormLabel className="text-base">Newsletter</FormLabel>
											<FormDescription>
												In den Newsletter übernehmen
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

						<FormField
							control={form.control}
							name="audit_note"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Audit-Notiz</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Optionale Notiz für das Prüfprotokoll"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Diese Notiz wird im Audit-Log gespeichert
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Abbrechen
							</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading
									? 'Speichern...'
									: event
										? 'Event aktualisieren'
										: 'Event erstellen'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
