'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { listLocationSuggestions } from '@/client'
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { isValidRoom } from '@/lib/campus-room'
import { cn } from '@/lib/utils'

interface LocationComboboxProps
	extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
	value?: string
	onChange?: (value: string) => void
}

export function LocationCombobox({
	value = '',
	onChange,
	className,
	onFocus,
	onBlur,
	...props
}: LocationComboboxProps) {
	const [open, setOpen] = useState(false)

	const { data } = useQuery({
		queryKey: ['events', 'location-suggestions'],
		queryFn: async () => {
			const response = await listLocationSuggestions({ throwOnError: true })
			return response.data
		}
	})
	const suggestions = data?.items ?? []

	const query = value.trim().toLowerCase()

	const filtered = useMemo(() => {
		if (!query) {
			return []
		}
		return suggestions.filter((item) => item.toLowerCase().includes(query))
	}, [suggestions, query])

	const linkableRoom = Boolean(value && isValidRoom(value))
	const showSuggestions = open && query.length > 0 && filtered.length > 0

	return (
		<Popover
			open={showSuggestions}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					setOpen(false)
				}
			}}
		>
			<PopoverAnchor asChild>
				<div className="relative">
					<Input
						type="text"
						autoComplete="off"
						placeholder="z.B. G215, Hörsaal A, Online"
						className={cn(linkableRoom ? 'pr-9' : undefined, className)}
						value={value}
						onChange={(event) => {
							const nextValue = event.target.value
							onChange?.(nextValue)
							setOpen(nextValue.trim().length > 0)
						}}
						onFocus={onFocus}
						onBlur={onBlur}
						{...props}
					/>
					{linkableRoom ? (
						<span
							className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
							aria-hidden
						>
							<CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
						</span>
					) : null}
				</div>
			</PopoverAnchor>
			<PopoverContent
				className="w-(--radix-popover-trigger-width) p-0"
				align="start"
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<Command shouldFilter={false}>
					<CommandList>
						<CommandGroup>
							{filtered.map((location) => (
								<CommandItem
									key={location}
									value={location}
									onMouseDown={(event) => event.preventDefault()}
									onSelect={() => {
										onChange?.(location)
										setOpen(false)
									}}
								>
									{location}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
