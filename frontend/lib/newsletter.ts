import type { ErrorResponse, NewsletterDataResponse } from '@/client'
import { getNewsletterData, sendNewsletterPreview } from '@/client'
import type { EventWithOrganizer as ApiEventWithOrganizer } from '@/client/types.gen'

// Use the generated API type to stay in sync with backend
export type EventWithOrganizer = ApiEventWithOrganizer

export interface Organizer {
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

export interface NewsletterData {
	subject: string
	next_week_events: EventWithOrganizer[]
	following_week_events: EventWithOrganizer[]
	all_organizers: Organizer[]
	next_week_start: string
	week_after_start: string
}

export async function fetchNewsletterData(year?: number, week?: number): Promise<NewsletterDataResponse> {
	const options: any = {
		query: {
			year,
			week
		}
	}
	const response = await getNewsletterData(options)

	if (response.error) {
		const err = response.error as ErrorResponse | undefined
		const message = err?.message || 'Failed to fetch newsletter data'
		throw new Error(message)
	}

	if (!response.data) {
		throw new Error('Failed to fetch newsletter data')
	}

	return response.data
}

export async function sendNewsletterPreviewEmail(
	subject: string,
	html: string
): Promise<void> {
	const response = await sendNewsletterPreview({
		body: {
			subject,
			html
		}
	})

	if (response.error) {
		const err = response.error as ErrorResponse | undefined
		const message = err?.message || 'Failed to send newsletter preview'
		throw new Error(message)
	}
}

export function generateNewsletterHTML(
	data: NewsletterDataResponse,
	customText?: string
): string {
	const {
		subject,
		next_week_events,
		following_week_events,
		all_organizers,
		next_week_start,
		week_after_start
	} = data

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleDateString('de-DE', {
			weekday: 'long',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		})
	}

