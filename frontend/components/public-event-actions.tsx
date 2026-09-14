'use client'

import { CalendarPlus, Copy, ExternalLink, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { publicEventShareUrl } from '@/lib/public-event-url'

type PublicEventActionsProps = {
	readonly eventId: number
	readonly title: string
	readonly description?: string
	readonly location?: string
	readonly eventUrl?: string
	readonly startIso: string
	readonly endIso: string
}

function toUtcStamp(iso: string) {
	const date = new Date(iso)
	const yyyy = date.getUTCFullYear()
	const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
	const dd = String(date.getUTCDate()).padStart(2, '0')
	const hh = String(date.getUTCHours()).padStart(2, '0')
	const mi = String(date.getUTCMinutes()).padStart(2, '0')
	const ss = String(date.getUTCSeconds()).padStart(2, '0')
	return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`
}

function escapeIcs(value: string) {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/,/g, '\\,')
		.replace(/;/g, '\\;')
}

export function PublicEventActions({
	eventId,
	title,
	description,
	location,
	eventUrl,
	startIso,
	endIso
}: PublicEventActionsProps) {
	const startStamp = toUtcStamp(startIso)
	const endStamp = toUtcStamp(endIso)
	const shareUrl = publicEventShareUrl(eventId)

	function handleCopyLink() {
		void navigator.clipboard.writeText(shareUrl)
		toast.success('Link wurde in die Zwischenablage kopiert')
	}

	async function handleNativeShare() {
		if (navigator.share) {
			try {
				await navigator.share({
					title,
					url: shareUrl
				})
				return
			} catch {
				handleCopyLink()
				return
			}
		}
		handleCopyLink()
	}

	function handleGoogleCalendar() {
		const params = new URLSearchParams({
			action: 'TEMPLATE',
			text: title,
			dates: `${startStamp}/${endStamp}`
		})
		if (description) {
			params.set('details', description)
		}
		if (location) {
			params.set('location', location)
		}
		window.open(
			`https://calendar.google.com/calendar/render?${params.toString()}`,
			'_blank',
			'noopener,noreferrer'
		)
	}

	function handleDownloadIcs() {
		const lines = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//Campus Life Events//DE',
			'CALSCALE:GREGORIAN',
			'METHOD:PUBLISH',
			'BEGIN:VEVENT',
			`UID:cle-${startStamp}-${encodeURIComponent(title)}@campus-life`,
			`DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
			`DTSTART:${startStamp}`,
			`DTEND:${endStamp}`,
			`SUMMARY:${escapeIcs(title)}`
		]
		if (description) {
			lines.push(`DESCRIPTION:${escapeIcs(description)}`)
		}
		if (location) {
			lines.push(`LOCATION:${escapeIcs(location)}`)
		}
		if (eventUrl) {
			lines.push(`URL:${escapeIcs(eventUrl)}`)
		} else {
			lines.push(`URL:${escapeIcs(shareUrl)}`)
		}
		lines.push('END:VEVENT', 'END:VCALENDAR')

		const blob = new Blob([lines.join('\r\n')], {
			type: 'text/calendar;charset=utf-8'
		})
		const href = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = href
		anchor.download = `${title.replace(/[^\w\-äöüÄÖÜß ]+/g, '').trim() || 'event'}.ics`
		anchor.click()
		URL.revokeObjectURL(href)
	}

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
			<Button type="button" onClick={handleGoogleCalendar}>
				<CalendarPlus className="size-4" />
				Google Kalender
			</Button>
			<Button type="button" variant="outline" onClick={handleDownloadIcs}>
				<CalendarPlus className="size-4" />
				Apple / Outlook (.ics)
			</Button>
			<Button type="button" variant="outline" onClick={handleNativeShare}>
				<Share2 className="size-4" />
				Teilen
			</Button>
			<Button type="button" variant="outline" onClick={handleCopyLink}>
				<Copy className="size-4" />
				Link kopieren
			</Button>
			{eventUrl ? (
				<Button type="button" variant="outline" asChild>
					<a href={eventUrl} target="_blank" rel="noopener noreferrer">
						Weitere Infos
						<ExternalLink className="size-4" />
					</a>
				</Button>
			) : null}
		</div>
	)
}
