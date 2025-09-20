'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import type { Organizer, UpdateOrganizerRequest } from '@/client/types.gen'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'

const organizerSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich'),
	description_de: z.string().optional(),
	description_en: z.string().optional(),
	website_url: z.string().url().optional().or(z.literal('')),
	instagram_url: z.string().url().optional().or(z.literal('')),
	location: z.string().optional()
})

type OrganizerFormValues = z.infer<typeof organizerSchema>

interface OrganizerDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	organizer?: Organizer | null
	onSave: (data: UpdateOrganizerRequest) => void
	isLoading?: boolean
}

export function OrganizerDialog({
	open,
	onOpenChange,
	organizer,
	onSave,
	isLoading = false
}: OrganizerDialogProps) {
	const form = useForm<OrganizerFormValues>({
		resolver: zodResolver(organizerSchema),
		defaultValues: {
			name: '',
			description_de: '',
			description_en: '',
			website_url: '',
			instagram_url: '',
			location: ''
		}
	})

	useEffect(() => {
		if (organizer) {
			form.reset({
				name: organizer.name,
				description_de: organizer.description_de || '',
				description_en: organizer.description_en || '',
				website_url: organizer.website_url || '',
				instagram_url: organizer.instagram_url || '',
				location: organizer.location || ''
			})
		} else {
			form.reset({
				name: '',
				description_de: '',
				description_en: '',
				website_url: '',
				instagram_url: '',
				location: ''
			})
		}
	}, [organizer, form])

	const onSubmit = (values: OrganizerFormValues) => {
		const organizerData: UpdateOrganizerRequest = {
			...values,
			website_url: values.website_url || undefined,
			instagram_url: values.instagram_url || undefined,
			location: values.location || undefined,
			description_de: values.description_de || undefined,
			description_en: values.description_en || undefined
		}

		onSave(organizerData)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{organizer ? 'Verein bearbeiten' : 'Neuen Verein erstellen'}
					</DialogTitle>
					<DialogDescription>
						{organizer
							? 'Aktualisiere die Vereinsdetails unten.'
							: 'Fülle die Angaben aus, um einen neuen Verein anzulegen.'}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name *</FormLabel>
									<FormControl>
										<Input placeholder="Name des Vereins" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="description_de"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Deutsche Beschreibung</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Beschreibung auf Deutsch"
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
												placeholder="Description in English"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="location"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Standort</FormLabel>
									<FormControl>
										<Input
											placeholder="z.B. Hauptgebäude, Raum 101"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Optionaler Standort oder Raum des Vereins
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="website_url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Website-URL</FormLabel>
									<FormControl>
										<Input placeholder="https://example.com" {...field} />
									</FormControl>
									<FormDescription>
										Optionale Website-URL des Vereins
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="instagram_url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Instagram-URL</FormLabel>
									<FormControl>
										<Input
											placeholder="https://instagram.com/username"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Optionale Instagram-Profil-URL
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
									: organizer
										? 'Verein aktualisieren'
										: 'Verein erstellen'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
