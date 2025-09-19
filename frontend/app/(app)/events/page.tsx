"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, flexRender } from "@tanstack/react-table";
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { listEvents, deleteEvent, listOrganizers } from "@/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Clock3, Plus, Search, X, Calendar as CalendarIcon, RefreshCw, ChevronsUpDown, Settings2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { me } from "@/lib/auth";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";

export default function EventsPage() {
  const qc = useQueryClient();
  const { data: meData } = useQuery({ queryKey: ["auth", "me"], queryFn: me });
  const userId = meData?.id as number | undefined;

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const defaultFutureRange = { from: new Date(), to: undefined } as const;
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: "start_date_time", value: defaultFutureRange },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultFutureRange);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: () => listEvents(),
  });

  const { data: organizersData } = useQuery({
    queryKey: ["organizers"],
    queryFn: () => listOrganizers(),
  });

  const getOrganizerName = useCallback((organizerId: number) => {
    const organizer = organizersData?.data?.find((org: any) => org.id === organizerId);
    return organizer?.name || "Unknown Organizer";
  }, [organizersData]);

  const events = useMemo(() => (data?.data ?? []) as any[], [data]);

  // Columns
  const onDelete = useCallback(async (id: number) => {
    await deleteEvent({ path: { id } });
    await qc.invalidateQueries({ queryKey: ["events"] });
  }, [qc]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      accessorKey: "title_de",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2">
          Event Title
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[380px] space-y-1">
          <div className="font-medium text-sm leading-tight">{row.original.title_de}</div>
          {row.original.title_en && row.original.title_en !== row.original.title_de && (
            <div className="text-xs text-muted-foreground leading-tight">{row.original.title_en}</div>
          )}
          {row.original.description_de && (
            <div className="text-xs text-muted-foreground line-clamp-1">{row.original.description_de}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "start_date_time",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2">
          Start Date
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="font-medium">{format(new Date(row.original.start_date_time), "MMM dd, yyyy")}</div>
            <div className="text-xs text-muted-foreground">{format(new Date(row.original.start_date_time), "HH:mm")}</div>
          </div>
        </div>
      ),
      sortingFn: (a, b, id) => new Date(a.getValue(id) as string).getTime() - new Date(b.getValue(id) as string).getTime(),
      filterFn: (row, id, value: { from?: Date; to?: Date }) => {
        if (!value?.from && !value?.to) return true;
        const d = new Date(row.getValue(id) as string);
        if (value?.from && value?.to) return isWithinInterval(d, { start: startOfDay(value.from), end: endOfDay(value.to) });
        if (value?.from) return d >= startOfDay(value.from);
        if (value?.to) return d <= endOfDay(value.to);
        return true;
      },
    },
    {
      accessorKey: "end_date_time",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2">
          End Date
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        row.original.end_date_time ? (
          <div className="flex items-center gap-2 text-sm">
            <Clock3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium">{format(new Date(row.original.end_date_time), "MMM dd, yyyy")}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(row.original.end_date_time), "HH:mm")}</div>
            </div>
          </div>
        ) : <span className="text-muted-foreground text-sm">—</span>
      ),
      enableHiding: true,
      sortingFn: (a, b, id) => {
        const av = a.getValue(id) as string | null;
        const bv = b.getValue(id) as string | null;
        const at = av ? new Date(av).getTime() : 0;
        const bt = bv ? new Date(bv).getTime() : 0;
        return at - bt;
      },
    },
    {
      id: "organizer",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2">
          Organizer
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      accessorFn: (row) => getOrganizerName(row.organizer_id),
      cell: ({ getValue }) => <div className="text-sm font-medium">{getValue<string>()}</div>,
      sortingFn: "alphanumeric",
      filterFn: (row, _id, value: number[]) => {
        if (!value?.length) return true;
        return value.includes(row.original.organizer_id);
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const e = row.original;
        return (
          <div className="flex justify-center">
            {userId && userId === e.organizer_id ? (
              <div className="flex items-center gap-2">
                <Link href={`/events/${e.id}`}>
                  <Button variant="outline" size="sm" className="h-8 px-2">
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="h-8 px-2">
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{e.title_de}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        );
      },
    },
  ], [userId, getOrganizerName, onDelete]);

  const table = useReactTable({
    data: events,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue) return true;
      const q = filterValue.toLowerCase();
      const e = row.original;
      const organizer = getOrganizerName(e.organizer_id).toLowerCase();
      return (
        e.title_de?.toLowerCase().includes(q) ||
        e.title_en?.toLowerCase().includes(q) ||
        e.description_de?.toLowerCase().includes(q) ||
        e.description_en?.toLowerCase().includes(q) ||
        organizer.includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // moved onDelete into useCallback above

  const clearFilters = () => {
    setGlobalFilter("");
    setDateRange(defaultFutureRange);
    setColumnFilters([{ id: "start_date_time", value: defaultFutureRange }]);
    table.getColumn("start_date_time")?.setFilterValue(defaultFutureRange);
  };

  const hasActiveFilters = Boolean(globalFilter) || (columnFilters?.filter((c) => c.id !== "start_date_time").length ?? 0) > 0 || Boolean(dateRange?.to);

  const skeletonKeys = ["a","b","c","d","e"] as const;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Events</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Events</h2>
            <p className="text-muted-foreground mt-1">
              Manage and organize campus events with advanced filtering
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {userId && (
              <Link href="/events/new">
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Event
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Toolbar / Filters - always visible, no card */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">Filters</div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Search</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events, organizers..."
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter removed */}

              {/* Date Range */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Date Range</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {(() => {
                        const start = dateRange?.from;
                        const end = dateRange?.to;
                        if (!start) return "Pick a date range";
                        if (end) return `${format(start, "MMM dd")} - ${format(end, "MMM dd")}`;
                        return `${format(start, "MMM dd, yyyy")}`;
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        table.getColumn("start_date_time")?.setFilterValue(range);
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Page Size */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Per Page</div>
                <Select value={`${table.getState().pagination.pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>

          {/* Organizer Filter */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Vereine</div>
            <div className="flex flex-wrap gap-2">
              {organizersData?.data?.map((org: any) => {
                const current: number[] = (table.getColumn("organizer")?.getFilterValue() as number[]) || [];
                const checked = current.includes(org.id);
                return (
                  <div key={org.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`org-${org.id}`}
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        const next = isChecked ? [...current, org.id] : current.filter((v) => v !== org.id);
                        table.getColumn("organizer")?.setFilterValue(next.length ? next : undefined);
                      }}
                    />
                    <label htmlFor={`org-${org.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {org.name}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Events ({table.getFilteredRowModel().rows.length})
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {table.getSelectedRowModel().rows.length} selected • Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {skeletonKeys.map((k) => (
                  <div key={`loading-skeleton-row-${k}`} className="flex items-center space-x-4">
                    <div className="h-4 bg-muted animate-pulse rounded w-8" />
                    <div className="h-4 bg-muted animate-pulse rounded flex-1" />
                    <div className="h-4 bg-muted animate-pulse rounded w-32" />
                    <div className="h-4 bg-muted animate-pulse rounded w-24" />
                    <div className="h-4 bg-muted animate-pulse rounded w-20" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-destructive text-lg font-medium">Failed to load events</p>
              <p className="text-muted-foreground mt-2">Please try again later</p>
            </div>
          ) : table.getRowModel().rows.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters ? "No events match your current filters." : "Get started by creating your first event."}
              </p>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/50">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination and Column Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Settings2 className="mr-2 h-4 w-4" /> View
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="hidden h-8 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                  First
                </Button>
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  Previous
                </Button>
                <div className="w-[120px] text-center text-sm">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  Next
                </Button>
                <Button variant="outline" size="sm" className="hidden h-8 lg:flex" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                  Last
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Dialogs removed; use dedicated pages for create/edit */}
      </div>
    </div>
  );
}
