import { de } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { Clock, ExternalLink, MapPin, Share2, Users } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AuthFooter } from '@/components/auth/auth-footer'
import { ShareButtons } from '@/components/share-buttons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type Event = {
	id: number
	organizer_id: number
	title_de: string
	title_en: string
	description_de?: string
	description_en?: string
	start_date_time: string
	end_date_time: string
	event_url?: string
	location?: string
	publish_app: boolean
	publish_newsletter: boolean
	publish_in_ical: boolean
	publish_web: boolean
	created_at: string
	updated_at: string
}

type Organizer = {
	id: number
	name: string
	description_de?: string
	description_en?: string
	website_url?: string
	instagram_url?: string
	location?: string
	created_at: string
	updated_at: string
}

const baseUrl = process.env.BACKEND_URL || 'http://localhost:8080'

async function getPublicEvent(id: number): Promise<Event> {
	const response = await fetch(`${baseUrl}/api/v1/public/events/${id}`, {
		cache: 'no-store'
	})

	if (!response.ok) {
		notFound()
	}

	return response.json()
}

async function getPublicOrganizer(id: number): Promise<Organizer | null> {
	try {
		const response = await fetch(`${baseUrl}/api/v1/public/organizers/${id}`, {
			cache: 'no-store'
		})

		if (!response.ok) {
			return null
		}

		return response.json()
	} catch {
		return null
	}
}

export default async function PublicEventPage({
	params
}: {
	params: Promise<{ id: string }>
}) {
	const resolvedParams = await params
	const id = Number(resolvedParams.id)

	if (!Number.isFinite(id)) {
		notFound()
	}

	const event = await getPublicEvent(id)
	const organizer = event.organizer_id
		? await getPublicOrganizer(event.organizer_id)
		: null

	const formatDateTime = (date: string) => {
		return formatInTimeZone(
			new Date(date),
			'Europe/Berlin',
			"EEEE, d. MMMM yyyy 'um' HH:mm",
			{
				locale: de
			}
		)
	}

	const formatTime = (date: string) => {
		return formatInTimeZone(new Date(date), 'Europe/Berlin', 'HH:mm')
	}

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<div
				className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm"
				style={{
					backdropFilter: 'blur(8px)',
					WebkitBackdropFilter: 'blur(8px)'
				}}
			>
				<div className="container mx-auto px-4 py-6">
					<div className="max-w-4xl mx-auto">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold text-foreground">
									{event.title_de}
								</h1>
								<p className="text-muted-foreground mt-1">{event.title_en}</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Event Details */}
						<div className="lg:col-span-2 space-y-6">
							{/* Event Info */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Clock className="h-5 w-5" />
										Event Details
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Date and Time */}
									<div className="flex items-start gap-4">
										<Clock className="h-5 w-5 text-muted-foreground mt-1" />
										<div>
											<p className="font-semibold">
												{formatDateTime(event.start_date_time)}
											</p>
											<p className="text-sm text-muted-foreground">
												bis {formatTime(event.end_date_time)}
											</p>
										</div>
									</div>

									{/* Location */}
									{event.location && (
										<div className="flex items-start gap-4">
											<MapPin className="h-5 w-5 text-muted-foreground mt-1" />
											<div>
												<p className="font-semibold">Ort</p>
												<p className="text-muted-foreground">
													{event.location}
												</p>
											</div>
										</div>
									)}

									{/* Event URL */}
									{event.event_url && (
										<div className="flex items-start gap-4">
											<ExternalLink className="h-5 w-5 text-muted-foreground mt-1" />
											<div>
												<p className="font-semibold">Weitere Informationen</p>
												<a
													href={event.event_url}
													target="_blank"
													rel="noopener noreferrer"
													className="text-primary hover:underline"
												>
													{event.event_url}
												</a>
											</div>
										</div>
									)}

									<Separator />

									{/* Description */}
									{event.description_de && (
										<div>
											<h3 className="font-semibold mb-2">Beschreibung</h3>
											<p className="text-muted-foreground whitespace-pre-wrap">
												{event.description_de}
											</p>
										</div>
									)}

									{event.description_en && (
										<div>
											<h3 className="font-semibold mb-2">Description</h3>
											<p className="text-muted-foreground whitespace-pre-wrap">
												{event.description_en}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Organizer Info */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Users className="h-5 w-5" />
										Veranstalter
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{organizer ? (
										<>
											<div>
												<h4 className="font-semibold">{organizer.name}</h4>
												{organizer.description_de && (
													<p className="text-sm text-muted-foreground mt-1">
														{organizer.description_de}
													</p>
												)}
												{organizer.description_en && (
													<p className="text-sm text-muted-foreground mt-1">
														{organizer.description_en}
													</p>
												)}
											</div>

											{organizer.location && (
												<div className="flex items-center gap-2">
													<MapPin className="h-4 w-4 text-muted-foreground" />
													<span className="text-sm text-muted-foreground">
														{organizer.location}
													</span>
												</div>
											)}

											<div className="flex gap-2">
												{organizer.website_url && (
													<Button variant="outline" size="sm" asChild>
														<a
															href={organizer.website_url}
															target="_blank"
															rel="noopener noreferrer"
														>
															Website
														</a>
													</Button>
												)}
												{organizer.instagram_url && (
													<Button variant="outline" size="sm" asChild>
														<a
															href={organizer.instagram_url}
															target="_blank"
															rel="noopener noreferrer"
														>
															Instagram
														</a>
													</Button>
												)}
											</div>
										</>
									) : (
										<div className="text-sm text-muted-foreground">
											Keine Organisator-Informationen verfügbar.
										</div>
									)}
								</CardContent>
							</Card>

							{/* Share */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Share2 className="h-5 w-5" />
										Teilen
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<ShareButtons eventTitle={event.title_de} />
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>

			<AuthFooter />
		</div>
	)
}
