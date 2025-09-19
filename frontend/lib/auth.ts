export type LoginPayload = { email: string; password: string };
export type InitAccountPayload = { token: string; email: string; password: string };
export type ChangePasswordPayload = { current_password: string; new_password: string };

export async function login(payload: LoginPayload) {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const msg = await safeError(res);
    throw new Error(msg || 'Login failed');
  }
  return res.json();
}

export async function initAccount(payload: InitAccountPayload) {
  const res = await fetch('/api/v1/auth/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const msg = await safeError(res);
    throw new Error(msg || 'Initialization failed');
  }
  return res.json();
}

export async function me() {
  const res = await fetch('/api/v1/auth/me', { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function logout() {
  const res = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Logout failed');
}

export async function changePassword(payload: ChangePasswordPayload) {
  const res = await fetch('/api/v1/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const msg = await safeError(res);
    throw new Error(msg || 'Change password failed');
  }
}

async function safeError(res: Response): Promise<string | undefined> {
  try {
    const data = await res.json();
    return (data && data.message) || undefined;
  } catch {
    return undefined;
  }
}

