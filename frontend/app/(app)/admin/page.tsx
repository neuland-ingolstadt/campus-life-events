'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { ChevronRight, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo } from 'react'
import { deleteOrganizer, listAuditLogs, listOrganizersAdmin } from '@/client'
import type { AuditLogEntry, OrganizerWithInvite } from '@/client/types.gen'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { me } from '@/lib/auth'

export default function AdminPage() {
        const qc = useQueryClient()
        const { data: meData, isLoading: meLoading } = useQuery({ queryKey: ['auth', 'me'], queryFn: me })
        const isAdmin = meData?.account_type === 'ADMIN'

        const { data, isLoading, error, refetch } = useQuery({
                queryKey: ['organizers-admin'],
                queryFn: () => listOrganizersAdmin(),
                enabled: isAdmin
        })

        const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
                queryKey: ['audit-logs', { scope: 'admin' }],
                queryFn: () => listAuditLogs({ query: { limit: 200 } }),
                enabled: isAdmin
        })

        const organizers = useMemo(
                () => (data?.data ?? []) as OrganizerWithInvite[],
                [data]
        )

        const auditLogs = useMemo(
                () => (auditData?.data ?? []) as AuditLogEntry[],
                [auditData]
        )

        const onDelete = useCallback(
                async (id: number) => {
                        await deleteOrganizer({ path: { id } })
                        await qc.invalidateQueries({ queryKey: ['organizers-admin'] })
                        await qc.invalidateQueries({ queryKey: ['organizers'] })
                },
                [qc]
        )

        const organizerColumns: ColumnDef<OrganizerWithInvite>[] = useMemo(
                () => [
                        {
                                accessorKey: 'name',
                                header: ({ column }) => (
                                        <DataTableColumnHeader column={column} title="Name" />
                                ),
                                cell: ({ row }) => (
                                        <div className="max-w-[240px] space-y-1">
                                                <div className="font-medium text-sm">{row.original.name}</div>
                                                {row.original.email && (
                                                        <div className="text-xs text-muted-foreground">{row.original.email}</div>
                                                )}
                                        </div>
                                ),
                                size: 240
                        },
                        {
                                accessorKey: 'invite_status',
                                header: ({ column }) => (
                                        <DataTableColumnHeader column={column} title="Status" />
                                ),
                                cell: ({ row }) => {
                                        const status = row.original.invite_status
                                        const statusColors: Record<typeof status, string> = {
                                                PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                                                EXPIRED: 'bg-red-50 text-red-700 border border-red-200',
                                                COMPLETED: 'bg-green-50 text-green-700 border border-green-200'
                                        }
                                        const statusText: Record<typeof status, string> = {
                                                PENDING: 'Ausstehend',
                                                EXPIRED: 'Abgelaufen',
                                                COMPLETED: 'Aktiv'
                                        }
                                        return (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                                                        {statusText[status]}
                                                </span>
                                        )
                                },
                                filterFn: (row, _id, value: string[]) => {
                                        if (!value?.length) return true
                                        return value.includes(row.original.invite_status)
                                },
                                size: 160
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
                                size: 160
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
                                                                                                Bist du sicher, dass du "{organizer.name}" löschen möchtest?
                                                                                                Diese Aktion kann nicht rückgängig gemacht werden.
                                                                                        </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                                                                        <AlertDialogAction onClick={() => onDelete(organizer.id)}>
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
                        { label: 'Aktiv', value: 'COMPLETED' }
                ],
                []
        )

        const auditColumns: ColumnDef<AuditLogEntry>[] = useMemo(
                () => [
                        {
                                accessorKey: 'at',
                                header: ({ column }) => (
                                        <DataTableColumnHeader column={column} title="Zeitpunkt" />
                                ),
                                cell: ({ row }) => (
                                        <div className="text-sm">{format(new Date(row.original.at), 'dd.MM.yyyy HH:mm')}</div>
                                ),
                                size: 160
                        },
                        {
                                accessorKey: 'type',
                                header: ({ column }) => (
                                        <DataTableColumnHeader column={column} title="Aktion" />
                                ),
                                cell: ({ row }) => (
                                        <Badge variant="outline" className="font-mono text-xs">
                                                {row.original.type}
                                        </Badge>
                                ),
                                size: 120
                        },
                        {
                                accessorKey: 'organizer_id',
                                header: ({ column }) => (
                                        <DataTableColumnHeader column={column} title="Verein" />
                                ),
                                cell: ({ row }) => row.original.organizer_id,
                                size: 100
                        },
                        {
                                accessorKey: 'event_id',
                                header: ({ column }) => (
                                        <DataTableColumnHeader column={column} title="Event" />
                                ),
                                cell: ({ row }) => (
                                        <div className="flex items-center gap-1">
                                                {row.original.event_id}
                                                <Link
                                                        href={`/events/${row.original.event_id}`}
                                                        className="text-muted-foreground hover:text-foreground"
                                                >
                                                        <ChevronRight className="h-3 w-3" />
                                                </Link>
                                        </div>
                                ),
                                size: 120
                        },
                        {
                                accessorKey: 'note',
                                header: ({ column }) => (
                                        <DataTableColumnHeader column={column} title="Notiz" />
                                ),
                                cell: ({ row }) => (
                                        <div className="max-w-[320px] text-sm text-muted-foreground">
                                                {row.original.note ?? '—'}
                                        </div>
                                )
                        }
                ],
                []
        )

        if (!isAdmin && !meLoading) {
                return (
                        <div className="flex flex-col min-h-screen">
                                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                                        <SidebarTrigger className="-ml-1" />
                                        <h1 className="text-lg font-semibold">Admin-Bereich</h1>
                                </header>
                                <div className="flex-1 flex items-center justify-center p-8">
                                        <Card className="max-w-md w-full">
                                                <CardHeader>
                                                        <CardTitle>Keine Berechtigung</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                        <p className="text-sm text-muted-foreground">
                                                                Dieser Bereich ist nur für Administrator:innen verfügbar.
                                                        </p>
                                                </CardContent>
                                        </Card>
                                </div>
                        </div>
                )
        }

        return (
                <div className="flex flex-col min-h-screen">
                        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                                <SidebarTrigger className="-ml-1" />
                                <div className="flex items-center gap-2">
                                        <h1 className="text-lg font-semibold">Admin-Bereich</h1>
                                </div>
                        </header>

                        <div className="flex-1 p-4 md:p-8 space-y-8 pt-6">
                                <Card>
                                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                        <CardTitle>Vereine verwalten</CardTitle>
                                                        <p className="text-sm text-muted-foreground">
                                                                Lade neue Vereine ein, aktualisiere Informationen oder entferne Zugänge.
                                                        </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                        <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-2"
                                                                onClick={() => {
                                                                        refetch()
                                                                        refetchAudit()
                                                                }}
                                                        >
                                                                <RefreshCw className="h-4 w-4" /> Aktualisieren
                                                        </Button>
                                                        <CreateOrganizerDialog onSuccess={refetch} />
                                                </div>
                                        </CardHeader>
                                        <CardContent>
                                                <DataTable
                                                        columns={organizerColumns}
                                                        data={organizers}
                                                        isLoading={isLoading}
                                                        error={error instanceof Error ? error.message : undefined}
                                                        filterableColumns={[
                                                                {
                                                                        id: 'invite_status',
                                                                        title: 'Status',
                                                                        options: statusOptions
                                                                }
                                                        ]}
                                                />
                                        </CardContent>
                                </Card>

                                <Card>
                                        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                                <div>
                                                        <CardTitle>Audit-Log</CardTitle>
                                                        <p className="text-sm text-muted-foreground">
                                                                Überblick über die letzten Änderungen an Events und Vereinen.
                                                        </p>
                                                </div>
                                                <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex items-center gap-2"
                                                        onClick={() => refetchAudit()}
                                                        disabled={auditLoading}
                                                >
                                                        <RefreshCw className="h-4 w-4" /> Aktualisieren
                                                </Button>
                                        </CardHeader>
                                        <CardContent>
                                                <DataTable
                                                        columns={auditColumns}
                                                        data={auditLogs}
                                                        isLoading={auditLoading}
                                                        emptyMessage="Keine Audit-Einträge vorhanden"
                                                />
                                        </CardContent>
                                </Card>
                        </div>
                </div>
        )
}
