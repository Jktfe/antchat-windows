/**
 * notify — system-notification helper.
 *
 * Wraps @tauri-apps/plugin-notification with focus-awareness and a
 * graceful fallback when the API isn't available (e.g. running in the
 * browser preview, not inside the Tauri shell).
 *
 * Caller pattern:
 *   await ensureNotificationPermission();
 *   void notifyIfBackgrounded({ title, body, roomId });
 *
 * `notifyIfBackgrounded` only fires when the window is unfocused — so
 * we don't double-ping the user with both an in-app message and a
 * system banner. Pass `force: true` to fire regardless.
 */

let permissionCached: "granted" | "denied" | "default" | "unknown" = "unknown";

async function getPlugin() {
  try {
    return await import("@tauri-apps/plugin-notification");
  } catch {
    return null;
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionCached === "granted") return true;
  if (permissionCached === "denied") return false;
  const mod = await getPlugin();
  if (!mod) return false;
  try {
    const alreadyGranted = await mod.isPermissionGranted();
    if (alreadyGranted) {
      permissionCached = "granted";
      return true;
    }
    const result = await mod.requestPermission();
    permissionCached = result as typeof permissionCached;
    return result === "granted";
  } catch {
    permissionCached = "denied";
    return false;
  }
}

export interface NotifyOptions {
  title: string;
  body: string;
  /** Force the notification even when the window is focused. */
  force?: boolean;
}

function windowIsFocused(): boolean {
  if (typeof document === "undefined") return true;
  return document.hasFocus();
}

export async function notifyIfBackgrounded(opts: NotifyOptions): Promise<void> {
  if (!opts.force && windowIsFocused()) return;
  const granted = await ensureNotificationPermission();
  if (!granted) return;
  const mod = await getPlugin();
  if (!mod) return;
  try {
    await mod.sendNotification({ title: opts.title, body: opts.body });
  } catch {
    // Surface no error — notifications are best-effort UX.
  }
}
