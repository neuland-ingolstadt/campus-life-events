'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import type { Organizer, UpdateOrganizerRequest } from '@/client/types.gen'
import { Button } from '@/components/ui/button'
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
import RequiredLabel from '@/components/ui/required-label'
import { Textarea } from '@/components/ui/textarea'

const organizerSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich'),
	description_de: z.string().optional(),
	description_en: z.string().optional(),
	website_url: z.string().url().optional().or(z.literal('')),
	instagram_url: z.string().url().optional().or(z.literal('')),
	location: z.string().optional()
})

export type OrganizerFormValues = z.infer<typeof organizerSchema>

export function OrganizerForm({
	organizer,
	onSave,
	isLoading = false
}: {
	organizer?: Organizer | null
	onSave: (data: UpdateOrganizerRequest) => Promise<void> | void
	isLoading?: boolean
}) {
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

	const onSubmit = async (values: OrganizerFormValues) => {
		const payload: UpdateOrganizerRequest = {
			...values,
			website_url: values.website_url || undefined,
			instagram_url: values.instagram_url || undefined,
			location: values.location || undefined,
			description_de: values.description_de || undefined,
			description_en: values.description_en || undefined
		}
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
						Vereinsinformationen
					</h2>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Name <RequiredLabel />
									</FormLabel>
									<FormControl>
										<Input placeholder="Name des Vereins" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
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
											placeholder="Das Hinzufügen einer Beschreibung hilft Leuten, deinen Verein besser zu verstehen und seine Aktivitäten zu erkennen."
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
											placeholder="Adding a description helps people to better understand your club and its activities."
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
					<h2 className="text-xl font-bold tracking-tight">Standort & Links</h2>
					<div className="mt-3 space-y-6">
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

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-2">
					<Button type="submit" disabled={isLoading} size="lg" className="px-8">
						{isLoading
							? 'Speichern...'
							: organizer
								? 'Verein aktualisieren'
								: 'Verein erstellen'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
