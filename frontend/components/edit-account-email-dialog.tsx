'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { updateAccountEmail } from '@/client'
import type { UpdateAccountEmailRequest } from '@/client/types.gen'
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

const schema = z.object({
	email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein')
})

type FormValues = z.infer<typeof schema>

export function EditAccountEmailDialog({
	accountId,
	currentEmail,
	onSuccess,
	disabled,
	title = 'E-Mail-Adresse ändern',
	description = 'Die neue Adresse wird für die Anmeldung und Benachrichtigungen verwendet.'
}: {
	accountId: number
	currentEmail?: string | null
	onSuccess?: () => void
	disabled?: boolean
	title?: string
	description?: string
}) {
	const [open, setOpen] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			email: currentEmail ?? ''
		}
	})

	useEffect(() => {
		if (open) {
			form.reset({ email: currentEmail ?? '' })
			setError(null)
		}
	}, [currentEmail, open, form])

	const onSubmit = async (values: FormValues) => {
		setIsSaving(true)
		setError(null)
		try {
			const body: UpdateAccountEmailRequest = { email: values.email }
			await updateAccountEmail({
				path: { account_id: accountId },
				body,
				throwOnError: true
			})
			setOpen(false)
			onSuccess?.()
		} catch (err: unknown) {
			let message = 'E-Mail konnte nicht gespeichert werden.'
			if (err && typeof err === 'object' && 'message' in err) {
				const m = (err as { message: unknown }).message
				if (typeof m === 'string') message = m
			} else if (typeof err === 'string') {
				message = err
			}
			setError(message)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-8 px-2"
					disabled={disabled}
					title="E-Mail-Adresse bearbeiten"
				>
					<Mail className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4 py-2"
					>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>E-Mail</FormLabel>
									<FormControl>
										<Input
											type="email"
											autoComplete="email"
											disabled={isSaving}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{error ? <p className="text-sm text-destructive">{error}</p> : null}
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={isSaving}
							>
								Abbrechen
							</Button>
							<Button type="submit" disabled={isSaving}>
								{isSaving ? 'Speichert…' : 'Speichern'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
