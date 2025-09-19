'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { ChevronRight, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo } from 'react'
import { deleteOrganizer, listOrganizersAdmin } from '@/client'
import type { OrganizerWithInvite } from '@/client/types.gen'
import { CreateOrganizerDialog } from '@/components/create-organizer-dialog'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

export default function ManageOrganizersPage() {
	const qc = useQueryClient()
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const isSuperUser = meData?.super_user ?? false

	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['organizers-admin'],
		queryFn: () => listOrganizersAdmin()
	})

	const organizers = useMemo(
		() => (data?.data ?? []) as OrganizerWithInvite[],
		[data]
	)

	const onDelete = useCallback(
		async (id: number) => {
			await deleteOrganizer({ path: { id } })
			await qc.invalidateQueries({ queryKey: ['organizers-admin'] })
			await qc.invalidateQueries({ queryKey: ['organizers'] })
		},
		[qc]
	)

	const columns: ColumnDef<OrganizerWithInvite>[] = useMemo(
		() => [
			{
				accessorKey: 'name',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Name" />
				),
				cell: ({ row }) => (
					<div className="max-w-[200px]">
						<div className="font-medium text-sm">{row.original.name}</div>
						{row.original.super_user && (
							<div className="text-xs text-primary font-medium">Super User</div>
						)}
					</div>
				),
				size: 200
			},
			{
				accessorKey: 'email',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="E-Mail" />
				),
				cell: ({ row }) => (
					<div className="text-sm">{row.original.email || '—'}</div>
				),
				size: 200
			},
			{
				accessorKey: 'invite_status',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Status" />
				),
				cell: ({ row }) => {
					const status = row.original.invite_status
					const statusColors = {
						PENDING: 'text-yellow-600 bg-yellow-50',
						EXPIRED: 'text-red-600 bg-red-50',
						COMPLETED: 'text-green-600 bg-green-50'
					}
					const statusText = {
						PENDING: 'Ausstehend',
						EXPIRED: 'Abgelaufen',
						COMPLETED: 'Abgeschlossen'
					}
					return (
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
						>
							{statusText[status]}
						</span>
					)
				},
				filterFn: (row, _id, value: string[]) => {
					if (!value?.length) return true
					return value.includes(row.original.invite_status)
				},
				size: 150
			},
			{
				accessorKey: 'created_at',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Erstellt" />
				),
				cell: ({ row }) => (
					<div className="text-sm">
						{format(new Date(row.original.created_at), 'dd.MM.yyyy HH:mm')}
					</div>
				),
				sortingFn: (a, b, id) =>
					new Date(a.getValue(id) as string).getTime() -
					new Date(b.getValue(id) as string).getTime(),
				size: 150
			},
			{
				id: 'actions',
				header: 'Aktionen',
				enableHiding: false,
				cell: ({ row }) => {
					const organizer = row.original
					const isPending = organizer.invite_status === 'PENDING'

					return (
						<div className="flex justify-center">
							<div className="flex items-center gap-2">
								{isPending ? (
									<Button
										variant="outline"
										size="sm"
										className="h-8 px-2"
										disabled
										title="Bearbeitung nicht möglich - Einladung noch ausstehend"
									>
										<Pencil className="h-4 w-4 mr-1" /> Bearbeiten
									</Button>
								) : (
									<Link href={`/organizers/${organizer.id}`}>
										<Button variant="outline" size="sm" className="h-8 px-2">
											<Pencil className="h-4 w-4 mr-1" /> Bearbeiten
										</Button>
									</Link>
								)}
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="destructive"
											size="sm"
											className="h-8 px-2"
										>
											<Trash2 className="h-4 w-4 mr-1" /> Löschen
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Verein löschen</AlertDialogTitle>
											<AlertDialogDescription>
												Bist du sicher, dass du "{organizer.name}" löschen
												möchtest? Diese Aktion kann nicht rückgängig gemacht
												werden.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Abbrechen</AlertDialogCancel>
											<AlertDialogAction
												onClick={() => onDelete(organizer.id)}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												Löschen
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						</div>
					)
				},
				size: 200
			}
		],
		[onDelete]
	)

	const statusOptions = useMemo(
		() => [
			{ label: 'Ausstehend', value: 'PENDING' },
			{ label: 'Abgelaufen', value: 'EXPIRED' },
			{ label: 'Abgeschlossen', value: 'COMPLETED' }
		],
		[]
	)

	// Redirect non-superusers
	if (!isSuperUser) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">Vereine verwalten</h1>
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<h2 className="text-2xl font-bold mb-2">Zugriff verweigert</h2>
						<p className="text-muted-foreground mb-4">
							Du hast keine Berechtigung, diese Seite zu besuchen.
						</p>
						<Link href="/organizers">
							<Button>Zurück zu Vereinen</Button>
						</Link>
					</div>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">Vereine verwalten</h1>
					</div>
				</header>
				<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
					<div className="text-center">Lade Vereine...</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">Vereine verwalten</h1>
					</div>
				</header>
				<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
					<div className="text-center text-destructive">
						Fehler beim Laden der Vereine
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">Vereine verwalten</h1>
				</div>
			</header>

			<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
				{/* Breadcrumbs */}
				<nav className="flex items-center space-x-2 text-sm text-muted-foreground">
					<Link
						href="/organizers"
						className="hover:text-foreground transition-colors"
					>
						Vereine
					</Link>
					<ChevronRight className="h-4 w-4" />
					<span className="text-foreground">Verwalten</span>
				</nav>

				{/* Header Section */}
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">
							Vereine verwalten
						</h2>
						<p className="text-muted-foreground mt-1">
							Verwalte alle Vereine und deren Einladungsstatus
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
							Aktualisieren
						</Button>
						<CreateOrganizerDialog
							onSuccess={() => {
								refetch()
								qc.invalidateQueries({ queryKey: ['organizers'] })
							}}
						/>
					</div>
				</div>

				{/* Data Table */}
				<Card>
					<CardHeader>
						<CardTitle>Vereine ({organizers.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<DataTable
							tableId="organizers-manage"
							columns={columns}
							data={organizers}
							enableFilter
							enablePagination
							initialPageSize={10}
							filterOptions={{
								searchFilter: {
									column: 'name',
									title: 'Name'
								},
								selectFilters: [
									{
										column: 'invite_status',
										title: 'Status',
										options: statusOptions
									}
								]
							}}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
