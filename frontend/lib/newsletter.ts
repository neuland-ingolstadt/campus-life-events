import type { ErrorResponse, NewsletterDataResponse } from '@/client'
import { getNewsletterData } from '@/client'
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

export async function fetchNewsletterData(): Promise<NewsletterDataResponse> {
	const response = await getNewsletterData()

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

function logo(): string {
	// Convert SVG to data URI for better email client compatibility
	const svgData =
		encodeURIComponent(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-349 229.6 142.3 136.7">
<g>
	<path fill="#ffffff" d="M-225.4,257.8c-4.9-1.3-9.9,1.6-11.2,6.5s1.6,9.9,6.5,11.2c4.9,1.3,9.9-1.6,11.2-6.5C-217.6,264.2-220.5,259.1-225.4,257.8z"/>
	<path fill="#ffffff" d="M-254,274.4L-254,274.4L-254,274.4h-32.9l6.6-24.7c0.8-2.8-0.9-5.7-3.7-6.4l-5.1-1.4c-2.8-0.8-5.6,0.9-6.4,3.7l-7.7,28.8H-329c-2.9,0-5.9,2.4-6.6,5.3l-1.4,5.2c-0.8,2.9,0.9,5.2,3.8,5.2h25.8l-6.7,24.8c-0.8,2.8,1,5.7,3.8,6.4l5,1.3c2.8,0.7,5.6-0.9,6.3-3.6l7.8-28.9h37.1c5.1,0,9.2,4.1,9.2,9.2c0,0.6-0.2,1.7-0.3,2.1l-12.1,44.9c-0.8,2.8,1,5.7,3.8,6.4l5,1.3c2.8,0.7,5.6-0.9,6.3-3.6l12.1-44.6l0,0c0.6-2.1,0.9-4.2,0.9-6.5C-229.1,285.6-240.3,274.4-254,274.4z"/>
</g>
</svg>`)
	return `<img src="data:image/svg+xml,${svgData}" alt="Campus Life Logo" style="display: block;" />`
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

	const inlineStyles = {
		body: 'font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6; width: 100% !important; min-width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;',
		outerTable: 'background-color: #f3f4f6;',
		containerTable:
			'width: 800px; background-color: #ffffff; border: 1px solid #e5e7eb;',
		headerCell:
			'background-color: #215b9c; color: #ffffff; padding: 40px 30px; text-align: left;',
		headerTable: 'width: 100%;',
		logoRow: 'margin: 20px 0; display: flex; align-items: center;',
		titleCol:
			'display: flex; flex-direction: column; align-items: flex-start; flex: 1;',
		title:
			'font-size: 32px; font-weight: bold; margin: 0; padding: 0; color: #ffffff;',
		subtitle: 'font-size: 18px; margin-bottom: 10px; color: #ffffff;',
		weekInfoWrapper: 'text-align: center; margin-top: 10px;',
		weekInfo:
			'background-color: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 10px; display: inline-block; color: #ffffff; font-weight: 600;',
		contentCell: 'padding: 30px;',
		intro:
			'background-color: #f8fafc; padding: 15px; border-radius: 16px; margin-bottom: 30px;',
		paragraph: 'margin: 0 0 10px 0; line-height: 1.6; color: #374151;',
		customText: 'margin-bottom: 30px;',
		customContent:
			'background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-top: 15px;',
		customParagraph: 'margin: 0 0 10px 0; line-height: 1.6; color: #374151;',
		customParagraphLast: 'margin: 0; line-height: 1.6; color: #374151;',
		sectionTitle:
			'font-size: 24px; color: #215b9c; margin: 30px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;',
		eventCard:
			'background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 20px;',
		eventTitle:
			'font-size: 20px; font-weight: bold; color: #215b9c; margin-bottom: 8px; line-height: 1.3;',
		eventOrganizer: 'font-size: 14px; color: #6b7280; margin-bottom: 15px;',
		eventMeta: 'margin-bottom: 15px;',
		metaItem:
			'display: inline-block; color: #6b7280; font-size: 14px; margin-right: 15px; margin-bottom: 8px;',
		metaIcon:
			'display: inline-block; font-size: 14px; vertical-align: middle; margin-right: 8px;',
		metaText:
			'font-weight: 500; vertical-align: middle; display: inline-block;',
		eventDescription: 'color: #374151; line-height: 1.6; margin-top: 15px;',
		eventLink:
			'display: inline-block; background-color: #215b9c; color: #ffffff; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; margin-top: 15px;',
		organizerLink: 'color: #6b7280; text-decoration: none;',
		quickEventsList:
			'background-color: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 20px;',
		quickEventItem: 'padding: 12px 0; border-bottom: 1px solid #e5e7eb;',
		quickEventItemLast: 'padding: 12px 0; border-bottom: none;',
		quickEventDate:
			'font-weight: bold; color: #215b9c; font-size: 14px; display: inline-block; width: 120px; vertical-align: top;',
		quickEventDetails:
			'display: inline-block; width: calc(100% - 140px); vertical-align: top; margin-left: 20px;',
		quickEventTitle:
			'font-weight: 600; color: #374151; margin-bottom: 4px; font-size: 15px;',
		quickEventMeta: 'font-size: 13px; color: #6b7280;',
		appPromo:
			'background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;',
		appPromoContent: 'width: 100%;',
		appPromoText: 'width: 100%;',
		appPromoHeading:
			'margin: 0 0 8px 0; color: #215b9c; font-size: 22px; font-weight: bold;',
		appPromoParagraph:
			'margin: 0 0 6px 0; color: #374151; line-height: 1.4; font-size: 14px;',
		appDisclaimer: 'font-size: 12px; color: #6b7280; margin: 2px 0 12px 0;',
		appPromoButton:
			'display: inline-block; background-color: #215b9c; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;',
		footerCell:
			'background-color: #1f2937; color: #d1d5db; padding: 30px; text-align: center; font-size: 14px; line-height: 1.6;',
		footerLogo:
			'text-align: center; margin-bottom: 20px; display: flex; align-items: center; justify-content: center;',
		footerLogoText: 'font-size: 20px; font-weight: bold; color: #ffffff;',
		footerLink: 'color: #60a5fa; text-decoration: none;',
		footerSmallPrint: 'margin-top: 20px; font-size: 12px; color: #9ca3af;'
	}

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

	const renderEvent = (event: ApiEventWithOrganizer) => {
		const startDate = new Date(event.start_date_time)
		const endDate = new Date(event.end_date_time)
		const isAllDay =
			startDate.getHours() === 0 &&
			startDate.getMinutes() === 0 &&
			endDate.getHours() === 0 &&
			endDate.getMinutes() === 0

		const organizerLink = event.organizer_website
			? `<a href="${escapeHtml(event.organizer_website)}" class="organizer" target="_blank" style="${inlineStyles.organizerLink}">${escapeHtml(event.organizer_name)}</a>`
			: `<span class="organizer" style="${inlineStyles.organizerLink}">${escapeHtml(event.organizer_name)}</span>`

		return `
<div class="event" style="${inlineStyles.eventCard}">
<div class="event-title" style="${inlineStyles.eventTitle}">${escapeHtml(event.title_de)}</div>
<div class="event-organizer" style="${inlineStyles.eventOrganizer}">${organizerLink}</div>
<div class="event-meta" style="${inlineStyles.eventMeta}">
<div class="meta-item" style="${inlineStyles.metaItem}">
<span class="meta-icon" style="${inlineStyles.metaIcon}">📅</span>
<span class="meta-text" style="${inlineStyles.metaText}">${formatDate(event.start_date_time)}</span>
</div>
${
	!isAllDay
		? `
<div class="meta-item" style="${inlineStyles.metaItem}">
<span class="meta-icon" style="${inlineStyles.metaIcon}">🕐</span>
<span class="meta-text" style="${inlineStyles.metaText}">${formatTime(event.start_date_time)} - ${formatTime(event.end_date_time)}</span>
</div>
`
		: ''
}
${
	event.location
		? `
<div class="meta-item" style="${inlineStyles.metaItem}">
<span class="meta-icon" style="${inlineStyles.metaIcon}">📍</span>
<span class="meta-text" style="${inlineStyles.metaText}">${escapeHtml(event.location)}</span>
</div>
`
		: ''
}
</div>
${event.description_de ? `<div class="event-description" style="${inlineStyles.eventDescription}">${escapeHtml(event.description_de)}</div>` : ''}
${event.event_url ? `<a href="${escapeHtml(event.event_url)}" class="event-link" target="_blank" style="${inlineStyles.eventLink}">Mehr erfahren</a>` : ''}
</div>
`
	}

	const weekNumber = getWeekNumber(next_week_start)
	const weekAfterNumber = getWeekNumber(week_after_start)

	const customTextHtml = (() => {
		if (!customText) {
			return ''
		}

		const lines = customText
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
		if (lines.length === 0) {
			return ''
		}

		const paragraphs = lines
			.map((line, index) => {
				const isLast = index === lines.length - 1
				const style = isLast
					? inlineStyles.customParagraphLast
					: inlineStyles.customParagraph
				return `<p style="${style}">${escapeHtml(line)}</p>`
			})
			.join('')

		return `
<div class="custom-text" style="${inlineStyles.customText}">
<h2 class="section-title" style="${inlineStyles.sectionTitle}">Ankündigungen</h2>
<div class="custom-content" style="${inlineStyles.customContent}">
${paragraphs}
</div>
</div>
`
	})()

	const nextWeekEventsHtml =
		next_week_events.length > 0
			? next_week_events.map(renderEvent).join('')
			: `<p style="${inlineStyles.paragraph}">Keine Veranstaltungen diese Woche.</p>`

	const followingWeekEventsHtml =
		following_week_events.length > 0
			? `
<div class="quick-events-list" style="${inlineStyles.quickEventsList}">
${following_week_events
	.map((event, index) => {
		const itemStyle =
			index === following_week_events.length - 1
				? inlineStyles.quickEventItemLast
				: inlineStyles.quickEventItem
		return `
<div class="quick-event-item" style="${itemStyle}">
<div class="quick-event-date" style="${inlineStyles.quickEventDate}">${formatDate(event.start_date_time)}</div>
<div class="quick-event-details" style="${inlineStyles.quickEventDetails}">
<div class="quick-event-title" style="${inlineStyles.quickEventTitle}">${escapeHtml(event.title_de)}</div>
<div class="quick-event-meta" style="${inlineStyles.quickEventMeta}">
${new Date(event.start_date_time).toLocaleTimeString('de-DE', {
	hour: '2-digit',
	minute: '2-digit'
})}${event.location ? ` • ${escapeHtml(event.location)}` : ''} • ${escapeHtml(event.organizer_name)}
</div>
</div>
</div>
`
	})
	.join('')}
</div>
`
			: `<p style="${inlineStyles.paragraph}">Keine Veranstaltungen geplant.</p>`

	return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles for email clients */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        
        /* Prevent Outlook from adding extra spacing */
        .ExternalClass {
            width: 100%;
        }
        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
            line-height: 100%;
        }
        
        /* Prevent Gmail from changing link colors */
        a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
        }
        
        body { 
            font-family: Arial, Helvetica, sans-serif; 
            line-height: 1.6; 
            color: #374151; 
            margin: 0; 
            padding: 0; 
            background-color: #f3f4f6;
            width: 100% !important;
            min-width: 100%;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        .container { 
            width: 800px; 
            background-color: #ffffff; 
            border: 1px solid #e5e7eb;
        }
        .header { 
            background-color: #215b9c; 
            color: white; 
            padding: 40px 30px; 
            text-align: left; 
        }
        .header-content {
            width: 100%;
        }
        .logo {
            margin: 20px 0;
            display: flex;
            align-items: center;
        }
        .logo img {
            width: 100px;
            height: 100px;
            margin-right: 30px;
            vertical-align: middle;
            display: block;
            flex-shrink: 0;
        }
        .logo span {
            font-size: 56px;
            font-weight: bold;
            vertical-align: middle;
        }
        .title-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            flex: 1;
        }
        .header .title {
            font-size: 32px !important;
            font-weight: bold;
            margin: 0;
            padding: 0;
        }
        .subtitle { 
            font-size: 18px; 
            margin-bottom: 10px; 
        }
        .week-info-wrapper {
            text-align: center;
            margin-top: 10px;
        }
        .week-info {
            background-color: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 10px;
            display: inline-block;
        }
        .content { padding: 30px; }
        .intro { 
            background-color: #f8fafc; 
            padding: 15px; 
            border-radius: 16px; 
            margin-bottom: 30px; 
        }
        .custom-text {
            margin-bottom: 30px;
        }
        .custom-content {
            background-color: #ffffff;
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
            background-color: #f8fafc;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .quick-event-item {
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
            display: inline-block;
            width: 120px;
            vertical-align: top;
        }
        .quick-event-details {
            display: inline-block;
            width: calc(100% - 140px);
            vertical-align: top;
            margin-left: 20px;
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
            background-color: #ffffff; 
            border: 1px solid #e5e7eb; 
            border-radius: 12px; 
            padding: 25px; 
            margin-bottom: 20px; 
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
            margin-bottom: 15px; 
        }
        .meta-item { 
            display: inline-block;
            color: #6b7280; 
            font-size: 14px;
            margin-right: 15px;
            margin-bottom: 8px;
        }
        .meta-icon { 
            display: inline-block;
            font-size: 14px;
            vertical-align: middle;
            margin-right: 8px;
        }
        .meta-text { 
            font-weight: 500; 
            vertical-align: middle;
        }
        .event-description { 
            color: #374151; 
            line-height: 1.6; 
            margin-top: 15px;
        }
        .event-link { 
            display: inline-block; 
            background-color: #215b9c; 
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
            background-color: #f8fafc; 
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
            background-color: #1f2937; 
            color: #d1d5db; 
            padding: 30px; 
            text-align: center; 
            font-size: 14px; 
            line-height: 1.6;
        }
        .footer-logo {
            text-align: center;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .footer-logo img {
            width: 40px;
            height: 40px;
            margin-right: 15px;
            vertical-align: middle;
            display: block;
            flex-shrink: 0;
        }
        .footer-logo span {
            font-size: 20px;
            font-weight: bold;
            color: #ffffff;
        }
        .footer-content {
            margin-bottom: 20px;
        }
        .footer-section {
            margin-bottom: 20px;
        }
        .organizers-list {
            margin-top: 10px;
        }
        .organizer-tag {
            background-color: #374151;
            color: #d1d5db;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            display: inline-block;
            margin: 2px;
        }
        .footer-bottom {
            border-top: 1px solid #374151;
            padding-top: 15px;
            margin-top: 15px;
        }
        .events-grid {
            margin-bottom: 20px;
        }
        .no-events {
            text-align: center;
            color: #6b7280;
            font-style: italic;
            padding: 40px 20px;
        }
        .app-promo {
            background-color: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
        }
        .app-promo-content {
            width: 100%;
        }
        .app-promo-text {
            width: 100%;
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
            background-color: #215b9c;
            color: white;
            padding: 10px 18px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
        }
        .app-promo-button:hover {
            background-color: #1e4a7c;
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
            }
            .header { 
                background-color: #215b9c;
                color: #ffffff;
            }
            .content {
                background-color: #111111;
            }
            .intro { 
                background-color: #1a1a1a;
                color: #e5e5e5;
            }
            .event { 
                background-color: #1a1a1a;
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
                background-color: #1a1a1a;
                color: #e5e5e5;
            }
            .quick-events-list {
                background-color: #1a1a1a;
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
                background-color: #000000;
                color: #d1d5db;
            }
            .footer-logo span {
                color: #ffffff;
            }
            .organizer-tag {
                background-color: #333333;
                color: #d1d5db;
            }
            .no-events {
                color: #9ca3af;
            }
            .app-promo {
                background-color: #1a1a1a;
                border: 1px solid #333333;
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
                background-color: #60a5fa;
            }
            .app-promo-button:hover {
                background-color: #3b82f6;
            }
        }
        
        @media screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .header, .content, .footer { padding: 20px !important; }
            .app-promo { padding: 12px !important; }
            .app-promo-content { text-align: center !important; }
            .logo { flex-direction: column !important; align-items: flex-start !important; }
            .logo img { width: 80px !important; height: 80px !important; margin-right: 0 !important; margin-bottom: 15px !important; }
            .title-col { margin-left: 0 !important; }
            .header .title { font-size: 24px !important; }
            .subtitle { font-size: 16px !important; }
            .quick-event-date { width: 100px !important; }
            .quick-event-details { width: calc(100% - 120px) !important; margin-left: 10px !important; }
            .footer-logo { flex-direction: column !important; }
            .footer-logo img { margin-right: 0 !important; margin-bottom: 10px !important; }
        }
    </style>
</head>
<body style="${inlineStyles.body}">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${inlineStyles.outerTable}">
        <tr>
            <td align="center">
                <table width="800" cellpadding="0" cellspacing="0" border="0" class="container" style="${inlineStyles.containerTable}">
                    <tr>
                        <td class="header" style="${inlineStyles.headerCell}">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${inlineStyles.headerTable}">
                                <tr>
                                    <td class="logo" style="${inlineStyles.logoRow}">
                                        ${logo()}
                                        <div class="title-col" style="${inlineStyles.titleCol}">
                                            <span class="title" style="${inlineStyles.title}">Campus Life</span>
                                            <div class="subtitle" style="${inlineStyles.subtitle}">Der offizielle Newsletter für die Studierenden der Technischen Hochschule Ingolstadt.</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="week-info-wrapper" style="${inlineStyles.weekInfoWrapper}">
                                        <div class="week-info" style="${inlineStyles.weekInfo}">
                                            Kalenderwoche ${weekNumber}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="${inlineStyles.contentCell}">
            <div class="intro" style="${inlineStyles.intro}">
                <p style="${inlineStyles.paragraph}"><strong>Hallo zusammen!</strong></p>
                <p style="${inlineStyles.paragraph}">Hier sind die kommenden Veranstaltungen für euch zusammengestellt. Viel Spaß bei den Events!</p>
            </div>

            ${customTextHtml}

            <h2 class="section-title" style="${inlineStyles.sectionTitle}">Events der Vereine (${getDateRange(next_week_start, week_after_start)})</h2>
            ${nextWeekEventsHtml}

            <h2 class="section-title" style="${inlineStyles.sectionTitle}">Ausblick Kalenderwoche ${weekAfterNumber}</h2>
            ${followingWeekEventsHtml}

                        </td>
                    </tr>
                    <tr>
                        <td class="content" style="${inlineStyles.contentCell}">
                            <div class="app-promo" style="${inlineStyles.appPromo}">
                                <div class="app-promo-content" style="${inlineStyles.appPromoContent}">
                                    <div class="app-promo-text" style="${inlineStyles.appPromoText}">
                                        <h2 style="${inlineStyles.appPromoHeading}">Neuland Next App</h2>
                                        <p style="${inlineStyles.appPromoParagraph}"><strong>Die Campus App für die THI</strong></p>
                                        <p style="${inlineStyles.appPromoParagraph}">Alle wichtigen Infos zum Studium in einer App: Stundenplan, Mensa, Sport, Events und vieles mehr! Verpasse nie wieder wichtige Termine, finde schnell deine Vorlesungen und entdecke spannende Events direkt auf deinem Smartphone.</p>
                                        <p class="app-disclaimer" style="${inlineStyles.appDisclaimer}">Entwickelt von Neuland Ingolstadt e.V.</p>
                                        <a href="https://neuland.app" class="app-promo-button" target="_blank" style="${inlineStyles.appPromoButton}">Mehr erfahren</a>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer" style="${inlineStyles.footerCell}">
                            <div class="footer-logo" style="${inlineStyles.footerLogo}">
                                ${logo()}
                                <span style="${inlineStyles.footerLogoText}">Campus Life Events</span>
                            </div>

                            <p style="${inlineStyles.paragraph}">Der Newsletter für studentische Veranstaltungen</p>
                            <p style="${inlineStyles.paragraph}">Die teilnehmenden Vereine und Hochschulgruppen:<br/>
                            ${all_organizers.map((org) => escapeHtml(org.name)).join(' • ')}</p>
                            <p style="${inlineStyles.paragraph}">Bei Rückfragen wenden Sie sich bitte an <a href="mailto:campus-life@thi.de" style="${inlineStyles.footerLink}">campus-life@thi.de</a><br/>
                            Kommunikation studentischer Vereine: Campus Life/StudVer e-mail</p>
                            <p style="${inlineStyles.footerSmallPrint}">
                                <strong>Den Campus Life Newsletter nicht mehr empfangen?</strong><br/>
                                Melden Sie sich unter <a href="https://sympa.thi.de/" style="${inlineStyles.footerLink}">https://sympa.thi.de/</a> an (THI-Login rechts oben).<br/>
                                Dann auf Meine Listen (links) → students-campuslife → Abbestellen (links) → Bestätigen.<br/><br/>
                                <strong>No longer receiving the Campus Life Newsletter?</strong><br/>
                                Log in at <a href="https://sympa.thi.de/" style="${inlineStyles.footerLink}">https://sympa.thi.de/</a> (THI login at the top right).<br/>
                                Then go to My lists (left) → students-campuslife → Unsubscribe (left) → Confirm.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
	`
}
