'use client'

import { Copy, MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react'
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

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
		<div className="flex">
			<div className="flex items-center gap-2">
				{canManage && (
					<>
						<Button
							asChild
							variant="outline"
							size="sm"
							className="h-8 px-2"
							title="Bearbeiten"
						>
							<Link href={`/events/${event.id}`}>
								<Pencil className="h-4 w-4" />
							</Link>
						</Button>
						<AlertDialog>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8"
										title="Aktionen"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									{event.publish_web && (
										<DropdownMenuItem onSelect={handleShare}>
											<Share2 className="h-4 w-4" />
											<span>Share link kopieren</span>
										</DropdownMenuItem>
									)}
									<DropdownMenuItem asChild>
										<Link
											href={`/events/${event.id}/duplicate`}
											className="flex items-center gap-2"
										>
											<Copy className="h-4 w-4" />
											<span>Duplizieren</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<AlertDialogTrigger asChild>
										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onSelect={(event) => event.preventDefault()}
										>
											<Trash2 className="h-4 w-4" />
											<span>Löschen</span>
										</DropdownMenuItem>
									</AlertDialogTrigger>
								</DropdownMenuContent>
							</DropdownMenu>
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
					</>
				)}
				{/* Share action moved into dropdown */}
			</div>
		</div>
	)
}
