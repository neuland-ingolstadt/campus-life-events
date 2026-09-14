'use client'

import { Building2, Users } from 'lucide-react'
import type { OrganizerKind } from '@/client/types.gen'
import { cn } from '@/lib/utils'

const LABELS: Record<OrganizerKind, string> = {
	STUDENT_ASSOCIATION: 'Campus Life',
	THI_DEPARTMENT: 'THI'
}

export function OrganizerKindBadge({
	kind,
	showIcon = false,
	className
}: {
	kind: OrganizerKind
	showIcon?: boolean
	className?: string
}) {
	const Icon = kind === 'THI_DEPARTMENT' ? Building2 : Users
	const isThi = kind === 'THI_DEPARTMENT'

	return (
		<div
			className={cn(
				'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
				isThi
					? 'border-border bg-muted/60 text-foreground'
					: 'border-primary/30 bg-primary text-primary-foreground',
				className
			)}
		>
			{showIcon ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
			{LABELS[kind]}
		</div>
	)
}
