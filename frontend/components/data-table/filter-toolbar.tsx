import type { Column, Table } from '@tanstack/react-table'
import { X } from 'lucide-react'
import {
	DataTableDateRangeFilter,
	type DateRangeFilter
} from '@/components/data-table/date-range-filter'
import {
	DataTableFacetedFilter,
	type FacetFilter
} from '@/components/data-table/faceted-filter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SearchFilter {
	column: string
	title: string
}

interface DataTableFilterToolbarProps<TData, TValue> {
	table: Table<TData>
	searchFilter: SearchFilter | undefined
	selectFilters?: FacetFilter<TData, TValue>[]
	dateRangeFilters?: DateRangeFilter<TData, TValue>[]
}

export type FilterOptions<TData, TValue> = Omit<
	DataTableFilterToolbarProps<TData, TValue>,
	'table'
>

export function DataTableFilterToolbar<TData, TValue>({
	table,
	searchFilter,
	selectFilters,
	dateRangeFilters
}: DataTableFilterToolbarProps<TData, TValue>) {
	const isFiltered = table.getState().columnFilters.length > 0

	return (
		<div className="flex flex-1 items-center space-x-2">
			{searchFilter && (
				<Input
					placeholder={`${searchFilter.title} filtern...`}
					value={
						(table
							.getColumn(searchFilter.column)
							?.getFilterValue() as string) ?? ''
					}
					onChange={(event) =>
						table
							.getColumn(searchFilter.column)
							?.setFilterValue(event.target.value)
					}
					className="h-8 w-[150px] lg:w-[250px]"
				/>
			)}
			{selectFilters?.map((filter) => (
				<DataTableFacetedFilter
					key={filter.title}
					{...filter}
					column={table.getColumn(filter.column) as Column<TData, TValue>}
				/>
			))}
			{dateRangeFilters?.map((filter) => (
				<DataTableDateRangeFilter
					key={filter.title}
					{...filter}
					column={table.getColumn(filter.column) as Column<TData, TValue>}
				/>
			))}
			{isFiltered && (
				<Button
					variant="ghost"
					onClick={() => table.resetColumnFilters()}
					className="h-8 px-2 lg:px-3"
				>
					Löschen
					<X className="ml-2 h-4 w-4" />
				</Button>
			)}
		</div>
	)
}
