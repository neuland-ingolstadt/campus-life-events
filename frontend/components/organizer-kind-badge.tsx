'use client'

import { Building2, Users } from 'lucide-react'
import type { OrganizerKind } from '@/client/types.gen'
import { Badge } from '@/components/ui/badge'
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

	return (
		<Badge
			variant="outline"
			className={cn(
				'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
				kind === 'THI_DEPARTMENT'
					? 'border-violet-500/35 bg-violet-500/5 text-violet-700 dark:border-violet-400/40 dark:text-violet-200'
					: 'border-primary/20 bg-primary/5 text-primary',
				className
			)}
		>
			{showIcon ? <Icon className="h-3 w-3 mr-1 shrink-0" aria-hidden /> : null}
			{LABELS[kind]}
		</Badge>
	)
}
