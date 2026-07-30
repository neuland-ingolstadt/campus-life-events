import { formatInTimeZone } from 'date-fns-tz'

export const CAMPUS_TIME_ZONE = 'Europe/Berlin'

export function formatInCampusTimeZone(
	date: Date | number | string,
	format: string
) {
	return formatInTimeZone(date, CAMPUS_TIME_ZONE, format)
}
