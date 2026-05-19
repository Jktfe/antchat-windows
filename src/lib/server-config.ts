import { browser } from "$app/environment";

const DEFAULT_SERVER_URL = "http://localhost:6174";
const STORAGE_KEY = "ant.serverUrl";

export function getServerUrl(): string {
  if (browser) {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SERVER_URL;
  }
  return DEFAULT_SERVER_URL;
}

export function setServerUrl(url: string): void {
  if (browser) {
    localStorage.setItem(STORAGE_KEY, url);
  }
}
