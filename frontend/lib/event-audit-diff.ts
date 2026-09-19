import { formatInCampusTimeZone } from '@/lib/date-time'
import {
	deriveEventVisibilityMode,
	type EventVisibilityFields,
	eventVisibilityLabel
} from '@/lib/event-visibility'

export type AuditFieldChange = {
	key: string
	label: string
	from: string
	to: string
}

const FIELD_LABELS: Record<string, string> = {
	title_de: 'Titel',
	title_en: 'Titel (EN)',
	description_de: 'Beschreibung',
	description_en: 'Beschreibung (EN)',
	start_date_time: 'Beginn',
	end_date_time: 'Ende',
	location: 'Ort',
	event_url: 'Event-URL',
	publish_app: 'App',
	publish_newsletter: 'Newsletter',
	publish_in_ical: 'iCal',
	publish_web: 'Webseite',
	host_only: 'Nur eigene Organisation'
}

const SKIP_KEYS = new Set(['id', 'organizer_id', 'created_at', 'updated_at'])

const VISIBILITY_KEYS = [
	'host_only',
	'publish_app',
	'publish_newsletter'
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatScalar(key: string, value: unknown): string {
	if (value === null || value === undefined || value === '') {
		return '—'
	}
	if (typeof value === 'boolean') {
		return value ? 'An' : 'Aus'
	}
	if (
		typeof value === 'string' &&
		(key.endsWith('_date_time') || key.endsWith('_at'))
	) {
		const date = new Date(value)
		if (!Number.isNaN(date.getTime())) {
			return formatInCampusTimeZone(date, 'dd.MM.yyyy HH:mm')
		}
	}
	const text = String(value)
	if (text.length > 48) {
		return `${text.slice(0, 45).trimEnd()}…`
	}
	return text
}

function asVisibilityFields(
	data: Record<string, unknown>
): EventVisibilityFields | null {
	if (
		typeof data.host_only !== 'boolean' ||
		typeof data.publish_app !== 'boolean' ||
		typeof data.publish_newsletter !== 'boolean'
	) {
		return null
	}
	return {
		host_only: data.host_only,
		publish_app: data.publish_app,
		publish_newsletter: data.publish_newsletter
	}
}

function valuesEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (a == null && b == null) return true
	if (a == null || b == null) return false
	return String(a) === String(b)
}

function pushFieldChange(
	changes: AuditFieldChange[],
	key: string,
	oldValue: unknown,
	newValue: unknown
) {
	if (valuesEqual(oldValue, newValue)) return
	changes.push({
		key,
		label: FIELD_LABELS[key] ?? key,
		from: formatScalar(key, oldValue),
		to: formatScalar(key, newValue)
	})
}

export function diffEventAuditData(
	oldData: unknown,
	newData: unknown
): AuditFieldChange[] {
	const oldRecord = isRecord(oldData) ? oldData : {}
	const newRecord = isRecord(newData) ? newData : {}
	const keys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])

	const changes: AuditFieldChange[] = []
	const visibilityTouched = VISIBILITY_KEYS.some(
		(key) => !valuesEqual(oldRecord[key], newRecord[key])
	)

	if (visibilityTouched) {
		const oldVis = asVisibilityFields(oldRecord)
		const newVis = asVisibilityFields(newRecord)
		if (oldVis && newVis) {
			const fromMode = deriveEventVisibilityMode(oldVis)
			const toMode = deriveEventVisibilityMode(newVis)
			if (fromMode !== toMode) {
				changes.push({
					key: 'visibility',
					label: 'Sichtbarkeit',
					from: eventVisibilityLabel(fromMode),
					to: eventVisibilityLabel(toMode)
				})
			} else {
				for (const key of VISIBILITY_KEYS) {
					pushFieldChange(changes, key, oldRecord[key], newRecord[key])
				}
			}
		} else {
			for (const key of VISIBILITY_KEYS) {
				pushFieldChange(changes, key, oldRecord[key], newRecord[key])
			}
		}
	}

	for (const key of keys) {
		if (SKIP_KEYS.has(key)) continue
		if ((VISIBILITY_KEYS as readonly string[]).includes(key)) continue
		pushFieldChange(changes, key, oldRecord[key], newRecord[key])
	}

	return changes
}

export function summarizeAuditEntry(
	type: 'CREATE' | 'UPDATE' | 'DELETE',
	changes: AuditFieldChange[]
): string {
	if (type === 'CREATE') return 'Erstellt'
	if (type === 'DELETE') return 'Gelöscht'
	if (changes.length === 0) return 'Aktualisiert'
	if (changes.length === 1) {
		const only = changes[0]
		return only ? `${only.label} geändert` : 'Aktualisiert'
	}
	return `${changes.length} Felder geändert`
}
