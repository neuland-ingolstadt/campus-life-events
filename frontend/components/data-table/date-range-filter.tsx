import type { Column } from '@tanstack/react-table'
import { endOfDay, format, isWithinInterval, startOfDay } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DataTableDateRangeFilterProps<TData, TValue> {
	column: Column<TData, TValue>
	title: string
}

export type DateRangeFilter<TData, TValue> = Omit<
	DataTableDateRangeFilterProps<TData, TValue>,
	'column'
> & {
	column: string
}

export function DataTableDateRangeFilter<TData, TValue>({
	column,
	title
}: DataTableDateRangeFilterProps<TData, TValue>) {
	const [dateRange, setDateRange] = useState<DateRange | undefined>(
		column.getFilterValue() as DateRange | undefined
	)

	const handleDateSelect = (range: DateRange | undefined) => {
		setDateRange(range)
		column.setFilterValue(range)
	}

	const clearFilter = () => {
		setDateRange(undefined)
		column.setFilterValue(undefined)
	}

	const hasFilter = dateRange?.from || dateRange?.to

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						'h-8 border-dashed relative',
						hasFilter && 'border-solid'
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{title}
					{hasFilter && (
						<>
							<span className="ml-2 text-xs">
								{dateRange?.from ? (
									dateRange?.to ? (
										<>
											{format(dateRange.from, 'MMM dd')} -{' '}
											{format(dateRange.to, 'MMM dd')}
										</>
									) : (
										format(dateRange.from, 'MMM dd, yyyy')
									)
								) : (
									'Filter aktiv'
								)}
							</span>
							<Button
								variant="ghost"
								size="sm"
								className="ml-2 h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
								onClick={(e) => {
									e.stopPropagation()
									clearFilter()
								}}
							>
								<X className="h-3 w-3" />
							</Button>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="range"
					selected={dateRange}
					onSelect={handleDateSelect}
					numberOfMonths={2}
					defaultMonth={dateRange?.from}
				/>
			</PopoverContent>
		</Popover>
	)
}

// Custom filter function for date ranges
export function dateRangeFilter(
	row: { getValue: (columnId: string) => string },
	columnId: string,
	value: DateRange | undefined
): boolean {
	if (!value?.from && !value?.to) return true

	const cellValue = row.getValue(columnId) as string
	if (!cellValue) return false

	const cellDate = new Date(cellValue)

	if (value?.from && value?.to) {
		return isWithinInterval(cellDate, {
			start: startOfDay(value.from),
			end: endOfDay(value.to)
		})
	}

	if (value?.from) {
		return cellDate >= startOfDay(value.from)
	}

	if (value?.to) {
		return cellDate <= endOfDay(value.to)
	}

	return true
}
