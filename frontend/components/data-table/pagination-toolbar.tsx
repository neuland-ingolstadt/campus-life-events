import type { Table } from '@tanstack/react-table'
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

interface DataTablePaginationProps<TData> {
	table: Table<TData>
}

export function DataTablePagination<TData>({
	table
}: DataTablePaginationProps<TData>) {
	'use no memo'
	const pageSizes = Array.from(
		new Set(
			[5, 10, 20, 30, 40, 50, table.getState().pagination.pageSize].values()
		)
	).sort((a, b) => a - b)

	return (
		<div className="flex w-full min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-end">
			<div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:w-auto sm:justify-end lg:gap-x-8">
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-sm font-medium whitespace-nowrap">
						Zeilen pro Seite
					</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value: unknown) => {
							table.setPageSize(Number(value))
						}}
					>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{pageSizes.map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex min-w-0 items-center justify-center text-center text-sm font-medium tabular-nums">
					Seite {table.getState().pagination.pageIndex + 1} von{' '}
					{Math.max(1, table.getPageCount())}
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						className="hidden h-8 w-8 p-0 lg:flex"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to first page</span>
						<ChevronsLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to previous page</span>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to next page</span>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="hidden h-8 w-8 p-0 lg:flex"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to last page</span>
						<ChevronsRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}
