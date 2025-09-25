import type { Column, Table } from '@tanstack/react-table'
import {
	DataTableDateRangeFilter,
	type DateRangeFilter
} from '@/components/data-table/date-range-filter'
import {
	DataTableFacetedFilter,
	type FacetFilter
} from '@/components/data-table/faceted-filter'
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
	'use no memo'

	return (
		<div className="flex flex-1 items-center gap-2">
			<div className="flex items-center gap-2">
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
			</div>
		</div>
	)
}
