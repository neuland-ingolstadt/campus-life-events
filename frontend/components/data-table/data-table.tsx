import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type SortingState,
	type TableState,
	useReactTable
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	DataTableFilterToolbar,
	type FilterOptions
} from '@/components/data-table/filter-toolbar'
import { DataTablePagination } from '@/components/data-table/pagination-toolbar'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type DataTableProps<TData, TValue> = {
	tableId: string
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	onClick?: (item: TData) => void
	initialSorting?: SortingState
	columnFilters?: ColumnFiltersState
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void
} & (
	| {
			enableFilter: true
			filterOptions: FilterOptions<TData, TValue>
	  }
	| { enableFilter?: false; filterOptions?: never }
) &
	(
		| {
				enablePagination: true
				initialPageSize?: number
		  }
		| { enablePagination?: false; initialPageSize?: never }
	)

export function DataTable<TData, TValue>({
	tableId,
	columns,
	data,
	onClick,
	enablePagination = false,
	enableFilter = false,
	filterOptions,
	initialPageSize,
	initialSorting,
	columnFilters: columnFiltersProp,
	onColumnFiltersChange
}: DataTableProps<TData, TValue>) {
	'use no memo'
	const tableStateKey = useMemo(() => `tableState-${tableId}`, [tableId])
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	const initialState: Partial<TableState> = useMemo(() => {
		if (typeof window === 'undefined') return

		const tableState = localStorage.getItem(tableStateKey)
		return tableState ? JSON.parse(tableState) : {}
	}, [tableStateKey])

	const [sorting, setSorting] = useState<SortingState>(initialSorting || [])
	const [uncontrolledColumnFilters, setUncontrolledColumnFilters] =
		useState<ColumnFiltersState>(initialState?.columnFilters ?? [])

	const isControlled = columnFiltersProp !== undefined
	const columnFilters = isControlled
		? (columnFiltersProp ?? [])
		: uncontrolledColumnFilters

	const handleColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
		(updater) => {
			const nextValue =
				typeof updater === 'function' ? updater(columnFilters) : updater

			if (!isControlled) {
				setUncontrolledColumnFilters(nextValue)
			}

			if (onColumnFiltersChange) {
				onColumnFiltersChange(nextValue)
			}
		},
		[columnFilters, isControlled, onColumnFiltersChange]
	)

	useEffect(() => {
		if (typeof window === 'undefined') return

		localStorage.setItem(
			tableStateKey,
			JSON.stringify({ sorting, columnFilters })
		)
	}, [sorting, columnFilters, tableStateKey])

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters
		},
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: initialPageSize ?? 10
			}
		},
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: handleColumnFiltersChange,
		getPaginationRowModel: enablePagination
			? getPaginationRowModel()
			: undefined,
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: enableFilter ? getFilteredRowModel() : undefined
	})

	if (!isClient) return null

	return (
		<div className="flex flex-col gap-3">
			{enableFilter && (
				<DataTableFilterToolbar
					table={table}
					searchFilter={filterOptions?.searchFilter}
					selectFilters={filterOptions?.selectFilters}
					dateRangeFilters={filterOptions?.dateRangeFilters}
				/>
			)}

			<div className="rounded-md border mt-1">
				<Table>
					<TableHeader className="bg-muted/50">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											style={{
												width:
													header.getSize() !== 150
														? header.getSize()
														: undefined
											}}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className={cn({
										'cursor-pointer': !!onClick
									})}
									onClick={onClick ? () => onClick(row.original) : undefined}
								>
									{row.getAllCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									Keine Einträge.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			{enablePagination && <DataTablePagination table={table} />}
		</div>
	)
}
