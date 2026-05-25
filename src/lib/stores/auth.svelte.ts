import { browser } from "$app/environment";
import { login as apiLogin, me as apiMe, logout as apiLogout } from "$lib/api/auth";

const TOKEN_KEY = "ant.token";
const USER_KEY = "ant.user";

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  handle: string;
}

function readStoredUser(): StoredUser | null {
  if (!browser) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

class AuthStore {
  token = $state(browser ? localStorage.getItem(TOKEN_KEY) ?? "" : "");
  user = $state<StoredUser | null>(readStoredUser());
  loginError = $state<string | null>(null);
  loginPending = $state(false);

  get handle(): string {
    return this.user?.handle ?? "@you";
  }

  get isAuthenticated(): boolean {
    return this.token.length > 0 && this.user !== null;
  }

  /** POST /api/auth/login + persist token + user on success. */
  async login(email: string, password: string, license: string): Promise<void> {
    this.loginError = null;
    this.loginPending = true;
    try {
      const result = await apiLogin({ email, password, license });
      this.persistToken(result.token);
      this.persistUser(result.user);
    } catch (e) {
      this.loginError = e instanceof Error ? e.message : "login failed";
      throw e;
    } finally {
      this.loginPending = false;
    }
  }

  /**
   * Verify the current token against /api/auth/me on app startup.
   * If the token is invalid (server kickstart wiped it pre-O1, or it
   * expired), clear the local store + return false so the caller can
   * route to /login.
   *
   * After @antchatdev's O1 SQLite-projection fix (ant@f43b6fb), tokens
   * survive server kickstarts — so a 401 here means the token is genuinely
   * expired or invalid, not just a server-restart artifact.
   */
  async verify(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const result = await apiMe(this.token);
      this.persistUser(result.user);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  /** POST /api/auth/logout + clear local state. */
  async logout(): Promise<void> {
    if (this.token) {
      await apiLogout(this.token);
    }
    this.clear();
  }

  /** Disconnect — clear token + user without server call. */
  clear(): void {
    this.token = "";
    this.user = null;
    if (browser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /** Token-only room links still exist in the Windows client. Keep that
   * path usable until the full login flow replaces it everywhere. */
  setToken(token: string): void {
    this.persistToken(token);
  }

  /** Pair token-only room links with a local display handle so the existing
   * `isAuthenticated` guard and message composer can proceed. */
  setHandle(handle: string): void {
    const normalized = handle.trim() || "@you";
    this.persistUser({
      id: normalized,
      email: "",
      displayName: normalized,
      handle: normalized,
    });
  }

  private persistToken(token: string): void {
    this.token = token;
    if (browser) localStorage.setItem(TOKEN_KEY, token);
  }

  private persistUser(user: StoredUser): void {
    this.user = user;
    if (browser) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export const auth = new AuthStore();
