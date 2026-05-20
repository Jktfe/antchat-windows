import { getServerUrl } from "$lib/server-config";

export interface LoginResponse {
  token: string;
  user: { id: string; email: string; displayName: string; handle: string };
  expiresAt: number;
}

export interface MeResponse {
  user: { id: string; email: string; displayName: string; handle: string };
  expiresAt: number;
}

/**
 * POST /api/auth/login — exchanges email + password + dev licence code for
 * a 7-day Bearer token. Mirrors the Mac antchat login flow exactly so the
 * same dev-users.json + dev-licences.json allowlist applies to both clients.
 *
 * License code format: `NEW-MODEL-ANT-DEV-<email>` (literal prefix).
 *
 * Errors:
 *   400 missing field    — bad request shape
 *   401 invalid creds    — bad password OR unknown email (intentionally same shape)
 *   403 licence mismatch — licence code doesn't match the email
 *   503 password not set — user marker says password rotation pending
 */
export async function login(input: {
  email: string;
  password: string;
  license: string;
}): Promise<LoginResponse> {
  const res = await fetch(`${getServerUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `login failed: ${res.status}`);
  }
  return (await res.json()) as LoginResponse;
}

/** GET /api/auth/me — verify Bearer token + return canonical user record. */
export async function me(token: string): Promise<MeResponse> {
  const res = await fetch(`${getServerUrl()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `token invalid: ${res.status}`);
  }
  return (await res.json()) as MeResponse;
}

/** POST /api/auth/logout — revokes the Bearer token server-side. */
export async function logout(token: string): Promise<void> {
  await fetch(`${getServerUrl()}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {
    /* best-effort; client-side clear runs regardless of network result */
  });
}
