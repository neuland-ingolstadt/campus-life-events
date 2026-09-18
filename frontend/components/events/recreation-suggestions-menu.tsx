'use client'

import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { RecreationCandidate } from '@/client/types.gen'
import { Button } from '@/components/ui/button'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger
} from '@/components/ui/hover-card'
import { formatInCampusTimeZone } from '@/lib/date-time'
import { cn } from '@/lib/utils'

interface RecreationSuggestionsMenuProps {
	readonly candidates: RecreationCandidate[]
	readonly onRecreate: (eventId: number) => void
}

export function RecreationSuggestionsMenu({
	candidates,
	onRecreate
}: RecreationSuggestionsMenuProps) {
	const [open, setOpen] = useState(false)
	const reducedMotion = useReducedMotion()

	return (
		<HoverCard
			open={open}
			onOpenChange={setOpen}
			openDelay={350}
			closeDelay={120}
		>
			<HoverCardTrigger asChild>
				<Button
					type="button"
					size="sm"
					className={cn(
						'rounded-l-none border-l border-primary-foreground/20 px-2',
						open && 'bg-primary/90'
					)}
					aria-label="Erneut anlegen"
					aria-expanded={open}
					onClick={() => setOpen((current) => !current)}
				>
					<ChevronDown
						className={cn(
							'h-4 w-4 transition-transform duration-150',
							open && 'rotate-180'
						)}
					/>
				</Button>
			</HoverCardTrigger>
			<HoverCardContent
				align="end"
				side="bottom"
				sideOffset={10}
				collisionPadding={16}
				className="w-[min(18.5rem,calc(100vw-2rem))] !border-0 !bg-transparent !p-0 !shadow-none"
			>
				<ul className="flex flex-col gap-2">
					{candidates.map((candidate, index) => {
						const lastStart = formatInCampusTimeZone(
							candidate.last_start_date_time,
							'dd.MM.yyyy'
						)
						const location = candidate.event.location?.trim()
						const meta = location
							? `${candidate.occurrence_count}× · ${lastStart} · ${location}`
							: `${candidate.occurrence_count}× · ${lastStart}`

						return (
							<li key={candidate.event.id}>
								<motion.button
									type="button"
									initial={reducedMotion ? false : { opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{
										delay: reducedMotion ? 0 : index * 0.04,
										duration: 0.2,
										ease: [0.22, 1, 0.36, 1]
									}}
									className="flex w-full flex-col items-stretch gap-1 rounded-xl border bg-popover px-4 py-3 text-left shadow-md transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() => {
										setOpen(false)
										onRecreate(candidate.event.id)
									}}
								>
									<span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
										{candidate.event.title_de}
									</span>
									<span className="truncate text-xs leading-snug text-muted-foreground">
										{meta}
									</span>
								</motion.button>
							</li>
						)
					})}
				</ul>
			</HoverCardContent>
		</HoverCard>
	)
}
