'use client'

import { Pencil, Share2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { Event as ApiEvent } from '@/client/types.gen'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface EventActionsCellProps {
	readonly event: ApiEvent
	readonly canManage: boolean
	readonly onDelete: (id: number) => Promise<void>
}

export function EventActionsCell({
	event,
	canManage,
	onDelete
}: EventActionsCellProps) {
	const shareUrl = useMemo(() => {
		if (typeof window === 'undefined') {
			return ''
		}
		return `${window.location.origin}/e/${event.id}`
	}, [event.id])

	const handleShare = useCallback(() => {
		if (!shareUrl || typeof navigator === 'undefined') {
			return
		}
		void navigator.clipboard.writeText(shareUrl)
		toast.success(`Öffentlicher Link wurde in die Zwischenablage kopiert.`)
	}, [shareUrl])

	return (
		<div className="flex justify-center">
			<div className="flex items-center gap-2">
				{canManage && (
					<div className="flex items-center gap-2">
						<Link href={`/events/${event.id}`}>
							<Button variant="outline" size="sm" className="h-8 px-2">
								<Pencil className="h-4 w-4" />
							</Button>
						</Link>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" size="sm" className="h-8 px-2">
									<Trash2 className="h-4 w-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Event löschen</AlertDialogTitle>
									<AlertDialogDescription>
										Bist du sicher, dass du "{event.title_de}" löschen möchtest?
										Diese Aktion kann nicht rückgängig gemacht werden.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Abbrechen</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => onDelete(event.id)}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										Löschen
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)}
				{event.publish_web && (
					<Button
						variant="outline"
						size="sm"
						className="h-8 px-2"
						onClick={handleShare}
						title="Share link kopieren"
					>
						<Share2 className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	)
}
