import { de } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { ArrowUpRight, ExternalLink, MapPin } from 'lucide-react'
import Link from 'next/link'
import { CAMPUS_TIME_ZONE } from '@/lib/date-time'

export type PublicRelatedEvent = {
	id: number
	title_de: string
	start_date_time: string
	location?: string
}

type PublicOrganizerFooterProps = {
	readonly name: string
	readonly description?: string
	readonly location?: string
	readonly websiteUrl?: string
	readonly instagramUrl?: string
	readonly events: readonly PublicRelatedEvent[]
}

export function PublicOrganizerFooter({
	name,
	description,
	location,
	websiteUrl,
	instagramUrl,
	events
}: PublicOrganizerFooterProps) {
	const hasLinks = Boolean(websiteUrl || instagramUrl)

	return (
		<section className="mt-14 space-y-5 border-t pt-8 text-sm text-muted-foreground">
			<div className="space-y-2">
				<p className="text-xs font-medium uppercase tracking-[0.14em]">
					Veranstalter
				</p>
				<p className="font-medium text-foreground/90">{name}</p>
				{description ? (
					<p className="max-w-prose text-xs leading-relaxed">{description}</p>
				) : null}
				{location ? (
					<p className="inline-flex items-center gap-1.5 text-xs">
						<MapPin className="size-3 shrink-0" />
						{location}
					</p>
				) : null}
				{hasLinks ? (
					<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
						{websiteUrl ? (
							<a
								href={websiteUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
							>
								Website
								<ExternalLink className="size-3" />
							</a>
						) : null}
						{instagramUrl ? (
							<a
								href={instagramUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
							>
								Instagram
								<ExternalLink className="size-3" />
							</a>
						) : null}
					</div>
				) : null}
			</div>

			{events.length > 0 ? (
				<div className="space-y-2">
					<p className="text-xs font-medium uppercase tracking-[0.14em]">
						Andere Events
					</p>
					<ul className="divide-y divide-border/60">
						{events.map((related) => {
							const dateLabel = formatInTimeZone(
								new Date(related.start_date_time),
								CAMPUS_TIME_ZONE,
								'dd.MM.',
								{ locale: de }
							)
							const time = formatInTimeZone(
								new Date(related.start_date_time),
								CAMPUS_TIME_ZONE,
								'HH:mm'
							)

							return (
								<li key={related.id}>
									<Link
										href={`/e/${related.id}`}
										className="group flex items-center gap-3 py-2.5 transition-colors hover:text-foreground"
									>
										<span className="w-11 shrink-0 text-xs tabular-nums">
											{dateLabel}
										</span>
										<span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground/80 group-hover:text-foreground">
											{related.title_de}
										</span>
										<span className="shrink-0 text-xs tabular-nums">
											{time}
										</span>
										<ArrowUpRight className="size-3 shrink-0 opacity-40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-80" />
									</Link>
								</li>
							)
						})}
					</ul>
				</div>
			) : null}
		</section>
	)
}
