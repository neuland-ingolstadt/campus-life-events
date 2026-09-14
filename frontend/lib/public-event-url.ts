export const PUBLIC_EVENT_SHARE_ORIGIN = 'https://cl.neuland.ing'

export function publicEventShareUrl(eventId: number | string): string {
	return `${PUBLIC_EVENT_SHARE_ORIGIN}/e/${eventId}`
}
