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
	'use no memo'
	const isFiltered = table.getState().columnFilters.length > 0

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
			{isFiltered && (
				<div className="flex items-center gap-2 border-l border-border pl-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.resetColumnFilters()}
						className="h-8 px-3 text-muted-foreground hover:text-foreground"
					>
						Alle Filter löschen
						<X className="ml-2 h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	)
}
