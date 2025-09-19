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

const createOrganizerSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich'),
	email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein')
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
			email: ''
		}
	})

	const onSubmit = async (values: CreateOrganizerFormValues) => {
		setIsLoading(true)
		try {
			const payload: CreateOrganizerRequest = {
				name: values.name,
				email: values.email
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
					Neuer Verein
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Neuen Verein einladen</DialogTitle>
					<DialogDescription>
						Lade einen neuen Verein ein, indem du Name und E-Mail-Adresse
						angibst. Der Verein erhält eine Einladung mit einem Setup-Token.
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
										<Input placeholder="Name des Vereins" {...field} />
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
											placeholder="verein@example.com"
											type="email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
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
