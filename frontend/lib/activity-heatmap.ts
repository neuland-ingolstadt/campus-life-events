import { addDays, getISODay } from 'date-fns'
import { de } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { OrganizerKind, PublicEventResponse } from '@/client/types.gen'
import { CAMPUS_TIME_ZONE } from '@/lib/date-time'

export type HeatmapSeries = 'club' | 'thi' | 'mixed' | 'empty'

export type HeatmapDay = {
	dateKey: string
	date: Date
	clubCount: number
	thiCount: number
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

export function buildActivityHeatmap(
	events: PublicEventResponse[],
	now = new Date(),
	weekCount = 53
): ActivityHeatmapModel {
	const endDate = campusNoon(now)
	const endDateKey = toCampusDateKey(endDate)
	const endWeekStart = startOfCampusWeek(endDate)
	const startWeekStart = addDays(endWeekStart, -(weekCount - 1) * 7)
	const startDateKey = toCampusDateKey(startWeekStart)

	const counts = new Map<string, { club: number; thi: number }>()

	for (const event of events) {
		const key = toCampusDateKey(event.start_date_time)
		if (key < startDateKey || key > endDateKey) continue

		const bucket = counts.get(key) ?? { club: 0, thi: 0 }
		bucket[kindBucket(event.organizer_kind)] += 1
		counts.set(key, bucket)
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
			const bucket = counts.get(dateKey) ?? { club: 0, thi: 0 }
			const total = inRange ? bucket.club + bucket.thi : 0
			if (inRange && total > 0) {
				clubTotal += bucket.club
				thiTotal += bucket.thi
				activeDays += 1
			}
			days.push({
				dateKey,
				date,
				clubCount: inRange ? bucket.club : 0,
				thiCount: inRange ? bucket.thi : 0,
				total,
				level: inRange ? intensityLevel(total) : 0,
				series: inRange ? seriesFor(bucket.club, bucket.thi) : 'empty',
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
