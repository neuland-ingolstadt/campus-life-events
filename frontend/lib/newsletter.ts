export interface NewsletterTemplate {
	subject: string
	html_body: string
}

export interface EventWithOrganizer {
	id: number
	organizer_id: number
	title_de: string
	title_en: string
	description_de?: string
	description_en?: string
	start_date_time: string
	end_date_time?: string
	event_url?: string
	location?: string
	publish_app: boolean
	publish_newsletter: boolean
	publish_in_ical: boolean
	publish_web: boolean
	created_at: string
	updated_at: string
	organizer_name: string
	organizer_website?: string
}

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

export async function fetchNewsletterTemplate(): Promise<NewsletterTemplate> {
	const response = await fetch('/api/v1/events/newsletter-template', {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		}
	})

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ message: 'Unknown error' }))
		throw new Error(error.message || 'Failed to fetch newsletter template')
	}

	return response.json()
}

export async function fetchNewsletterData(): Promise<NewsletterData> {
	const response = await fetch('/api/v1/events/newsletter-data', {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		}
	})

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ message: 'Unknown error' }))
		throw new Error(error.message || 'Failed to fetch newsletter data')
	}

	return response.json()
}

function logo(): string {
	return `
		<svg version="1.1" id="Ebene_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="-349 229.6 142.3 136.7" enable-background="new -349 229.6 142.3 136.7" xml:space="preserve">
<g>
	<path fill="#ffffff" d="M-225.4,257.8c-4.9-1.3-9.9,1.6-11.2,6.5s1.6,9.9,6.5,11.2c4.9,1.3,9.9-1.6,11.2-6.5
		C-217.6,264.2-220.5,259.1-225.4,257.8z"/>
	<path fill="#ffffff" d="M-254,274.4L-254,274.4L-254,274.4h-32.9l6.6-24.7c0.8-2.8-0.9-5.7-3.7-6.4l-5.1-1.4
		c-2.8-0.8-5.6,0.9-6.4,3.7l-7.7,28.8H-329c-2.9,0-5.9,2.4-6.6,5.3l-1.4,5.2c-0.8,2.9,0.9,5.2,3.8,5.2h25.8l-6.7,24.8
		c-0.8,2.8,1,5.7,3.8,6.4l5,1.3c2.8,0.7,5.6-0.9,6.3-3.6l7.8-28.9h37.1c5.1,0,9.2,4.1,9.2,9.2c0,0.6-0.2,1.7-0.3,2.1l-12.1,44.9
		c-0.8,2.8,1,5.7,3.8,6.4l5,1.3c2.8,0.7,5.6-0.9,6.3-3.6l12.1-44.6l0,0c0.6-2.1,0.9-4.2,0.9-6.5C-229.1,285.6-240.3,274.4-254,274.4
		z"/>
</g>
</svg>
	`
}

