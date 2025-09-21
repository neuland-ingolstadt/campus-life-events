import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import type { AccountType } from '@/client/types.gen'

export type AuthUser = {
	account_id: number
	display_name: string
	account_type: AccountType
	organizer_id?: number | null
}

export async function requireUser(): Promise<AuthUser> {
	const ck = await cookies()
	const cookieHeader = ck.toString()
	const base = process.env.BACKEND_URL || 'http://localhost:8080'
	const res = await fetch(`${base}/api/v1/auth/me`, {
		method: 'GET',
		cache: 'no-store',
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined
	})
	if (res.status === 401) {
		redirect('/login')
	}
	if (!res.ok) {
		redirect('/login')
	}
	return res.json()
}

export async function requireAdmin(): Promise<AuthUser> {
	const user = await requireUser()
	if (user.account_type !== 'ADMIN') {
		redirect('/')
	}
	return user
}
