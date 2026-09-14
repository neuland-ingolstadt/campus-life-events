'use client'

import { XIcon } from 'lucide-react'
import * as React from 'react'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle
} from '@/components/ui/drawer'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

type ResponsiveSheetContextValue = {
	readonly isMobile: boolean
}

const ResponsiveSheetContext =
	React.createContext<ResponsiveSheetContextValue | null>(null)

function useResponsiveSheet() {
	const context = React.useContext(ResponsiveSheetContext)
	if (!context) {
		throw new Error(
			'ResponsiveSheet components must be used within ResponsiveSheet'
		)
	}
	return context
}

function ResponsiveSheet({
	open,
	onOpenChange,
	children,
	handleOnly = false
}: {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly children: React.ReactNode
	readonly handleOnly?: boolean
}) {
	const isMobile = useIsMobile()

	return (
		<ResponsiveSheetContext.Provider value={{ isMobile }}>
			{isMobile ? (
				<Drawer
					open={open}
					onOpenChange={onOpenChange}
					shouldScaleBackground={false}
					handleOnly={handleOnly}
				>
					{children}
				</Drawer>
			) : (
				<Sheet open={open} onOpenChange={onOpenChange}>
					{children}
				</Sheet>
			)}
		</ResponsiveSheetContext.Provider>
	)
}

function ResponsiveSheetContent({
	className,
	children,
	side = 'right',
	onOpenAutoFocus,
	...props
}: React.ComponentProps<typeof SheetContent>) {
	const { isMobile } = useResponsiveSheet()

	if (isMobile) {
		return (
			<DrawerContent
				className={cn(
					'mt-0 flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl p-0 data-[vaul-drawer-direction=bottom]:max-h-[92dvh]',
					className
				)}
				{...props}
			>
				{children}
				<DrawerClose className="ring-offset-background focus:ring-ring absolute top-3 right-4 z-10 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
					<XIcon className="size-4" />
					<span className="sr-only">Schließen</span>
				</DrawerClose>
			</DrawerContent>
		)
	}

	return (
		<SheetContent
			side={side}
			className={className}
			onOpenAutoFocus={onOpenAutoFocus}
			{...props}
		>
			{children}
		</SheetContent>
	)
}

function ResponsiveSheetHeader({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const { isMobile } = useResponsiveSheet()
	const Comp = isMobile ? DrawerHeader : SheetHeader

	return (
		<Comp
			className={cn(isMobile && 'gap-1.5 p-4 text-left md:text-left', className)}
			{...props}
		/>
	)
}

function ResponsiveSheetFooter({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const { isMobile } = useResponsiveSheet()
	const Comp = isMobile ? DrawerFooter : SheetFooter

	return <Comp className={className} {...props} />
}

function ResponsiveSheetTitle({
	className,
	...props
}: React.ComponentProps<typeof SheetTitle>) {
	const { isMobile } = useResponsiveSheet()
	const Comp = isMobile ? DrawerTitle : SheetTitle

	return <Comp className={className} {...props} />
}

function ResponsiveSheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetDescription>) {
	const { isMobile } = useResponsiveSheet()
	const Comp = isMobile ? DrawerDescription : SheetDescription

	return <Comp className={className} {...props} />
}

function ResponsiveSheetClose({
	...props
}: React.ComponentProps<typeof SheetClose>) {
	const { isMobile } = useResponsiveSheet()
	const Comp = isMobile ? DrawerClose : SheetClose

	return <Comp {...props} />
}

export {
	ResponsiveSheet,
	ResponsiveSheetClose,
	ResponsiveSheetContent,
	ResponsiveSheetDescription,
	ResponsiveSheetFooter,
	ResponsiveSheetHeader,
	ResponsiveSheetTitle
}
