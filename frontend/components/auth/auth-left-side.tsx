import dynamic from 'next/dynamic'
import router from 'next/router'
import type { ReactNode } from 'react'
import NeulandPalm from '@/components/neuland-palm'
import { Card, CardContent } from '@/components/ui/card'

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false })
interface AuthLeftSideProps {
	children?: ReactNode
}

export function AuthLeftSide({ children }: AuthLeftSideProps) {
	return (
		<div className="hidden lg:block relative">
			{/* Full screen Beams background */}
			<div className="absolute inset-0">
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
			<div className="absolute inset-0 flex items-center justify-center rounded-2xl">
				<Card
					className="max-w-md mx-10 shadow-lg bg-background/50 backdrop-blur-sm border-border/50 rounded-2xl p-6 dark cursor-pointer"
					onClick={() => router.push('/')}
				>
					<CardContent className="p-6 text-center flex flex-col items-center justify-center">
						<NeulandPalm className="h-20 w-20 mb-6" color="currentColor" />
						<h1 className="text-4xl font-bold text-primary">
							Campus Life Events
						</h1>
						<p className="mt-4 text-sm text-foreground/90 font-medium">
							powered by Neuland Ingolstadt e.V.
						</p>
						{children && <div className="mt-6">{children}</div>}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
