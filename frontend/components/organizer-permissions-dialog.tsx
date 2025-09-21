'use client'

import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { updateOrganizerPermissions } from '@/client'
import type { UpdateOrganizerPermissionsRequest } from '@/client/types.gen'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function OrganizerPermissionsDialog({
	organizerId,
	newsletterEnabled,
	onSuccess
}: {
	organizerId: number
	newsletterEnabled: boolean
	onSuccess?: () => void
}) {
	const [open, setOpen] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [newsletter, setNewsletter] = useState(newsletterEnabled)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (open) {
			setNewsletter(newsletterEnabled)
			setError(null)
		}
	}, [newsletterEnabled, open])

	const handleSubmit = async () => {
		setIsSaving(true)
		setError(null)
		try {
			const payload: UpdateOrganizerPermissionsRequest = { newsletter }
			await updateOrganizerPermissions({
				path: { id: organizerId },
				body: payload
			})
			setOpen(false)
			onSuccess?.()
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Fehler beim Speichern der Berechtigungen'
			)
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
					title="Newsletter-Berechtigung verwalten"
				>
					<ShieldCheck className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Newsletter-Berechtigungen</DialogTitle>
					<DialogDescription>
						Steuere, ob dieser Verein Zugriff auf den Newsletterbereich erhält.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="space-y-1">
							<Label htmlFor={`newsletter-permission-${organizerId}`}>
								Newsletter freigeben
							</Label>
							<p className="text-sm text-muted-foreground">
								Ermöglicht dem Verein den Zugriff auf Vorlagen und Daten für den
								wöchentlichen Newsletter.
							</p>
						</div>
						<Switch
							id={`newsletter-permission-${organizerId}`}
							checked={newsletter}
							onCheckedChange={setNewsletter}
							disabled={isSaving}
						/>
					</div>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={isSaving}
					>
						Abbrechen
					</Button>
					<Button onClick={handleSubmit} disabled={isSaving}>
						{isSaving ? 'Speichert…' : 'Speichern'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
