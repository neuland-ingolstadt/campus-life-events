'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
	AuthCard,
	AuthLayout,
	AuthLeftSide,
	LoginForm
} from '@/components/auth'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
	const router = useRouter()
	const queryClient = useQueryClient()

	return (
		<AuthLayout>
			<AuthLeftSide />
			<AuthCard>
				<CardHeader>
					<CardTitle className="text-center text-xl">
						Willkommen zurück
					</CardTitle>
				</CardHeader>
				<CardContent>
					<LoginForm
						onSuccess={async () => {
							await queryClient.invalidateQueries({
								queryKey: ['auth', 'me'],
								refetchType: 'all'
							})
							router.push('/')
						}}
					/>
				</CardContent>
			</AuthCard>
		</AuthLayout>
	)
}