export function generateNewsletterHTML(
	data: NewsletterData,
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
			.replace(/'/g, '&#39;')
	}

	const renderEvent = (event: EventWithOrganizer) => {
		const startDate = new Date(event.start_date_time)
		const endDate = event.end_date_time ? new Date(event.end_date_time) : null
		const isAllDay =
			startDate.getHours() === 0 &&
			startDate.getMinutes() === 0 &&
			(!endDate || (endDate.getHours() === 0 && endDate.getMinutes() === 0))

		const organizerLink = event.organizer_website
			? `<a href="${escapeHtml(event.organizer_website)}" class="organizer" target="_blank">${escapeHtml(event.organizer_name)}</a>`
			: `<span class="organizer">${escapeHtml(event.organizer_name)}</span>`

		return `
			<div class="event">
				<div class="event-title">${escapeHtml(event.title_de)}</div>
				<div class="event-organizer">${organizerLink}</div>
				<div class="event-meta">
					<div class="meta-item">
						<span class="meta-icon">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
								<line x1="16" y1="2" x2="16" y2="6"></line>
								<line x1="8" y1="2" x2="8" y2="6"></line>
								<line x1="3" y1="10" x2="21" y2="10"></line>
							</svg>
						</span>
						<span class="meta-text">${formatDate(event.start_date_time)}</span>
					</div>
					${
						!isAllDay
							? `
					<div class="meta-item">
						<span class="meta-icon">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12,6 12,12 16,14"></polyline>
							</svg>
						</span>
						<span class="meta-text">${formatTime(event.start_date_time)}${endDate ? ` - ${formatTime(event.end_date_time || '')}` : ''}</span>
					</div>
					`
							: ''
					}
					${
						event.location
							? `
					<div class="meta-item">
						<span class="meta-icon">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
								<circle cx="12" cy="10" r="3"></circle>
							</svg>
						</span>
						<span class="meta-text">${escapeHtml(event.location)}</span>
					</div>
					`
							: ''
					}
				</div>
				${event.description_de ? `<div class="event-description">${escapeHtml(event.description_de)}</div>` : ''}
				${event.event_url ? `<a href="${escapeHtml(event.event_url)}" class="event-link" target="_blank">Mehr erfahren</a>` : ''}
			</div>
		`
	}

	const weekNumber = getWeekNumber(next_week_start)
	const weekAfterNumber = getWeekNumber(week_after_start)

	return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(subject)}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #374151; 
            margin: 0; 
            padding: 0; 
            background-color: #f3f4f6;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background-color: #ffffff; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #215b9c 0%, #215b9c 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: left; 
            position: relative;
            overflow: hidden;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .logo {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            margin: 20px 0;
        }
        .logo svg {
            width: 100px;
            height: 100px;
            margin-right: 30px;
            vertical-align: middle;
        }
        .logo span {
            font-size: 56px;
            font-weight: bold;
        }
        .title-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .header .title {
            font-size: 32px !important;
            font-weight: bold;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 0;
            padding: 0;
        }
        .subtitle { 
            font-size: 18px; 
            margin-bottom: 10px; 
            opacity: 0.9;
        }
        .week-info-wrapper {
            text-align: center;
            margin-top: 10px;
        }
        .week-info {
            background: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 10px;
            display: inline-block;
            backdrop-filter: blur(10px);
        }
        .content { padding: 30px; }
        .intro { 
            background: #f8fafc; 
            padding: 15px; 
            border-radius: 16px; 
            margin-bottom: 30px; 
        }
        .custom-text {
            margin-bottom: 30px;
        }
        .custom-content {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
        }
        .custom-content p {
            margin: 0 0 10px 0;
            line-height: 1.6;
            color: #374151;
        }
        .custom-content p:last-child {
            margin-bottom: 0;
        }
        .quick-events-list {
            background: #f8fafc;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .quick-event-item {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .quick-event-item:last-child {
            border-bottom: none;
        }
        .quick-event-date {
            font-weight: bold;
            color: #215b9c;
            font-size: 14px;
            min-width: 120px;
            flex-shrink: 0;
        }
        .quick-event-details {
            flex: 1;
        }
        .quick-event-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 4px;
            font-size: 15px;
        }
        .quick-event-meta {
            font-size: 13px;
            color: #6b7280;
        }
        .section-title { 
            font-size: 24px; 
            color: #215b9c; 
            margin: 30px 0 20px 0; 
            padding-bottom: 10px; 
            border-bottom: 2px solid #e5e7eb;
        }
        .event { 
            background: #ffffff; 
            border: 1px solid #e5e7eb; 
            border-radius: 12px; 
            padding: 25px; 
            margin-bottom: 20px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .event-title { 
            font-size: 20px; 
            font-weight: bold; 
            color: #215b9c; 
            margin-bottom: 8px; 
            line-height: 1.3;
        }
        .event-organizer {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 15px;
        }
        .event-meta { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 15px; 
            margin-bottom: 15px; 
        }
        .meta-item { 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            color: #6b7280; 
            font-size: 14px;
        }
        .meta-icon { 
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            color: #215b9c;
            background: #f3f4f6;
            border-radius: 4px;
            flex-shrink: 0;
        }
        .meta-icon svg {
            width: 14px;
            height: 14px;
        }
        .meta-text { 
            font-weight: 500; 
        }
        .event-description { 
            color: #374151; 
            line-height: 1.6; 
            margin-top: 15px;
        }
        .event-link { 
            display: inline-block; 
            background: #215b9c; 
            color: white; 
            padding: 8px 16px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-size: 14px; 
            margin-top: 15px;
        }
        .organizer { 
            color: #6b7280; 
            text-decoration: none; 
        }
        .organizer:hover { 
            color: #374151;
        }
        .quick-list { 
            background: #f8fafc; 
            border-radius: 8px; 
            padding: 20px; 
            margin-top: 20px;
        }
        .quick-list ul { 
            list-style: none; 
            padding: 0; 
            margin: 0;
        }
        .quick-list li { 
            margin-bottom: 8px; 
            position: relative;
        }
        .quick-list li::before { 
            content: "•"; 
            color: #215b9c; 
            font-weight: bold; 
            position: absolute; 
            left: -15px;
        }
        .footer { 
            background: #1f2937; 
            color: #d1d5db; 
            padding: 30px; 
            text-align: center; 
            font-size: 14px; 
            line-height: 1.6;
        }
        .footer-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
        }
        .footer-logo svg {
            width: 40px;
            height: 40px;
            margin-right: 15px;
            vertical-align: middle;
        }
        .footer-logo span {
            font-size: 20px;
            font-weight: bold;
            color: #ffffff;
        }
        .footer-content {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .footer-section {
            flex: 1;
            margin-right: 20px;
        }
        .footer-section:last-child {
            margin-right: 0;
        }
        .organizers-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        .organizer-tag {
            background: #374151;
            color: #d1d5db;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .footer-bottom {
            border-top: 1px solid #374151;
            padding-top: 15px;
            margin-top: 15px;
        }
        .events-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .no-events {
            text-align: center;
            color: #6b7280;
            font-style: italic;
            padding: 40px 20px;
        }
        .app-promo {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            margin: 20px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .app-promo-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .app-promo-text {
            flex: 1;
        }
        .app-promo-text h2 {
            margin: 0 0 8px 0;
            color: #215b9c;
            font-size: 22px;
            font-weight: bold;
        }
        .app-promo-text p {
            margin: 0 0 6px 0;
            color: #374151;
            line-height: 1.4;
            font-size: 14px;
        }
        .app-promo-text p:last-of-type {
            margin-bottom: 4px;
        }
        .app-disclaimer {
            font-size: 12px;
            color: #6b7280;
            margin: 2px 0 12px 0 !important;
        }
        .app-promo-button {
            display: inline-block;
            background: #215b9c;
            color: white;
            padding: 10px 18px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
        }
        .app-promo-button:hover {
            background: #1e4a7c;
        }
        .footer a { 
            color: #60a5fa; 
            text-decoration: none; 
        }
        .footer a:hover { 
            text-decoration: underline; 
        }
        @media (prefers-color-scheme: dark) {
            body { 
                background-color: #000000;
                color: #e5e5e5;
            }
            .container { 
                background-color: #111111;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            }
            .header { 
                background: linear-gradient(135deg, #215b9c 0%, #215b9c 100%);
                color: #ffffff;
            }
            .content {
                background-color: #111111;
            }
            .intro { 
                background: #1a1a1a;
                color: #e5e5e5;
            }
            .event { 
                background: #1a1a1a;
                border: 1px solid #333333;
                color: #e5e5e5;
            }
            .event-title { 
                color: #60a5fa;
            }
            .event-description { 
                color: #d1d5db;
            }
            .event-organizer {
                color: #9ca3af;
            }
            .meta-item { 
                color: #9ca3af;
            }
            .meta-text { 
                color: #d1d5db;
            }
            .organizer { 
                color: #9ca3af;
            }
            .organizer:hover { 
                color: #d1d5db;
            }
            .section-title { 
                color: #60a5fa;
                border-bottom: 2px solid #333333;
            }
            .quick-list { 
                background: #1a1a1a;
                color: #e5e5e5;
            }
            .quick-events-list {
                background: #1a1a1a;
                color: #e5e5e5;
            }
            .quick-event-item {
                border-bottom: 1px solid #333333;
            }
            .quick-event-title {
                color: #e5e5e5;
            }
            .quick-event-meta {
                color: #9ca3af;
            }
            .quick-event-date {
                color: #60a5fa;
            }
            .footer { 
                background: #000000;
                color: #d1d5db;
            }
            .footer-logo span {
                color: #ffffff;
            }
            .organizer-tag {
                background: #333333;
                color: #d1d5db;
            }
            .no-events {
                color: #9ca3af;
            }
            .app-promo {
                background: #1a1a1a;
                border: 1px solid #333333;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .app-promo-text h2 {
                color: #60a5fa;
            }
            .app-promo-text p {
                color: #d1d5db;
            }
            .app-disclaimer {
                color: #9ca3af;
            }
            .app-promo-button {
                background: #60a5fa;
            }
            .app-promo-button:hover {
                background: #3b82f6;
            }
        }
        
        /* Apple Mail specific dark mode */
        [data-ogsc] body { 
            background-color: #000000 !important;
            color: #e5e5e5 !important;
        }
        [data-ogsc] .container { 
            background-color: #111111 !important;
        }
        [data-ogsc] .header { 
            background: linear-gradient(135deg, #215b9c 0%, #215b9c 100%) !important;
            color: #ffffff !important;
        }
        [data-ogsc] .content {
            background-color: #111111 !important;
        }
        [data-ogsc] .intro { 
            background: #1a1a1a !important;
            color: #e5e5e5 !important;
        }
        [data-ogsc] .event { 
            background: #1a1a1a !important;
            border: 1px solid #333333 !important;
            color: #e5e5e5 !important;
        }
        [data-ogsc] .event-title { 
            color: #60a5fa !important;
        }
        [data-ogsc] .event-description { 
            color: #d1d5db !important;
        }
        [data-ogsc] .event-organizer {
            color: #9ca3af !important;
        }
        [data-ogsc] .meta-item { 
            color: #9ca3af !important;
        }
        [data-ogsc] .meta-text { 
            color: #d1d5db !important;
        }
        [data-ogsc] .organizer { 
            color: #9ca3af !important;
        }
        [data-ogsc] .organizer:hover { 
            color: #d1d5db !important;
        }
        [data-ogsc] .section-title { 
            color: #60a5fa !important;
            border-bottom: 2px solid #333333 !important;
        }
        [data-ogsc] .quick-list { 
            background: #1a1a1a !important;
            color: #e5e5e5 !important;
        }
        [data-ogsc] .quick-events-list {
            background: #1a1a1a !important;
            color: #e5e5e5 !important;
        }
        [data-ogsc] .quick-event-item {
            border-bottom: 1px solid #333333 !important;
        }
        [data-ogsc] .quick-event-title {
            color: #e5e5e5 !important;
        }
        [data-ogsc] .quick-event-meta {
            color: #9ca3af !important;
        }
        [data-ogsc] .quick-event-date {
            color: #60a5fa !important;
        }
        [data-ogsc] .footer { 
            background: #000000 !important;
            color: #d1d5db !important;
        }
        [data-ogsc] .footer-logo span {
            color: #ffffff !important;
        }
        [data-ogsc] .organizer-tag {
            background: #333333 !important;
            color: #d1d5db !important;
        }
        [data-ogsc] .no-events {
            color: #9ca3af !important;
        }
        [data-ogsc] .app-promo {
            background: #1a1a1a !important;
            border: 1px solid #333333 !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        [data-ogsc] .app-promo-text h2 {
            color: #60a5fa !important;
        }
        [data-ogsc] .app-promo-text p {
            color: #d1d5db !important;
        }
        [data-ogsc] .app-disclaimer {
            color: #9ca3af !important;
        }
        [data-ogsc] .app-promo-button {
            background: #60a5fa !important;
        }
        [data-ogsc] .app-promo-button:hover {
            background: #3b82f6 !important;
        }
        
        @media (max-width: 600px) {
            .container { margin: 0; box-shadow: none; }
            .header, .content, .footer { padding: 20px; }
            .event-meta { flex-direction: column; gap: 10px; }
            .app-promo { margin: 15px; padding: 12px; }
            .app-promo-content { flex-direction: column; text-align: center; gap: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="logo">
                    ${logo()}
                    <div class="title-col">
                        <span class="title">Campus Life</span>
                        <div class="subtitle">Der offizielle Newsletter für die Studierenden der Technischen Hochschule Ingolstadt.</div>
                    </div>
                </div>
                <div class="week-info-wrapper">
                    <div class="week-info">
                        Kalenderwoche ${weekNumber} 
                    </div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="intro">
                <p><strong>Hallo zusammen!</strong></p>
                <p>Hier sind die kommenden Veranstaltungen für euch zusammengestellt. Viel Spaß bei den Events!</p>
            </div>
            
            ${
							customText
								? `
            <div class="custom-text">
                <h2 class="section-title">Ankündigungen</h2>
                <div class="custom-content">
                    ${customText
											.split('\n')
											.map((line) => `<p>${escapeHtml(line)}</p>`)
											.join('')}
                </div>
            </div>
            `
								: ''
						}
            
            <h2 class="section-title">Events der Vereine (${getDateRange(next_week_start, week_after_start)})</h2>
            ${
							next_week_events.length > 0
								? next_week_events.map(renderEvent).join('')
								: '<p>Keine Veranstaltungen diese Woche.</p>'
						}
            
            <h2 class="section-title">Ausblick Kalenderwoche ${weekAfterNumber}</h2>
            ${
							following_week_events.length > 0
								? `
            <div class="quick-events-list">
                ${following_week_events
									.map(
										(event) => `
                    <div class="quick-event-item">
                        <div class="quick-event-date">${formatDate(event.start_date_time)}</div>
                        <div class="quick-event-details">
                            <div class="quick-event-title">${escapeHtml(event.title_de)}</div>
                            <div class="quick-event-meta">
                                ${new Date(event.start_date_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}${event.location ? ` • ${escapeHtml(event.location)}` : ''} • ${escapeHtml(event.organizer_name)}
                            </div>
                        </div>
                    </div>
                `
									)
									.join('')}
            </div>
            `
								: '<p>Keine Veranstaltungen geplant.</p>'
						}
            
        </div>
        
        <div class="app-promo">
            <div class="app-promo-content">
                <div class="app-promo-text">
                    <h2>Neuland Next App</h2>
                    <p><strong>Die Campus App für die THI</strong></p>
                    <p>Alle wichtigen Infos zum Studium in einer App: Stundenplan, Mensa, Sport, Events und vieles mehr! Verpasse nie wieder wichtige Termine, finde schnell deine Vorlesungen und entdecke spannende Events direkt auf deinem Smartphone.</p>
                    <p class="app-disclaimer">Entwickelt von Neuland Ingolstadt e.V.</p>
                    <a href="https://neuland.app" class="app-promo-button" target="_blank">Mehr erfahren</a>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-logo">
                ${logo()}
                <span>Campus Life Events</span>
            </div>

            Der Newsletter für studentische Veranstaltungen</p>
            <p>Die teilnehmenden Vereine und Hochschulgruppen:<br/>
            ${all_organizers.map((org) => escapeHtml(org.name)).join(' • ')}</p>
            <p>Bei Rückfragen wenden Sie sich bitte an <a href="mailto:campus-life@thi.de">campus-life@thi.de</a><br/>
            Kommunikation studentischer Vereine: Campus Life/StudVer e-mail</p>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                <strong>Den Campus Life Newsletter nicht mehr empfangen?</strong><br/>
                Melden Sie sich unter <a href="https://sympa.thi.de/">https://sympa.thi.de/</a> an (THI-Login rechts oben).<br/>
                Dann auf Meine Listen (links) → students-campuslife → Abbestellen (links) → Bestätigen.<br/><br/>
                <strong>No longer receiving the Campus Life Newsletter?</strong><br/>
                Log in at <a href="https://sympa.thi.de/">https://sympa.thi.de/</a> (THI login at the top right).<br/>
                Then go to My lists (left) → students-campuslife → Unsubscribe (left) → Confirm.
            </p>
        </div>
    </div>
</body>
</html>
	`
}
