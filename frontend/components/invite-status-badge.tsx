'use client'

import type { InviteStatus } from '@/client/types.gen'
import { cn } from '@/lib/utils'

const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
	PENDING: 'Ausstehend',
	EXPIRED: 'Abgelaufen',
	COMPLETED: 'Abgeschlossen'
}

const INVITE_STATUS_DOT: Record<InviteStatus, string> = {
	PENDING: 'bg-amber-600 dark:bg-amber-400',
	EXPIRED: 'bg-destructive',
	COMPLETED: 'bg-emerald-600 dark:bg-emerald-400'
}

export function InviteStatusBadge({
	status
}: {
	readonly status: InviteStatus
}) {
	return (
		<div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-foreground">
			<span
				className={cn(
					'size-1.5 shrink-0 rounded-full',
					INVITE_STATUS_DOT[status]
				)}
				aria-hidden
			/>
			{INVITE_STATUS_LABEL[status]}
		</div>
	)
}
