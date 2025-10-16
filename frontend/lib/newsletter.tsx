import { pretty, render } from '@react-email/render'
import type { ErrorResponse, NewsletterDataResponse } from '@/client'
import { getNewsletterData } from '@/client'
import type { EventWithOrganizer as ApiEventWithOrganizer } from '@/client/types.gen'
import NewsletterMail from '@/components/mail/newletter-mail'
import 'web-streams-polyfill/polyfill'

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

export async function generateNewsletterHTML(
	data: NewsletterDataResponse,
	customText?: string
) {
	const html = await pretty(
		await render(<NewsletterMail data={data} customText={customText} />)
	)
	return html
}
