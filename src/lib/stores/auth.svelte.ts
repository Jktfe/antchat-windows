import { browser } from "$app/environment";

const TOKEN_KEY = "ant.token";
const HANDLE_KEY = "ant.handle";

class AuthStore {
  token = $state(browser ? localStorage.getItem(TOKEN_KEY) ?? "" : "");
  handle = $state(browser ? localStorage.getItem(HANDLE_KEY) ?? "@you" : "@you");

  setToken(token: string) {
    this.token = token;
    if (browser) localStorage.setItem(TOKEN_KEY, token);
  }

  setHandle(handle: string) {
    this.handle = handle;
    if (browser) localStorage.setItem(HANDLE_KEY, handle);
  }

  /** Disconnect — clear the stored token + handle. */
  clear() {
    this.token = "";
    this.handle = "@you";
    if (browser) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(HANDLE_KEY);
    }
  }

  get isAuthenticated() {
    return this.token.length > 0;
  }
}

export const auth = new AuthStore();
