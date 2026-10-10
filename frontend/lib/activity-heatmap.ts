import { addDays, getISODay } from 'date-fns'
import { de } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { OrganizerKind, PublicEventResponse } from '@/client/types.gen'
import { CAMPUS_TIME_ZONE } from '@/lib/date-time'

export type HeatmapSeries = 'club' | 'thi' | 'mixed' | 'empty'

export type HeatmapDay = {
	dateKey: string
	date: Date
	isToday: boolean
	clubEvents: PublicEventResponse[]
	thiEvents: PublicEventResponse[]
	total: number
	level: 0 | 1 | 2 | 3 | 4
	series: HeatmapSeries
	inRange: boolean
}

export type ActivityHeatmapModel = {
	weeks: HeatmapDay[][]
	monthLabels: { label: string; weekIndex: number }[]
	totals: { club: number; thi: number; days: number }
	startDateKey: string
	endDateKey: string
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

export function heatmapDayLabels() {
	return DAY_LABELS
}

export function toCampusDateKey(date: Date | string) {
	return formatInTimeZone(date, CAMPUS_TIME_ZONE, 'yyyy-MM-dd')
}

function campusNoon(date: Date) {
	const zoned = toZonedTime(date, CAMPUS_TIME_ZONE)
	return fromZonedTime(
		`${zoned.getFullYear()}-${String(zoned.getMonth() + 1).padStart(2, '0')}-${String(zoned.getDate()).padStart(2, '0')}T12:00:00`,
		CAMPUS_TIME_ZONE
	)
}

function startOfCampusWeek(date: Date) {
	const day = campusNoon(date)
	return addDays(day, -(getISODay(day) - 1))
}

function intensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
	if (count <= 0) return 0
	if (count === 1) return 1
	if (count === 2) return 2
	if (count <= 4) return 3
	return 4
}

function seriesFor(clubCount: number, thiCount: number): HeatmapSeries {
	if (clubCount > 0 && thiCount > 0) return 'mixed'
	if (clubCount > 0) return 'club'
	if (thiCount > 0) return 'thi'
	return 'empty'
}

function kindBucket(kind: OrganizerKind): 'club' | 'thi' {
	return kind === 'THI_DEPARTMENT' ? 'thi' : 'club'
}

function isToday(date: Date): boolean {
	const today = new Date()
	return (
		date.getFullYear() === today.getFullYear() &&
		date.getMonth() === today.getMonth() &&
		date.getDate() === today.getDate()
	)
}

export function buildActivityHeatmap(
	events: PublicEventResponse[],
	startDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
	endDate = new Date()
): ActivityHeatmapModel {
	const startDateNoon = campusNoon(startDate)
	const startDateKey = toCampusDateKey(startDateNoon)

	const endDateNoon = campusNoon(endDate)
	const endDateKey = toCampusDateKey(endDateNoon)

	const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
	const weekCount = Math.ceil(
		(endDateNoon.getTime() - startDateNoon.getTime()) / MS_PER_WEEK
	)

	const endWeekStart = startOfCampusWeek(endDateNoon)
	const startWeekStart = addDays(endWeekStart, -(weekCount - 1) * 7)

	const eventMap = new Map<string, { club: PublicEventResponse[]; thi: PublicEventResponse[] }>()

	for (const event of events) {
		const key = toCampusDateKey(event.start_date_time)
		if (key < startDateKey || key > endDateKey) continue

		const bucketEvents = eventMap.get(key) ?? { club: [], thi: [] }
		bucketEvents[kindBucket(event.organizer_kind)].push(event)
		eventMap.set(key, bucketEvents)
	}

	const weeks: HeatmapDay[][] = []
	let clubTotal = 0
	let thiTotal = 0
	let activeDays = 0

	for (let week = 0; week < weekCount; week++) {
		const weekStart = addDays(startWeekStart, week * 7)
		const days: HeatmapDay[] = []
		for (let dow = 0; dow < 7; dow++) {
			const date = addDays(weekStart, dow)
			const dateKey = toCampusDateKey(date)
			const inRange = dateKey <= endDateKey
			const bucketEvents = eventMap.get(dateKey) ?? { club: [], thi: [] }
			const total = inRange ? bucketEvents.club.length + bucketEvents.thi.length : 0
			if (inRange && total > 0) {
				clubTotal += bucketEvents.club.length
				thiTotal += bucketEvents.thi.length
				activeDays += 1
			}
			days.push({
				dateKey,
				date,
				isToday: isToday(date),
				clubEvents: inRange ? bucketEvents.club : [],
				thiEvents: inRange ? bucketEvents.thi : [],
				total,
				level: inRange ? intensityLevel(total) : 0,
				series: inRange ? seriesFor(bucketEvents.club.length, bucketEvents.thi.length) : 'empty',
				inRange
			})
		}
		weeks.push(days)
	}

	const monthLabels: { label: string; weekIndex: number }[] = []
	let lastMonth = ''
	for (let week = 0; week < weeks.length; week++) {
		const firstDay = weeks[week]?.[0]
		if (!firstDay) continue
		const label = formatInTimeZone(firstDay.date, CAMPUS_TIME_ZONE, 'MMM', {
			locale: de
		})
		if (label !== lastMonth) {
			monthLabels.push({ label, weekIndex: week })
			lastMonth = label
		}
	}

	return {
		weeks,
		monthLabels,
		totals: { club: clubTotal, thi: thiTotal, days: activeDays },
		startDateKey,
		endDateKey
	}
}
