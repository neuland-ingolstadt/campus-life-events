'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import NeulandPalm from '@/components/neuland-palm'
import { Card, CardContent } from '@/components/ui/card'

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false })

interface AuthLeftSideProps {
	children?: ReactNode
}

export function AuthLeftSide({ children }: AuthLeftSideProps) {
	const router = useRouter()
	return (
		<div className="relative hidden lg:block">
			<div className="absolute inset-0 bg-black">
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
					className="mx-10 max-w-md cursor-pointer rounded-2xl border-border/50 bg-background/50 p-6 shadow-lg backdrop-blur-sm dark"
					onClick={() => router.push('/')}
				>
					<CardContent className="flex flex-col items-center justify-center p-6 text-center">
						<NeulandPalm className="mb-6 h-20 w-20" color="currentColor" />
						<h1 className="text-4xl font-bold text-primary">
							Campus Life Events
						</h1>
						<p className="mt-4 text-sm font-medium text-foreground/90">
							powered by Neuland Ingolstadt e.V.
						</p>
						{children && <div className="mt-6">{children}</div>}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
