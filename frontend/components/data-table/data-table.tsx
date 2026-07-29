import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type PaginationState,
	type Row,
	type SortingState,
	type TableState,
	useReactTable
} from '@tanstack/react-table'
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState
} from 'react'
import {
	DataTableFilterToolbar,
	type FilterOptions
} from '@/components/data-table/filter-toolbar'
import { DataTablePagination } from '@/components/data-table/pagination-toolbar'
import { Skeleton } from '@/components/ui/skeleton'
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
	sorting?: SortingState
	onSortingChange?: OnChangeFn<SortingState>
	columnFilters?: ColumnFiltersState
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void
	pagination?: PaginationState
	onPaginationChange?: OnChangeFn<PaginationState>
	pageCount?: number
	manualFiltering?: boolean
	manualPagination?: boolean
	manualSorting?: boolean
	isLoading?: boolean
	renderMobileRows?: (args: { rows: Row<TData>[] }) => ReactNode
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

function isSortingState(value: unknown): value is SortingState {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				typeof item === 'object' &&
				item !== null &&
				typeof item.id === 'string' &&
				typeof item.desc === 'boolean'
		)
	)
}

function isColumnFiltersState(value: unknown): value is ColumnFiltersState {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				typeof item === 'object' && item !== null && typeof item.id === 'string'
		)
	)
}

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
	sorting: sortingProp,
	onSortingChange,
	columnFilters: columnFiltersProp,
	onColumnFiltersChange,
	pagination: paginationProp,
	onPaginationChange,
	pageCount,
	manualFiltering = false,
	manualPagination = false,
	manualSorting = false,
	isLoading = false,
	renderMobileRows
}: DataTableProps<TData, TValue>) {
	'use no memo'
	const tableStateKey = useMemo(() => `tableState-${tableId}`, [tableId])
	const [sorting, setSorting] = useState<SortingState>(initialSorting || [])
	const [uncontrolledColumnFilters, setUncontrolledColumnFilters] =
		useState<ColumnFiltersState>([])
	const [hasRestoredTableState, setHasRestoredTableState] = useState(false)

	const isControlled = columnFiltersProp !== undefined
	const isSortingControlled = sortingProp !== undefined
	const activeSorting = sortingProp ?? sorting
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: initialPageSize ?? 10
	})
	const activePagination = paginationProp ?? pagination
	const columnFilters = isControlled
		? (columnFiltersProp ?? [])
		: uncontrolledColumnFilters
	const loadingRowIds = useMemo(
		() =>
			Array.from(
				{ length: activePagination.pageSize },
				(_, index) => `loading-row-${index}`
			),
		[activePagination.pageSize]
	)
	const loadingColumnIds = useMemo(
		() => columns.map((column, index) => column.id ?? `column-${index}`),
		[columns]
	)

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
		try {
			const serializedState = localStorage.getItem(tableStateKey)

			if (!serializedState) {
				return
			}

			const savedState: Partial<TableState> = JSON.parse(serializedState)

			if (!isSortingControlled && isSortingState(savedState.sorting)) {
				setSorting(savedState.sorting)
			}

			if (!isControlled && isColumnFiltersState(savedState.columnFilters)) {
				setUncontrolledColumnFilters(savedState.columnFilters)
			}
		} catch {
			localStorage.removeItem(tableStateKey)
		} finally {
			setHasRestoredTableState(true)
		}
	}, [isControlled, isSortingControlled, tableStateKey])

	useEffect(() => {
		if (!hasRestoredTableState) {
			return
		}

		const stateToSave: Partial<TableState> = { sorting: activeSorting }

		if (!isControlled) {
			stateToSave.columnFilters = columnFilters
		}

		localStorage.setItem(tableStateKey, JSON.stringify(stateToSave))
	}, [
		activeSorting,
		columnFilters,
		tableStateKey,
		isControlled,
		hasRestoredTableState
	])

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting: activeSorting,
			columnFilters,
			pagination: activePagination
		},
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: initialPageSize ?? 10
			}
		},
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: onSortingChange ?? setSorting,
		onColumnFiltersChange: handleColumnFiltersChange,
		onPaginationChange: onPaginationChange ?? setPagination,
		manualFiltering,
		manualPagination,
		manualSorting,
		pageCount,
		getPaginationRowModel: enablePagination
			? getPaginationRowModel()
			: undefined,
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: enableFilter ? getFilteredRowModel() : undefined
	})

	return (
		<div className="flex w-full min-w-0 max-w-full flex-col gap-3">
			{enableFilter && (
				<DataTableFilterToolbar
					table={table}
					searchFilter={filterOptions?.searchFilter}
					selectFilters={filterOptions?.selectFilters}
					dateRangeFilters={filterOptions?.dateRangeFilters}
				/>
			)}

			{renderMobileRows ? (
				<div className="mt-1 md:hidden">
					{renderMobileRows({ rows: table.getRowModel().rows })}
				</div>
			) : null}

			<div
				className={cn(
					'rounded-md border mt-1',
					renderMobileRows && 'hidden md:block'
				)}
			>
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
						{isLoading ? (
							loadingRowIds.map((rowId) => (
								<TableRow key={rowId}>
									{loadingColumnIds.map((columnId) => (
										<TableCell key={`${rowId}-${columnId}`}>
											<Skeleton className="h-10 w-full bg-foreground/10" />
										</TableCell>
									))}
								</TableRow>
							))
						) : table.getRowModel().rows?.length ? (
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
