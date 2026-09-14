import { de } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { CalendarDays, ExternalLink, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import NeulandPalm from '@/components/neuland-palm'
import { PublicEventActions } from '@/components/public-event-actions'
import { ThemeToggle } from '@/components/theme-toggle'
import { UnifiedFooter } from '@/components/unified-footer'
import { CAMPUS_TIME_ZONE } from '@/lib/date-time'

type PublicEvent = {
	id: number
	organizer_id: number
	organizer_name: string
	title_de: string
	title_en: string
	description_de?: string
	description_en?: string
	start_date_time: string
	end_date_time: string
	event_url?: string
	location?: string
	publish_web: boolean
}

type PublicOrganizer = {
	id: number
	name: string
	description_de?: string
	description_en?: string
	website_url?: string
	instagram_url?: string
	location?: string
}

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'
const siteUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL

async function getPublicEvent(id: number): Promise<PublicEvent> {
	const response = await fetch(`${backendUrl}/api/v1/public/events/${id}`, {
		cache: 'no-store'
	})

	if (!response.ok) {
		notFound()
	}

	return response.json()
}

async function getPublicOrganizer(id: number): Promise<PublicOrganizer | null> {
	try {
		const response = await fetch(
			`${backendUrl}/api/v1/public/organizers/${id}`,
			{
				cache: 'no-store'
			}
		)

		if (!response.ok) {
			return null
		}

		return response.json()
	} catch {
		return null
	}
}

function formatCampus(date: string, pattern: string) {
	return formatInTimeZone(new Date(date), CAMPUS_TIME_ZONE, pattern, {
		locale: de
	})
}

function mapsUrl(location: string) {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

function sameDay(startIso: string, endIso: string) {
	return (
		formatCampus(startIso, 'yyyy-MM-dd') === formatCampus(endIso, 'yyyy-MM-dd')
	)
}

export async function generateMetadata({
	params
}: {
	params: Promise<{ id: string }>
}): Promise<Metadata> {
	const { id: rawId } = await params
	const id = Number(rawId)

	if (!Number.isFinite(id)) {
		return {
			title: 'Event nicht gefunden'
		}
	}

	try {
		const event = await getPublicEvent(id)
		if (!event.publish_web) {
			return { title: 'Event nicht gefunden' }
		}

		const when = formatCampus(
			event.start_date_time,
			"EEEE, d. MMMM yyyy 'um' HH:mm"
		)
		const description = [
			when,
			event.location,
			event.description_de?.slice(0, 140)
		]
			.filter(Boolean)
			.join(' · ')

		const canonical = siteUrl
			? `${siteUrl.replace(/\/$/, '')}/e/${event.id}`
			: undefined

		return {
			title: event.title_de,
			description,
			robots: {
				index: true,
				follow: true
			},
			alternates: canonical ? { canonical } : undefined,
			openGraph: {
				title: event.title_de,
				description,
				type: 'website',
				locale: 'de_DE',
				url: canonical
			},
			twitter: {
				card: 'summary',
				title: event.title_de,
				description
			}
		}
	} catch {
		return {
			title: 'Event nicht gefunden'
		}
	}
}

export default async function PublicEventPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const { id: rawId } = await params
	const id = Number(rawId)

	if (!Number.isFinite(id)) {
		notFound()
	}

	const event = await getPublicEvent(id)

	if (!event.publish_web) {
		notFound()
	}

	const organizer = event.organizer_id
		? await getPublicOrganizer(event.organizer_id)
		: null

	const showEnglishTitle =
		Boolean(event.title_en) && event.title_en !== event.title_de
	const isSameDay = sameDay(event.start_date_time, event.end_date_time)
	const startLabel = formatCampus(
		event.start_date_time,
		"EEEE, d. MMMM yyyy '·' HH:mm"
	)
	const endLabel = isSameDay
		? formatCampus(event.end_date_time, 'HH:mm')
		: formatCampus(event.end_date_time, "EEEE, d. MMMM yyyy '·' HH:mm")

	return (
		<div className="relative flex min-h-screen flex-col bg-background">
			<div
				className="pointer-events-none absolute inset-0 overflow-hidden"
				aria-hidden
			>
				<div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,oklch(0.92_0.02_250/_0.55),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.28_0.03_250/_0.5),transparent_60%)]" />
			</div>

			<header className="relative z-10 border-b">
				<div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
					<Link
						href="https://neuland-ingolstadt.de"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2.5 text-foreground"
					>
						<NeulandPalm className="size-6" color="currentColor" />
						<span className="text-sm font-semibold tracking-tight">
							Campus Life
						</span>
					</Link>
					<ThemeToggle variant="page" menuSide="bottom" />
				</div>
			</header>

			<main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
				<section className="order-1 space-y-4">
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
						{event.organizer_name}
					</p>
					<div className="space-y-2">
						<h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
							{event.title_de}
						</h1>
						{showEnglishTitle ? (
							<p className="text-lg text-muted-foreground sm:text-xl">
								{event.title_en}
							</p>
						) : null}
					</div>

					<div className="space-y-3 pt-2 text-base sm:text-lg">
						<div className="flex items-start gap-3">
							<CalendarDays className="mt-1 size-5 shrink-0 text-muted-foreground" />
							<div className="min-w-0">
								<p className="font-medium tabular-nums">{startLabel}</p>
								<p className="text-sm text-muted-foreground tabular-nums sm:text-base">
									bis {endLabel}
									<span className="text-muted-foreground/80">
										{' '}
										· Europe/Berlin
									</span>
								</p>
							</div>
						</div>

						{event.location ? (
							<div className="flex items-start gap-3">
								<MapPin className="mt-1 size-5 shrink-0 text-muted-foreground" />
								<div className="min-w-0">
									<a
										href={mapsUrl(event.location)}
										target="_blank"
										rel="noopener noreferrer"
										className="font-medium underline-offset-4 hover:underline"
									>
										{event.location}
									</a>
									<p className="text-sm text-muted-foreground">
										In Maps öffnen
									</p>
								</div>
							</div>
						) : null}
					</div>
				</section>

				<div className="order-3 mt-12 border-t pt-10 sm:order-2 sm:mt-8 sm:border-0 sm:pt-0">
					<PublicEventActions
						eventId={event.id}
						title={event.title_de}
						description={event.description_de}
						location={event.location}
						eventUrl={event.event_url}
						startIso={event.start_date_time}
						endIso={event.end_date_time}
					/>
				</div>

				{(event.description_de || event.description_en) && (
					<section className="order-2 mt-12 space-y-6 border-t pt-10 sm:order-3">
						{event.description_de ? (
							<div className="space-y-3">
								<h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
									Beschreibung
								</h2>
								<p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
									{event.description_de}
								</p>
							</div>
						) : null}
						{event.description_en ? (
							<div className="space-y-3">
								<h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
									Description
								</h2>
								<p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
									{event.description_en}
								</p>
							</div>
						) : null}
					</section>
				)}

				{organizer ? (
					<section className="order-2 mt-12 space-y-4 border-t pt-10 sm:order-4">
						<h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
							Veranstalter
						</h2>
						<div className="space-y-3">
							<p className="text-xl font-semibold tracking-tight">
								{organizer.name}
							</p>
							{organizer.description_de ? (
								<p className="text-sm leading-relaxed text-muted-foreground">
									{organizer.description_de}
								</p>
							) : organizer.description_en ? (
								<p className="text-sm leading-relaxed text-muted-foreground">
									{organizer.description_en}
								</p>
							) : null}
							{organizer.location ? (
								<p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
									<MapPin className="size-3.5 shrink-0" />
									{organizer.location}
								</p>
							) : null}
							{(organizer.website_url || organizer.instagram_url) && (
								<div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-sm">
									{organizer.website_url ? (
										<a
											href={organizer.website_url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
										>
											Website
											<ExternalLink className="size-3.5" />
										</a>
									) : null}
									{organizer.instagram_url ? (
										<a
											href={organizer.instagram_url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
										>
											Instagram
											<ExternalLink className="size-3.5" />
										</a>
									) : null}
								</div>
							)}
						</div>
					</section>
				) : null}
			</main>

			<div className="relative z-10 mt-auto">
				<UnifiedFooter variant="app" showThemeToggle={false} />
			</div>
		</div>
	)
}
