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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const organizerSchema = z.object({
	name: z.string().trim().min(1, 'Name ist erforderlich'),
	description_de: z.string().optional(),
	description_en: z.string().optional(),
	website_url: z
		.string()
		.optional()
		.refine((val) => !val || z.string().url().safeParse(val).success, {
			message: 'Bitte gib eine gültige URL ein'
		}),
	instagram_url: z
		.string()
		.optional()
		.refine((val) => !val || z.string().url().safeParse(val).success, {
			message: 'Bitte gib eine gültige URL ein'
		}),
	linkedin_url: z
		.string()
		.optional()
		.refine((val) => !val || z.string().url().safeParse(val).success, {
			message: 'Bitte gib eine gültige URL ein'
		}),
	registration_number: z.string().optional(),
	location: z.string().optional(),
	non_profit: z.boolean()
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
			linkedin_url: '',
			registration_number: '',
			location: '',
			non_profit: false
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
				linkedin_url: organizer.linkedin_url || '',
				registration_number: organizer.registration_number || '',
				location: organizer.location || '',
				non_profit: organizer.non_profit
			})
		} else {
			form.reset({
				name: '',
				description_de: '',
				description_en: '',
				website_url: '',
				instagram_url: '',
				linkedin_url: '',
				registration_number: '',
				location: '',
				non_profit: false
			})
		}
	}, [organizer, form])

	const onSubmit = async (values: OrganizerFormValues) => {
		const payload: UpdateOrganizerRequest = {
			name: values.name.trim(),
			description_de: values.description_de?.trim()
				? values.description_de.trim()
				: undefined,
			description_en: values.description_en?.trim()
				? values.description_en.trim()
				: undefined,
			website_url: values.website_url?.trim()
				? values.website_url.trim()
				: undefined,
			instagram_url: values.instagram_url?.trim()
				? values.instagram_url.trim()
				: undefined,
			linkedin_url: values.linkedin_url?.trim()
				? values.linkedin_url.trim()
				: undefined,
			registration_number: values.registration_number?.trim()
				? values.registration_number.trim()
				: undefined,
			location: values.location?.trim() ? values.location.trim() : undefined,
			non_profit:
				organizer && values.non_profit === organizer.non_profit
					? undefined
					: values.non_profit
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

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
							<FormField
								control={form.control}
								name="linkedin_url"
								render={({ field }) => (
									<FormItem>
										<FormLabel>LinkedIn-URL</FormLabel>
										<FormControl>
											<Input
												placeholder="https://linkedin.com/company/verein"
												{...field}
											/>
										</FormControl>
										<FormDescription>
											Optionale LinkedIn-Profil-URL
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>
				</div>

				<div>
					<h2 className="text-xl font-bold tracking-tight">Weitere Angaben</h2>
					<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
						<FormField
							control={form.control}
							name="registration_number"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Registrierungsnummer</FormLabel>
									<FormControl>
										<Input placeholder="z. B. VR 12345" {...field} />
									</FormControl>
									<FormDescription>
										Optionaler Eintrag aus dem Vereinsregister
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="non_profit"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between rounded-md border p-4">
									<div className="space-y-1">
										<FormLabel className="text-sm font-medium">
											Gemeinnütziger Verein
										</FormLabel>
										<FormDescription className="text-xs">
											Kennzeichnet euren Verein als gemeinnützig
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