	const formatTime = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	const getWeekNumber = (dateStr: string) => {
		const date = new Date(dateStr)
		const start = new Date(date.getFullYear(), 0, 1)
		const days = Math.floor(
			(date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
		)
		return Math.ceil((days + start.getDay() + 1) / 7)
	}

	const getDateRange = (startDateStr: string, endDateStr: string) => {
		const startDate = new Date(startDateStr)
		const endDate = new Date(endDateStr)
		const startFormatted = startDate.toLocaleDateString('de-DE', {
			day: 'numeric',
			month: 'numeric'
		})
		const endFormatted = endDate.toLocaleDateString('de-DE', {
			day: 'numeric',
			month: 'numeric'
		})
		return `${startFormatted} - ${endFormatted}`
	}

	const escapeHtml = (text: string) => {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')
	}

	const weekNumber = getWeekNumber(next_week_start)
	const weekAfterNumber = getWeekNumber(week_after_start)

	const customTextParagraphs = customText
		? customText
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
		: []

	const renderNextWeekEvents = () => {
		if (next_week_events.length === 0) {
			return '<p style="margin:0;color:#374151;">Keine Veranstaltungen diese Woche.</p>'
		}

		return next_week_events
			.map((event) => {
				const startDate = new Date(event.start_date_time)
				const endDate = new Date(event.end_date_time)
				const isAllDay =
					startDate.getHours() === 0 &&
					startDate.getMinutes() === 0 &&
					endDate.getHours() === 0 &&
					endDate.getMinutes() === 0

				const organizerLink = event.organizer_website
					? `<a href="${escapeHtml(event.organizer_website)}" style="color:#6b7280;text-decoration:none;" target="_blank">${escapeHtml(event.organizer_name)}</a>`
					: `<span style="color:#6b7280;">${escapeHtml(event.organizer_name)}</span>`

				return `
					<table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:25px;margin-bottom:20px;">
						<tr>
							<td>
								<h3 style="font-size:20px;font-weight:bold;color:#215b9c;margin:0 0 8px 0;line-height:1.3;">${escapeHtml(event.title_de)}</h3>
								<p style="font-size:14px;color:#6b7280;margin:0 0 15px 0;">${organizerLink}</p>
								<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:15px;">
									<tr>
										<td>
											<span style="display:inline-block;color:#6b7280;font-size:14px;margin-right:15px;margin-bottom:8px;">
												<span style="margin-right:8px;">📅</span>
												<span style="font-weight:500;">${formatDate(event.start_date_time)}</span>
											</span>
											${
												!isAllDay
													? `<span style="display:inline-block;color:#6b7280;font-size:14px;margin-right:15px;margin-bottom:8px;">
														<span style="margin-right:8px;">🕐</span>
														<span style="font-weight:500;">${formatTime(event.start_date_time)} - ${formatTime(event.end_date_time)}</span>
													</span>`
													: ''
											}
											${
												event.location
													? `<span style="display:inline-block;color:#6b7280;font-size:14px;margin-right:15px;margin-bottom:8px;">
														<span style="margin-right:8px;">📍</span>
														<span style="font-weight:500;">${escapeHtml(event.location)}</span>
													</span>`
													: ''
											}
										</td>
									</tr>
								</table>
								${event.description_de ? `<p style="color:#374151;line-height:1.6;margin:15px 0 0 0;">${escapeHtml(event.description_de)}</p>` : ''}
								${
									event.event_url
										? `
								<table cellpadding="0" cellspacing="0" border="0" style="margin-top:15px;">
									<tr>
										<td align="center" bgcolor="#215b9c" style="background-color:#215b9c;border-radius:6px;">
											<!--[if mso]>
											<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(event.event_url)}" style="height:36px;v-text-anchor:middle;width:150px;" arcsize="17%" strokecolor="#215b9c" fillcolor="#215b9c">
												<w:anchorlock/>
												<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Mehr erfahren</center>
											</v:roundrect>
											<![endif]-->
											<!--[if !mso]><!-->
											<a href="${escapeHtml(event.event_url)}" style="background-color:#215b9c;border:1px solid #215b9c;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:8px 16px;display:inline-block;border-radius:6px;font-family:Arial,sans-serif;" target="_blank">Mehr erfahren</a>
											<!--<![endif]-->
										</td>
									</tr>
								</table>`
										: ''
								}
							</td>
						</tr>
					</table>
				`
			})
			.join('')
	}

	const renderFollowingWeekEvents = () => {
		if (following_week_events.length === 0) {
			return '<p style="margin:0;color:#374151;">Keine Veranstaltungen geplant.</p>'
		}

		return `
			<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-radius:16px;padding:20px;margin-bottom:20px;">
				${following_week_events
					.map((event, index) => {
						const isLast = index === following_week_events.length - 1
						const borderStyle = isLast ? 'none' : '1px solid #e5e7eb'

						return `
							<tr style="border-bottom:${borderStyle};">
								<td style="width:120px;vertical-align:top;padding:12px 0;">
									<span style="font-weight:bold;color:#215b9c;font-size:14px;">${formatDate(event.start_date_time)}</span>
								</td>
								<td style="padding-left:20px;vertical-align:top;padding:12px 0;">
									<p style="font-weight:600;color:#374151;margin:0 0 4px 0;font-size:15px;">${escapeHtml(event.title_de)}</p>
									<p style="font-size:13px;color:#6b7280;margin:0;">
										${formatTime(event.start_date_time)}${event.location ? ` • ${escapeHtml(event.location)}` : ''} • ${escapeHtml(event.organizer_name)}
									</p>
								</td>
							</tr>
						`
					})
					.join('')}
			</table>
		`
	}

