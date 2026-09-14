'use client'

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip'
import type { EventVisibilityMode } from '@/lib/event-visibility'
import {
	eventVisibilityDotClass,
	eventVisibilityLabel,
	eventVisibilityTooltip
} from '@/lib/event-visibility'
import { cn } from '@/lib/utils'

export function EventOrganizerBadge({
	name,
	isOwn
}: {
	readonly name: string
	readonly isOwn: boolean
}) {
	return (
		<div
			className={cn(
				'inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-medium break-words',
				isOwn
					? 'border-primary/30 bg-primary text-primary-foreground'
					: 'border-border bg-muted/60 text-foreground'
			)}
		>
			{name}
		</div>
	)
}

export function EventVisibilityIndicator({
	mode
}: {
	readonly mode: EventVisibilityMode
}) {
	const label = eventVisibilityLabel(mode)

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-foreground">
					<span
						className={cn(
							'size-1.5 shrink-0 rounded-full',
							eventVisibilityDotClass(mode)
						)}
						aria-hidden
					/>
					{label}
				</div>
			</TooltipTrigger>
			<TooltipContent>{eventVisibilityTooltip(mode)}</TooltipContent>
		</Tooltip>
	)
}
