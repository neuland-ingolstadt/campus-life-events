'use client'

import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { updateOrganizerPermissions } from '@/client'
import type {
	OrganizerKind,
	UpdateOrganizerPermissionsRequest
} from '@/client/types.gen'
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
	organizerKind,
	onSuccess
}: {
	organizerId: number
	newsletterEnabled: boolean
	organizerKind: OrganizerKind
	onSuccess?: () => void
}) {
	const [open, setOpen] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [newsletter, setNewsletter] = useState(newsletterEnabled)
	const [isThiDepartment, setIsThiDepartment] = useState(
		organizerKind === 'THI_DEPARTMENT'
	)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (open) {
			setNewsletter(newsletterEnabled)
			setIsThiDepartment(organizerKind === 'THI_DEPARTMENT')
			setError(null)
		}
	}, [newsletterEnabled, organizerKind, open])

	const handleSubmit = async () => {
		setIsSaving(true)
		setError(null)
		try {
			const payload: UpdateOrganizerPermissionsRequest = {
				newsletter: isThiDepartment ? false : newsletter,
				organizer_kind: isThiDepartment
					? 'THI_DEPARTMENT'
					: 'STUDENT_ASSOCIATION'
			}
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
					title="Admin-Einstellungen für diese Organisation"
				>
					<ShieldCheck className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Admin-Einstellungen</DialogTitle>
					<DialogDescription>
						Newsletter-Zugriff und Anzeige-Bereich in der App (Campus Life vs.
						THI Services).
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="space-y-1">
							<Label htmlFor={`newsletter-permission-${organizerId}`}>
								Newsletter freigeben
							</Label>
							<p className="text-sm text-muted-foreground">
								Nur für Hochschulgruppen (Campus Life): Zugriff auf
								Newsletter-Vorlagen und Vereins-Termine. Für THI-Konten nicht
								verfügbar.
							</p>
						</div>
						<Switch
							id={`newsletter-permission-${organizerId}`}
							checked={isThiDepartment ? false : newsletter}
							onCheckedChange={setNewsletter}
							disabled={isSaving || isThiDepartment}
						/>
					</div>
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="space-y-1">
							<Label htmlFor={`thi-kind-${organizerId}`}>
								THI-Abteilung / Hochschuleinrichtung
							</Label>
							<p className="text-sm text-muted-foreground">
								Wenn aktiv, gelten die öffentlichen Termine dieses Kontos als
								THI Services statt Campus Life.
							</p>
						</div>
						<Switch
							id={`thi-kind-${organizerId}`}
							checked={isThiDepartment}
							onCheckedChange={(checked) => {
								setIsThiDepartment(checked)
								if (checked) {
									setNewsletter(false)
								}
							}}
							disabled={isSaving}
							aria-label="Organizer-Typ THI"
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
