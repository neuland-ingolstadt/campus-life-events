export type EventVisibilityMode = 'public' | 'internal' | 'host_only'

export type EventVisibilityFields = {
	host_only: boolean
	publish_app: boolean
	publish_newsletter: boolean
}

export function deriveEventVisibilityMode(
	event: EventVisibilityFields
): EventVisibilityMode {
	if (event.host_only) {
		return 'host_only'
	}
	if (event.publish_app || event.publish_newsletter) {
		return 'public'
	}
	return 'internal'
}

export function eventVisibilityLabel(mode: EventVisibilityMode): string {
	switch (mode) {
		case 'public':
			return 'Extern'
		case 'internal':
			return 'Intern'
		case 'host_only':
			return 'Nur uns'
	}
}

export function eventVisibilityTooltip(mode: EventVisibilityMode): string {
	switch (mode) {
		case 'public':
			return 'Öffentliches Event: Beworben in Newsletter / App'
		case 'internal':
			return 'Internes Event: Andere Vereine sehen es im Dashboard, nicht in App / Newsletter'
		case 'host_only':
			return 'Nur für eure Organisation – andere Vereine sehen es nicht'
	}
}

export function eventVisibilityDescription(mode: EventVisibilityMode): string {
	switch (mode) {
		case 'public':
			return 'z. B. öffentlicher Vortrag oder Campus-Party – sichtbar für alle.'
		case 'internal':
			return 'z. B. interner Stammtisch – andere Vereine sehen ihn im Dashboard, nicht in App/Newsletter.'
		case 'host_only':
			return 'z. B. Strategiemeeting – nur ihr seht es, andere Vereine nicht.'
	}
}
