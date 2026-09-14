'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import type { Event as ApiEvent } from '@/client/types.gen'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { dateRangeFilter } from '@/components/data-table/date-range-filter'
import {
	EventOrganizerBadge,
	EventVisibilityIndicator
} from '@/components/events/event-status-badges'
import { formatInCampusTimeZone } from '@/lib/date-time'
import {
	deriveEventVisibilityMode,
	type EventVisibilityMode
} from '@/lib/event-visibility'

interface UseEventColumnsProps {
	readonly getOrganizerName: (organizerId: number) => string
	readonly organizerId?: number
}

export function useEventColumns({
	getOrganizerName,
	organizerId
}: UseEventColumnsProps): ColumnDef<ApiEvent>[] {
	return useMemo(
		() => [
			{
				accessorKey: 'title_de',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Eventtitel" />
				),
				cell: ({ row }) => (
					<div className="max-w-[380px] space-y-1">
						<div className="font-medium text-sm leading-tight truncate">
							{row.original.title_de}
						</div>
						{row.original.description_de && (
							<div className="text-xs text-muted-foreground line-clamp-1">
								{row.original.description_de}
							</div>
						)}
					</div>
				),
				size: 300
			},
			{
				accessorKey: 'start_date_time',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Startdatum" />
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-2 text-sm">
						<div>
							<div className="font-medium">
								{formatInCampusTimeZone(
									new Date(row.original.start_date_time),
									'dd.MM.yyyy'
								)}
							</div>
							<div className="text-xs text-muted-foreground">
								{formatInCampusTimeZone(
									new Date(row.original.start_date_time),
									'HH:mm'
								)}
							</div>
						</div>
					</div>
				),
				sortingFn: (a, b, id) =>
					new Date(a.getValue(id) as string).getTime() -
					new Date(b.getValue(id) as string).getTime(),
				filterFn: dateRangeFilter,
				size: 150
			},
			{
				accessorKey: 'end_date_time',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Enddatum" />
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-2 text-sm">
						<div>
							<div className="font-medium">
								{formatInCampusTimeZone(
									new Date(row.original.end_date_time),
									'dd.MM.yyyy'
								)}
							</div>
							<div className="text-xs text-muted-foreground">
								{formatInCampusTimeZone(
									new Date(row.original.end_date_time),
									'HH:mm'
								)}
							</div>
						</div>
					</div>
				),
				sortingFn: (a, b, id) =>
					new Date(a.getValue(id) as string).getTime() -
					new Date(b.getValue(id) as string).getTime(),
				size: 150
			},
			{
				id: 'organizer',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Organisation" />
				),
				accessorFn: (row) => getOrganizerName(row.organizer_id),
				cell: ({ row, getValue }) => {
					const isOwn =
						organizerId !== undefined &&
						organizerId === row.original.organizer_id
					return <EventOrganizerBadge name={getValue<string>()} isOwn={isOwn} />
				},
				sortingFn: 'alphanumeric',
				filterFn: (row, _id, value: string[]) => {
					if (!value?.length) return true
					return value.includes(row.original.organizer_id.toString())
				},
				size: 150
			},
			{
				id: 'visibility',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Sichtbarkeit" />
				),
				accessorFn: (row) => {
					return deriveEventVisibilityMode(row)
				},
				cell: ({ getValue }) => {
					const visibility = getValue<EventVisibilityMode>()
					return <EventVisibilityIndicator mode={visibility} />
				},
				sortingFn: 'alphanumeric',
				filterFn: (row, _id, value: string[]) => {
					if (!value?.length) return true
					const visibility = deriveEventVisibilityMode(row.original)
					return value.includes(visibility)
				},
				size: 120
			},
			{
				id: 'open',
				header: () => <span className="sr-only">Öffnen</span>,
				enableHiding: false,
				enableSorting: false,
				cell: () => (
					<div className="flex justify-end pr-1">
						<ChevronRight
							className="size-4 text-muted-foreground"
							aria-hidden
						/>
					</div>
				),
				size: 40
			}
		],
		[getOrganizerName, organizerId]
	)
}
