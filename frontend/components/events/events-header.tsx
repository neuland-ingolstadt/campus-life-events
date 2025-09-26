'use client'

import { Grid3X3, List, Plus, UserRound } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AnimateIcon } from '../animate-ui/icons/icon'
import { RefreshCw } from '../animate-ui/icons/refresh-cw'

type ViewMode = 'table' | 'calendar'

interface EventsHeaderProps {
	readonly viewMode: ViewMode
	readonly onViewModeChange: (mode: ViewMode) => void
	readonly onRefresh: () => void
	readonly canCreate: boolean
	readonly canFilterOwn: boolean
	readonly ownFilterActive: boolean
	readonly onOwnFilterChange: (state: boolean) => void
}

export function EventsHeader({
	viewMode,
	onViewModeChange,
	onRefresh,
	canCreate,
	canFilterOwn,
	ownFilterActive,
	onOwnFilterChange
}: EventsHeaderProps) {
	const ownSwitchId = 'events-own-filter-switch'

	return (
		<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Events</h2>
				<p className="text-muted-foreground mt-1">
					Verwalte und organisiere Campus-Events mit erweiterten Filtern
				</p>
			</div>
			<div className="flex gap-2 items-center flex-wrap justify-end">
				{canFilterOwn && (
					<div className="flex items-center gap-2 rounded-md border px-3 py-2">
						<UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
						<Label htmlFor={ownSwitchId} className="text-sm font-medium">
							Meine Events
						</Label>
						<Switch
							id={ownSwitchId}
							checked={ownFilterActive}
							onCheckedChange={onOwnFilterChange}
							aria-label="Nur eigene Events anzeigen"
						/>
					</div>
				)}
				<ToggleGroup
					type="single"
					value={viewMode}
					onValueChange={(value) => {
						if (value === 'table' || value === 'calendar') {
							onViewModeChange(value)
						}
					}}
					className="border rounded-md"
				>
					<ToggleGroupItem
						value="table"
						aria-label="Tabellenansicht"
						className="cursor-pointer"
					>
						<List className="h-4 w-4" />
					</ToggleGroupItem>
					<ToggleGroupItem
						value="calendar"
						aria-label="Kalenderansicht"
						className="cursor-pointer"
					>
						<Grid3X3 className="h-4 w-4" />
					</ToggleGroupItem>
				</ToggleGroup>
				<AnimateIcon animateOnHover animateOnTap>
					<Button
						variant="outline"
						size="sm"
						onClick={onRefresh}
						className="flex items-center gap-2"
					>
						<RefreshCw className="h-4 w-4" />
						Aktualisieren
					</Button>
				</AnimateIcon>
				{canCreate && (
					<Link href="/events/new">
						<Button size="sm" className="flex items-center gap-2">
							<Plus className="h-4 w-4" />
							Neues Event
						</Button>
					</Link>
				)}
			</div>
		</div>
	)
}
