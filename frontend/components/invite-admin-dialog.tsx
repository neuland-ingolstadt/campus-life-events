'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { inviteAdmin } from '@/client'
import type { InviteAdminRequest } from '@/client/types.gen'
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

const inviteAdminSchema = z.object({
	displayName: z.string().min(1, 'Name ist erforderlich'),
	email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein')
})

export type InviteAdminFormValues = z.infer<typeof inviteAdminSchema>

export function InviteAdminDialog() {
	const [open, setOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm<InviteAdminFormValues>({
		resolver: zodResolver(inviteAdminSchema),
		defaultValues: {
			displayName: '',
			email: ''
		}
	})

	const onSubmit = async (values: InviteAdminFormValues) => {
		setIsLoading(true)
		try {
			const payload: InviteAdminRequest = {
				display_name: values.displayName,
				email: values.email
			}
			await inviteAdmin({ body: payload })
			form.reset()
			setOpen(false)
		} catch (error) {
			console.error('Failed to invite admin:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="flex items-center gap-2">
					<UserPlus className="h-4 w-4" />
					Neue*n Admin einladen
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Administrator*in einladen</DialogTitle>
					<DialogDescription>
						Lade eine neue Administratorin oder einen neuen Administrator ein.
						Die Einladung ist sieben Tage gültig.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="displayName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Name <RequiredLabel />
									</FormLabel>
									<FormControl>
										<Input placeholder="Name der Person" {...field} />
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
											placeholder="admin@example.com"
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
								{isLoading ? 'Einladung wird gesendet…' : 'Einladung senden'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
