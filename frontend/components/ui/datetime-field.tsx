'use client'

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
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

function TimeSelects({
	value,
	onValueChange,
	disabled = false
}: {
	value: string
	onValueChange: (value: string | null) => void
	disabled?: boolean
}) {
	const { hour, minute } = parseTimeParts(value || '00:00')

	return (
		<div className="grid min-w-0 grid-cols-2 gap-2">
			<Select
				value={hour}
				disabled={disabled}
				onValueChange={(nextHour) => {
					onValueChange(`${nextHour}:${minute}`)
				}}
			>
				<SelectTrigger className="w-full min-w-0">
					<SelectValue placeholder="Std" />
				</SelectTrigger>
				<SelectContent
					position="popper"
					className="z-[70] max-h-60"
				>
					{HOURS.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				value={minute}
				disabled={disabled}
				onValueChange={(nextMinute) => {
					onValueChange(`${hour}:${nextMinute}`)
				}}
			>
				<SelectTrigger className="w-full min-w-0">
					<SelectValue placeholder="Min" />
				</SelectTrigger>
				<SelectContent
					position="popper"
					className="z-[70] max-h-60"
				>
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
	const [localDate, setLocalDate] = useState<Date | undefined>(value)
	const [timeString, setTimeString] = useState<string>('')

	useEffect(() => {
		setLocalDate(value)
		if (value) {
			setTimeString(format(value, 'HH:mm'))
		} else {
			setTimeString('')
		}
	}, [value])

	useEffect(() => {
		if (disabled) {
			setOpen(false)
		}
	}, [disabled])

	const dateButtonLabel = useMemo(() => {
		return localDate
			? format(localDate, 'PPP', { locale: de })
			: 'Datum auswählen'
	}, [localDate])

	const handleDateSelect = (date?: Date) => {
		if (disabled) {
			return
		}
		setLocalDate(date)
		setOpen(false)
		if (!date) {
			onValueChange(undefined)
			return
		}
		if (timeString) {
			const [hours, minutes] = timeString.split(':').map(Number)
			const combined = new Date(date)
			combined.setHours(hours || 0, minutes || 0, 0, 0)
			onValueChange(combined)
			return
		}
		onValueChange(new Date(date))
	}

	const handleTimeChange = (newTime: string | null) => {
		if (disabled) {
			return
		}
		const timeStr = newTime || ''
		setTimeString(timeStr)
		if (!localDate || !timeStr) {
			return
		}
		const [hours, minutes] = timeStr.split(':').map(Number)
		const combined = new Date(localDate)
		combined.setHours(hours || 0, minutes || 0, 0, 0)
		onValueChange(combined)
	}

	const dateButton = (
		<Button
			type="button"
			variant="outline"
			disabled={disabled}
			className={cn(
				'w-full min-w-0 justify-between',
				!localDate && 'text-muted-foreground'
			)}
		>
			<span className="truncate">{dateButtonLabel}</span>
			<CalendarIcon className="ml-2 size-4 shrink-0 opacity-60" />
		</Button>
	)

	const calendar = (
		<Calendar
			mode="single"
			selected={localDate}
			onSelect={handleDateSelect}
			locale={de}
		/>
	)

	const controls = (
		<div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
			{isMobile ? (
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
			)}
			<div className="min-w-0">
				<TimeSelects
					value={timeString}
					onValueChange={handleTimeChange}
					disabled={disabled}
				/>
			</div>
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
