import { CalendarSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventsEmptyStateProps {
	readonly title?: string
	readonly description?: string
	readonly className?: string
}

export function EventsEmptyState({
	title = 'Keine Events gefunden',
	description = 'Passe die Filter an oder erweitere den Zeitraum, um Ergebnisse zu sehen.',
	className
}: EventsEmptyStateProps) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center px-6 py-20 text-center',
				className
			)}
		>
			<div className="mb-4 flex size-12 items-center justify-center rounded-full border bg-background shadow-sm">
				<CalendarSearch className="size-5 text-muted-foreground" aria-hidden />
			</div>
			<p className="text-sm font-medium tracking-tight">{title}</p>
			<p className="mt-1.5 max-w-xs text-sm text-muted-foreground leading-relaxed">
				{description}
			</p>
		</div>
	)
}
