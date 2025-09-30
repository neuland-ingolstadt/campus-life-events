import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false })
interface AuthCardProps {
	children: ReactNode
}

export function AuthCard({ children }: AuthCardProps) {
	return (
		<div className="relative flex items-center justify-center p-6 bg-neutral-100 dark:bg-[#010101]">
			{/* Mobile beams background - only visible when AuthLeftSide is hidden */}
			<div className="absolute inset-0 lg:hidden">
				<Beams
					beamWidth={2}
					beamHeight={15}
					beamNumber={12}
					lightColor="#ffffff"
					speed={2}
					noiseIntensity={1.75}
					scale={0.2}
					rotation={30}
				/>
			</div>
			{/* Overlay to make text readable on mobile */}
			<div className="absolute inset-0 lg:hidden bg-black/50"></div>
			<Card className="relative w-full max-w-sm shadow-lg bg-background border-border z-10">
				{children}
			</Card>
		</div>
	)
}
