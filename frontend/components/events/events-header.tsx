'use client'

import { Grid3X3, List, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AnimateIcon } from '../animate-ui/icons/icon'
import { RefreshCw } from '../animate-ui/icons/refresh-cw'

type ViewMode = 'table' | 'calendar'

interface EventsHeaderProps {
	readonly viewMode: ViewMode
	readonly onViewModeChange: (mode: ViewMode) => void
	readonly onRefresh: () => void
	readonly canCreate: boolean
}

export function EventsHeader({
	viewMode,
	onViewModeChange,
	onRefresh,
	canCreate
}: EventsHeaderProps) {
	return (
		<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Events</h2>
				<p className="text-muted-foreground mt-1">
					Verwalte und organisiere Campus-Events mit erweiterten Filtern
				</p>
			</div>
			<div className="flex gap-2 items-center">
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
					<ToggleGroupItem value="table" aria-label="Tabellenansicht">
						<List className="h-4 w-4" />
					</ToggleGroupItem>
					<ToggleGroupItem value="calendar" aria-label="Kalenderansicht">
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
