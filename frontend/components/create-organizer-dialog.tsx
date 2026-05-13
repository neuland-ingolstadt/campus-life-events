'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { createOrganizer } from '@/client'
import type { CreateOrganizerRequest } from '@/client/types.gen'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import RequiredLabel from '@/components/ui/required-label'
import { Switch } from '@/components/ui/switch'

const createOrganizerSchema = z.object({
	name: z.string().trim().min(1, 'Name ist erforderlich'),
	email: z.string().trim().email('Bitte gib eine gültige E-Mail-Adresse ein'),
	is_thi_department: z.boolean()
})

export type CreateOrganizerFormValues = z.infer<typeof createOrganizerSchema>

export function CreateOrganizerDialog({
	onSuccess
}: {
	onSuccess?: () => void
}) {
	const [open, setOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<CreateOrganizerFormValues>({
		resolver: zodResolver(createOrganizerSchema),
		defaultValues: {
			name: '',
			email: '',
			is_thi_department: false
		}
	})

	const onSubmit = async (values: CreateOrganizerFormValues) => {
		setIsLoading(true)
		try {
			const payload: CreateOrganizerRequest = {
				name: values.name.trim(),
				email: values.email.trim(),
				organizer_kind: values.is_thi_department
					? 'THI_DEPARTMENT'
					: 'STUDENT_ASSOCIATION'
			}
			await createOrganizer({ body: payload })
			form.reset()
			setOpen(false)
			onSuccess?.()
		} catch (error) {
			console.error('Failed to create organizer:', error)
			// You might want to show a toast notification here
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="flex items-center gap-2">
					<Plus className="h-4 w-4" />
					Neue Organisation
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Neue Organisation einladen</DialogTitle>
					<DialogDescription>
						Lade eine neue Organisation ein (studentische Vereinigung oder
						THI-Einrichtung), indem du Name und E-Mail-Adresse angibst. Der
						Kontakt erhält eine Einladung mit einem Setup-Token.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Name <RequiredLabel />
									</FormLabel>
									<FormControl>
										<Input placeholder="Name der Organisation" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										E-Mail-Adresse <RequiredLabel />
									</FormLabel>
									<FormControl>
										<Input
											placeholder="kontakt@example.com"
											type="email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="is_thi_department"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">
											THI-Abteilung / Hochschuleinrichtung
										</FormLabel>
										<p className="text-sm text-muted-foreground">
											Aktivieren, wenn es sich nicht um eine studentische
											Vereinigung handelt. Einträge erscheinen im THI-Services-
											Bereich der App.
										</p>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={isLoading}
											aria-label="Organizer-Typ THI"
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={isLoading}
							>
								Abbrechen
							</Button>
							<Button type="submit" disabled={isLoading}>
								{isLoading ? 'Einladung senden...' : 'Einladung senden'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
