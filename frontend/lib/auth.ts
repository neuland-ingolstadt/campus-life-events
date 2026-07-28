import {
	changePassword as changePasswordRequest,
	initAccount as initAccountRequest,
	login as loginRequest,
	logout as logoutRequest,
	lookupSetupToken as lookupSetupTokenRequest,
	me as meRequest
} from '@/client'
import type {
	AuthUserResponse,
	SetupTokenInfoResponse
} from '@/client/types.gen'

export type LoginPayload = { email: string; password: string }
export type InitAccountPayload = {
	token: string
	password: string
}
export type ChangePasswordPayload = {
	current_password: string
	new_password: string
}

export async function login(payload: LoginPayload) {
	const response = await loginRequest({ body: payload })
	return responseData(response, 'Login failed')
}

export async function initAccount(payload: InitAccountPayload) {
	const response = await initAccountRequest({ body: payload })
	return responseData(response, 'Initialization failed')
}

export async function lookupSetupToken(
	token: string
): Promise<SetupTokenInfoResponse> {
	const response = await lookupSetupTokenRequest({ body: { token } })
	return responseData(response, 'Invalid setup token')
}

export async function me(): Promise<AuthUserResponse | null> {
	const response = await meRequest()
	if (response.response?.status === 401) {
		return null
	}
	return responseData(response, 'Failed to fetch user')
}

export async function logout() {
	const response = await logoutRequest()
	responseData(response, 'Logout failed')
}

export async function changePassword(payload: ChangePasswordPayload) {
	const response = await changePasswordRequest({ body: payload })
	responseData(response, 'Change password failed')
}

function responseData<T>(
	response: { data?: T; error?: unknown },
	fallback: string
): T {
	if (response.error !== undefined) {
		throw new Error(errorMessage(response.error, fallback))
	}
	if (response.data === undefined) {
		throw new Error(fallback)
	}
	return response.data
}

function errorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof error.message === 'string'
	) {
		return error.message
	}
	return fallback
}
