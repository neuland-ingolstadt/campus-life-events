'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { createOrganizer } from '@/client'
import type { CreateOrganizerRequest } from '@/client/types.gen'
import { Button } from '@/components/ui/button'
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
import { SidebarTrigger } from '@/components/ui/sidebar'

const createOrganizerSchema = z.object({
	name: z.string().min(1, 'Name ist erforderlich'),
	email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein')
})

export type CreateOrganizerFormValues = z.infer<typeof createOrganizerSchema>

export default function NewOrganizerPage() {
	const router = useRouter()
	const qc = useQueryClient()
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<CreateOrganizerFormValues>({
		resolver: zodResolver(createOrganizerSchema),
		defaultValues: {
			name: '',
			email: ''
		}
	})

	async function onSave(values: CreateOrganizerFormValues) {
		setIsLoading(true)
		try {
			const payload: CreateOrganizerRequest = {
				name: values.name,
				email: values.email
			}
			await createOrganizer({ body: payload })
			await qc.invalidateQueries({ queryKey: ['organizers'] })
			await qc.invalidateQueries({ queryKey: ['organizers-admin'] })
			router.push('/organizers')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Neuen Verein einladen</h1>
				</div>
			</header>
			<div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
				<div className="max-w-2xl">
					<h2 className="text-2xl font-bold tracking-tight mb-2">
						Verein einladen
					</h2>
					<p className="text-muted-foreground mb-6">
						Lade einen neuen Verein ein, indem du Name und E-Mail-Adresse
						eingibst. Der Verein erhält eine Einladung mit einem Setup-Token,
						mit dem er sich registrieren kann.
					</p>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSave)}
							className="flex flex-col gap-6"
						>
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

							<div className="flex justify-end pt-2">
								<Button
									type="submit"
									disabled={isLoading}
									size="lg"
									className="px-8"
								>
									{isLoading ? 'Einladung senden...' : 'Einladung senden'}
								</Button>
							</div>
						</form>
					</Form>
				</div>
			</div>
		</div>
	)
}
