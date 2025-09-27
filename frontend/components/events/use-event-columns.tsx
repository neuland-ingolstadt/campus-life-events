'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { useMemo } from 'react'
import type { Event as ApiEvent } from '@/client/types.gen'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { dateRangeFilter } from '@/components/data-table/date-range-filter'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { EventActionsCell } from './event-actions-cell'

interface UseEventColumnsProps {
	readonly getOrganizerName: (organizerId: number) => string
	readonly organizerId?: number
	readonly isAdmin: boolean
	readonly onDelete: (id: number) => Promise<void>
}

export function useEventColumns({
	getOrganizerName,
	organizerId,
	isAdmin,
	onDelete
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
						<div className="font-medium text-sm leading-tight">
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
								{format(new Date(row.original.start_date_time), 'MMM dd, yyyy')}
							</div>
							<div className="text-xs text-muted-foreground">
								{format(new Date(row.original.start_date_time), 'HH:mm')}
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
								{format(new Date(row.original.end_date_time), 'MMM dd, yyyy')}
							</div>
							<div className="text-xs text-muted-foreground">
								{format(new Date(row.original.end_date_time), 'HH:mm')}
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
					<DataTableColumnHeader column={column} title="Verein" />
				),
				accessorFn: (row) => getOrganizerName(row.organizer_id),
				cell: ({ getValue }) => (
					<div className="text-xs font-medium bg-primary/5 text-primary border border-primary/20 rounded-full px-2 py-1 inline-block">
						{getValue<string>()}
					</div>
				),
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
					const isPublic = row.publish_app || row.publish_newsletter
					return isPublic ? 'public' : 'internal'
				},
				cell: ({ getValue }) => {
					const visibility = getValue<string>()
					const isPublic = visibility === 'public'
					return (
						<Tooltip>
							<TooltipTrigger asChild>
								<div
									className={` border border-primary/20 rounded-full px-2 py-1 inline-block ${
										isPublic
											? ' border border-border text-blue-500 bg-blue-500/5'
											: ' border border-border text-purple-500 bg-purple-500/5'
									}`}
								>
									{isPublic ? 'Extern' : 'Intern'}
								</div>
							</TooltipTrigger>
							<TooltipContent>
								{isPublic
									? 'Öffentliches Event: Beworben in Newsletter / App'
									: 'Internes Event: Nicht im Newsletter / App'}
							</TooltipContent>
						</Tooltip>
					)
				},
				sortingFn: 'alphanumeric',
				filterFn: (row, _id, value: string[]) => {
					if (!value?.length) return true
					const isPublic =
						row.original.publish_app || row.original.publish_newsletter
					const visibility = isPublic ? 'public' : 'internal'
					return value.includes(visibility)
				},
				size: 120
			},
			{
				id: 'actions',
				header: 'Aktionen',
				enableHiding: false,
				cell: ({ row }) => {
					const event = row.original
					const canManage =
						isAdmin ||
						(organizerId !== undefined && organizerId === event.organizer_id)

					return (
						<EventActionsCell
							event={event}
							canManage={canManage}
							onDelete={onDelete}
						/>
					)
				},
				size: 200
			}
		],
		[getOrganizerName, organizerId, isAdmin, onDelete]
	)
}
