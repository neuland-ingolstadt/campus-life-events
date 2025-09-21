'use client'

import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { ChevronRight, RefreshCw, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { listAdmins } from '@/client'
import type { AdminWithInvite } from '@/client/types.gen'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { DataTable } from '@/components/data-table/data-table'
import { InviteAdminDialog } from '@/components/invite-admin-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

export default function ManageAdminsPage() {
	const { data: meData } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
	const isAdmin = meData?.account_type === 'ADMIN'

	const { data, isLoading, error, refetch } = useQuery<AdminWithInvite[]>({
		queryKey: ['admins'],
		queryFn: async () => {
			const response = await listAdmins({ throwOnError: true })
			return response.data ?? []
		}
	})

	const admins = useMemo(() => data ?? [], [data])

	const columns: ColumnDef<AdminWithInvite>[] = useMemo(
		() => [
			{
				accessorKey: 'display_name',
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Name" />
				),
				cell: ({ row }) => (
					<div className="max-w-[200px]">
						<div className="font-medium text-sm">
							{row.original.display_name}
						</div>
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
						PENDING:
							'text-yellow-600 bg-yellow-500/20 border border-yellow-600',
						EXPIRED: 'text-red-600 bg-red-500/20 border border-red-600',
						COMPLETED: 'text-green-600 bg-green-500/20 border border-green-600'
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
			}
		],
		[]
	)

	const statusOptions = useMemo(
		() => [
			{ label: 'Ausstehend', value: 'PENDING' },
			{ label: 'Abgelaufen', value: 'EXPIRED' },
			{ label: 'Abgeschlossen', value: 'COMPLETED' }
		],
		[]
	)

	if (!meData) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">
							Administrator*innen verwalten
						</h1>
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center text-muted-foreground">
						Lade Berechtigungen…
					</div>
				</div>
			</div>
		)
	}

	// Restrict access to admins
	if (meData && !isAdmin) {
		return (
			<div className="flex flex-col min-h-screen">
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">
							Administrator*innen verwalten
						</h1>
					</div>
				</header>
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<h2 className="text-2xl font-bold mb-2">Zugriff verweigert</h2>
						<p className="text-muted-foreground mb-4">
							Du benötigst Administratorrechte, um diesen Bereich zu sehen.
						</p>
						<Link href="/admin">
							<Button>Zurück zum Adminbereich</Button>
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
						<h1 className="text-lg font-semibold">
							Administrator*innen verwalten
						</h1>
					</div>
				</header>
				<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
					<div className="text-center">Lade Administrator*innen...</div>
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
						<h1 className="text-lg font-semibold">
							Administrator*innen verwalten
						</h1>
					</div>
				</header>
				<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
					<div className="text-center text-destructive">
						Fehler beim Laden der Administrator*innen
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col min-h-screen">
			<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4">
				<SidebarTrigger className="-ml-1" />
				<div className="flex items-center gap-2">
					<h1 className="text-lg font-semibold">
						Administrator*innen verwalten
					</h1>
				</div>
			</header>

			<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
				{/* Breadcrumbs */}
				<nav className="flex items-center space-x-2 text-sm text-muted-foreground">
					<Link
						href="/admin"
						className="hover:text-foreground transition-colors"
					>
						Adminbereich
					</Link>
					<ChevronRight className="h-4 w-4" />
					<span className="text-foreground">Administrator*innen verwalten</span>
				</nav>

				{/* Header Section */}
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">
							Administrator*innen verwalten
						</h2>
						<p className="text-muted-foreground mt-1">
							Verwalte alle Administrator*innen und deren Einladungsstatus
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
						<InviteAdminDialog />
					</div>
				</div>

				{/* Data Table */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShieldCheck className="h-5 w-5" />
							Administrator*innen ({admins.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<DataTable
							tableId="admins-manage"
							columns={columns}
							data={admins}
							enableFilter
							enablePagination
							initialPageSize={10}
							filterOptions={{
								searchFilter: {
									column: 'display_name',
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
