const NEULAND_MAP_ORIGIN = 'https://web.neuland.app'

export function isValidRoom(room: string): boolean {
	return /^[A-Za-z]{1,2}U?\d{3}$/.test(room.trim())
}

export function neulandMapRoomUrl(room: string): string {
	return `${NEULAND_MAP_ORIGIN}/map/?room=${encodeURIComponent(room.trim())}`
}

export function googleMapsUrl(location: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

export function locationUrl(location: string): string {
	const trimmed = location.trim()
	if (isValidRoom(trimmed)) {
		return neulandMapRoomUrl(trimmed)
	}
	return googleMapsUrl(location)
}