	return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="x-apple-disable-message-reformatting">
	<title>${escapeHtml(subject)}</title>
	<!--[if gte mso 9]>
	<xml>
		<o:OfficeDocumentSettings>
			<o:AllowPNG/>
			<o:PixelsPerInch>96</o:PixelsPerInch>
		</o:OfficeDocumentSettings>
	</xml>
	<![endif]-->
	<style>
		body { margin:0; padding:0; }
		table { border-collapse:collapse; }
		img { border:0; display:block; }
		* { font-family:Arial,sans-serif; }
		a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
	</style>
	<!--[if gte mso 9]>
	<style>
		table { border-collapse:collapse; }
		.header-text { color:#ffffff !important; }
		.footer-text { color:#ffffff !important; }
	</style>
	<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
	<!--[if mso | IE]>
	<div style="color:#000000;">
	<![endif]-->
	<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;">
		<tr>
			<td align="center" style="padding:20px 0;">
				<table class="container" width="800" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e5e7eb;">
					<tr>
						<td>
							<img src="https://nbg1.your-objectstorage.com/neuland/uploads/cl-tool/cl-header.webp" alt="Campus Life Header" width="800" style="width:100%;max-width:800px;height:auto;display:block;border:0;">
						</td>
					</tr>
					
					<tr>
						<td bgcolor="#215b9c" style="background-color:#215b9c;padding:32px;">
							<!--[if mso]>
							<table width="100%" cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td>
										<div style="color:#ffffff;">
											<p style="font-size:25px;font-weight:bold;margin:0;color:#ffffff;">Campus Life Newsletter</p>
											<p style="font-size:15px;margin:4px 0 0 0;color:#ffffff;">Kalenderwoche ${weekNumber}</p>
										</div>
									</td>
								</tr>
							</table>
							<![endif]-->
							<!--[if !mso]><!-->
							<p style="font-size:25px;font-weight:bold;margin:0;color:#ffffff;">Campus Life Newsletter</p>
							<p style="font-size:15px;margin:4px 0 0 0;color:#ffffff;">Kalenderwoche ${weekNumber}</p>
							<!--<![endif]-->
						</td>
					</tr>
					
					<tr>
						<td class="content" style="padding:32px;">
							<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="background-color:#f8fafc;border-radius:16px;margin-bottom:30px;padding:15px;">
								<tr>
									<td style="padding:15px;">
										<p style="margin:0 0 8px 0;line-height:1.6;color:#374151;">Hallo zusammen!</p>
										<p style="margin:0;line-height:1.6;color:#374151;">Hier sind die kommenden Veranstaltungen für euch zusammengestellt. Viel Spaß bei den Events!</p>
									</td>
								</tr>
							</table>
							
							${
								customTextParagraphs.length > 0
									? `
								<h2 style="font-size:24px;color:#215b9c;margin:32px 0 16px 0;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">Ankündigungen</h2>
								<table width="100%" cellpadding="20" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;margin-top:15px;margin-bottom:32px;">
									<tr>
										<td>
											${customTextParagraphs
												.map(
													(paragraph, index) =>
														`<p style="margin:${index === customTextParagraphs.length - 1 ? '0' : '0 0 8px 0'};line-height:1.6;color:#374151;">${escapeHtml(paragraph)}</p>`
												)
												.join('')}
										</td>
									</tr>
								</table>
							`
									: ''
							}
							
							<h2 style="font-size:24px;color:#215b9c;margin:32px 0 16px 0;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">Events der Vereine (${getDateRange(next_week_start, week_after_start)})</h2>
							${renderNextWeekEvents()}
							
							<h2 style="font-size:24px;color:#215b9c;margin:32px 0 16px 0;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">Ausblick Kalenderwoche ${weekAfterNumber}</h2>
							${renderFollowingWeekEvents()}
						</td>
					</tr>
					
					<tr>
						<td bgcolor="#f6f6f6" style="background-color:#f6f6f6;padding:32px;">
							<!--[if mso]>
							<table width="100%" cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td align="center">
										<div>
											<h3 style="font-size:20px;font-weight:bold;margin:0 0 8px 0;">Campus Life Events</h3>
											<p style="margin:0 0 16px 0;font-size:14px;">Der Newsletter für studentische Veranstaltungen</p>
											<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
												<b>Die teilnehmenden Vereine und Hochschulgruppen:</b><br>
												${all_organizers.map((org) => escapeHtml(org.name)).join(' • ')}
											</p>
											<p style="margin:0 0 16px 0;font-size:14px;">
												Bei Rückfragen wenden Sie sich bitte an 
												<a href="mailto:campus-life@thi.de" style="color:#60a5fa;text-decoration:none;">campus-life@thi.de</a>
											</p>
											<p style="margin:0 0 16px 0;font-size:14px;">
												Kommunikation studentischer Vereine: 
												<a href="mailto:campus-life@thi.de" style="color:#60a5fa;text-decoration:none;">Campus Life (Studierendenvertretung)</a>
											</p>
											<p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:#9ca3af;">
												<b>Den Campus Life Newsletter nicht mehr empfangen?</b><br>
												Melden Sie sich unter 
												<a href="https://sympa.thi.de/" style="color:#60a5fa;text-decoration:none;">https://sympa.thi.de/</a> 
												an (THI-Login rechts oben).<br>
												Dann auf <b>Meine Listen</b> (links) → <b>students-campuslife</b> → <b>Abbestellen</b> (links) → <b>Bestätigen</b>.
											</p>
											<p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
												<b>No longer receiving the Campus Life Newsletter?</b><br>
												Log in at 
												<a href="https://sympa.thi.de/" style="color:#60a5fa;text-decoration:none;">https://sympa.thi.de/</a> 
												(THI login at the top right).<br>
												Then go to <b>My lists</b> (left) → <b>students-campuslife</b> → <b>Unsubscribe</b> (left) → <b>Confirm</b>.
											</p>
										</div>
									</td>
								</tr>
							</table>
							<![endif]-->
							<!--[if !mso]><!-->
							<table width="100%" cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td align="center">
										<h3 style="font-size:20px;font-weight:bold;margin:0 0 8px 0;">Campus Life Events</h3>
										<p style="margin:0 0 16px 0;font-size:14px;">Der Newsletter für studentische Veranstaltungen</p>
										<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
											<b>Die teilnehmenden Vereine und Hochschulgruppen:</b><br>
											${all_organizers.map((org) => escapeHtml(org.name)).join(' • ')}
										</p>
										<p style="margin:0 0 16px 0;font-size:14px;">
											Bei Rückfragen wenden Sie sich bitte an 
											<a href="mailto:campus-life@thi.de" style="color:#60a5fa;text-decoration:none;">campus-life@thi.de</a>
										</p>
										<p style="margin:0 0 16px 0;font-size:14px;">
											Kommunikation studentischer Vereine: 
											<a href="mailto:campus-life@thi.de" style="color:#60a5fa;text-decoration:none;">Campus Life (Studierendenvertretung)</a>
										</p>
										<p style="margin:0 0 12px 0;color:#9ca3af;font-size:12px;line-height:1.6;">
											<b>Den Campus Life Newsletter nicht mehr empfangen?</b><br>
											Melden Sie sich unter 
											<a href="https://sympa.thi.de/" style="color:#60a5fa;text-decoration:none;">https://sympa.thi.de/</a> 
											an (THI-Login rechts oben).<br>
											Dann auf <b>Meine Listen</b> (links) → <b>students-campuslife</b> → <b>Abbestellen</b> (links) → <b>Bestätigen</b>.
										</p>
										<p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
											<b>No longer receiving the Campus Life Newsletter?</b><br>
											Log in at 
											<a href="https://sympa.thi.de/" style="color:#60a5fa;text-decoration:none;">https://sympa.thi.de/</a> 
											(THI login at the top right).<br>
											Then go to <b>My lists</b> (left) → <b>students-campuslife</b> → <b>Unsubscribe</b> (left) → <b>Confirm</b>.
										</p>
									</td>
								</tr>
							</table>
							<!--<![endif]-->
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
	<!--[if mso | IE]>
	</div>
	<![endif]-->
</body>
</html>`
}
