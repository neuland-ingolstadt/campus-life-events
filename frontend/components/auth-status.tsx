'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logout, me } from '@/lib/auth'

export function AuthStatus() {
	const router = useRouter()
	const { data: user, refetch } = useQuery({
		queryKey: ['auth', 'me'],
		queryFn: me
	})

	async function onLogout() {
		await logout()
		await refetch()
		router.push('/login')
	}

	if (!user) {
		return (
			<div className="flex items-center justify-between px-4 py-2">
				<span className="text-sm text-muted-foreground">Nicht angemeldet</span>
				<Button
					size="sm"
					variant="outline"
					onClick={() => router.push('/login')}
				>
					Anmelden
				</Button>
			</div>
		)
	}

	return (
		<div className="flex items-center justify-between px-4 py-2">
			<span className="text-sm">{user.name}</span>
			<Button size="sm" variant="outline" onClick={onLogout}>
				Abmelden
			</Button>
		</div>
	)
}
