'use client'

import { de } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger
} from '@/components/ui/drawer'
import { FormDescription, FormLabel } from '@/components/ui/form'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import RequiredLabel from '@/components/ui/required-label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { CAMPUS_TIME_ZONE } from '@/lib/date-time'
import { cn } from '@/lib/utils'

export type DateTimeFieldProps = {
	label: string
	value?: Date
	onValueChange: (value?: Date) => void
	required?: boolean
	description?: string
	className?: string
	disabled?: boolean
	disabledHint?: string
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
	String(index).padStart(2, '0')
)
const MINUTES = Array.from({ length: 60 }, (_, index) =>
	String(index).padStart(2, '0')
)

function timeStringFromDate(date: Date) {
	return formatInTimeZone(date, CAMPUS_TIME_ZONE, 'HH:mm')
}

function parseTimeParts(timeString: string) {
	const [hours = '00', minutes = '00'] = timeString.split(':')
	const hour = Number(hours)
	const minute = Number(minutes)
	return {
		hour: Number.isFinite(hour)
			? String(Math.min(Math.max(hour, 0), 23)).padStart(2, '0')
			: '00',
		minute: Number.isFinite(minute)
			? String(Math.min(Math.max(minute, 0), 59)).padStart(2, '0')
			: '00'
	}
}

function combineCampusDateAndTime(date: Date, timeString: string) {
	const { hour, minute } = parseTimeParts(timeString)
	const zoned = toZonedTime(date, CAMPUS_TIME_ZONE)
	const year = zoned.getFullYear()
	const month = String(zoned.getMonth() + 1).padStart(2, '0')
	const day = String(zoned.getDate()).padStart(2, '0')
	return fromZonedTime(
		`${year}-${month}-${day}T${hour}:${minute}:00`,
		CAMPUS_TIME_ZONE
	)
}

function campusCalendarDate(date: Date) {
	const zoned = toZonedTime(date, CAMPUS_TIME_ZONE)
	return new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate())
}

function TimeSelects({
	value,
	onValueChange,
	disabled = false
}: {
	value: string
	onValueChange: (value: string) => void
	disabled?: boolean
}) {
	const hasTime = value.length > 0
	const { hour, minute } = parseTimeParts(hasTime ? value : '00:00')

	return (
		<div className="grid min-w-0 grid-cols-2 gap-2">
			<Select
				value={hasTime ? hour : undefined}
				disabled={disabled}
				onValueChange={(nextHour) => {
					onValueChange(`${nextHour}:${minute}`)
				}}
			>
				<SelectTrigger className="w-full min-w-0">
					<SelectValue placeholder="Std" />
				</SelectTrigger>
				<SelectContent position="popper" className="z-[70] max-h-60">
					{HOURS.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={hasTime ? minute : undefined}
				disabled={disabled}
				onValueChange={(nextMinute) => {
					onValueChange(`${hour}:${nextMinute}`)
				}}
			>
				<SelectTrigger className="w-full min-w-0">
					<SelectValue placeholder="Min" />
				</SelectTrigger>
				<SelectContent position="popper" className="z-[70] max-h-60">
					{MINUTES.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}

export default function DateTimeField({
	label,
	value,
	onValueChange,
	required = false,
	description,
	className,
	disabled = false,
	disabledHint
}: DateTimeFieldProps) {
	const isMobile = useIsMobile()
	const [open, setOpen] = useState(false)
	const [draftTime, setDraftTime] = useState('')
	const valueTime = value ? timeStringFromDate(value) : ''
	const timeString = valueTime || draftTime
	const selectedDay = value ? campusCalendarDate(value) : undefined

	useEffect(() => {
		if (disabled) {
			setOpen(false)
		}
	}, [disabled])

	useEffect(() => {
		if (value) {
			setDraftTime('')
		}
	}, [value])

	const dateButtonLabel = useMemo(() => {
		return value
			? formatInTimeZone(value, CAMPUS_TIME_ZONE, 'PPP', { locale: de })
			: 'Datum auswählen'
	}, [value])

	const handleDateSelect = (date?: Date) => {
		if (disabled) {
			return
		}
		setOpen(false)
		if (!date) {
			onValueChange(undefined)
			return
		}
		const time = timeString || '12:00'
		onValueChange(combineCampusDateAndTime(date, time))
		setDraftTime('')
	}

	const handleTimeChange = (newTime: string) => {
		if (disabled) {
			return
		}
		if (!value) {
			setDraftTime(newTime)
			return
		}
		setDraftTime('')
		onValueChange(combineCampusDateAndTime(value, newTime))
	}

	const dateButton = (
		<Button
			type="button"
			variant="outline"
			disabled={disabled}
			className={cn(
				'w-full min-w-0 justify-between',
				!value && 'text-muted-foreground'
			)}
		>
			<span className="truncate">{dateButtonLabel}</span>
			<CalendarIcon className="ml-2 size-4 shrink-0 opacity-60" />
		</Button>
	)

	const calendar = (
		<Calendar
			mode="single"
			selected={selectedDay}
			onSelect={handleDateSelect}
			locale={de}
			timeZone={CAMPUS_TIME_ZONE}
		/>
	)

	const timeControls = (
		<div className="min-w-0">
			<TimeSelects
				value={timeString}
				onValueChange={handleTimeChange}
				disabled={disabled}
			/>
		</div>
	)

	const dateControls = isMobile ? (
		<Drawer
			open={open}
			onOpenChange={(next) => {
				if (disabled) {
					return
				}
				setOpen(next)
			}}
		>
			<DrawerTrigger asChild>{dateButton}</DrawerTrigger>
			<DrawerContent className="z-[60]">
				<DrawerHeader>
					<DrawerTitle>{label}</DrawerTitle>
				</DrawerHeader>
				<div className="flex justify-center px-4 pb-6">{calendar}</div>
			</DrawerContent>
		</Drawer>
	) : (
		<Popover
			open={open}
			onOpenChange={(next) => {
				if (disabled) {
					return
				}
				setOpen(next)
			}}
			modal
		>
			<PopoverTrigger asChild>{dateButton}</PopoverTrigger>
			<PopoverContent
				className="z-[60] w-auto p-0"
				align="start"
				collisionPadding={16}
			>
				{calendar}
			</PopoverContent>
		</Popover>
	)

	const controls = (
		<div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
			{dateControls}
			{timeControls}
		</div>
	)

	return (
		<div className={cn('min-w-0 space-y-2', className)}>
			<div className="flex items-center justify-between">
				<FormLabel className="mb-0">
					{label} {required ? <RequiredLabel /> : null}
				</FormLabel>
			</div>
			{disabled && disabledHint ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="min-w-0">{controls}</div>
					</TooltipTrigger>
					<TooltipContent side="top">{disabledHint}</TooltipContent>
				</Tooltip>
			) : (
				controls
			)}
			{description ? <FormDescription>{description}</FormDescription> : null}
		</div>
	)
}
