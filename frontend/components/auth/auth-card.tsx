import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface AuthCardProps {
	children: ReactNode
}

export function AuthCard({ children }: AuthCardProps) {
	return (
		<div className="flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
			<Card className="w-full max-w-sm shadow-lg">{children}</Card>
		</div>
	)
}
