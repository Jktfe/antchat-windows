export interface ParsedDeepLink {
  roomId: string;
  /** Pairing token — the short-lived consumable token. */
  token: string;
  /** Server URL, e.g. https://mac.kingfisher-interval.ts.net:6174. */
  serverUrl?: string;
  /**
   * API key embedded in the QR. When present, this is the credential the
   * client should set as its bearer for room API calls; the pairing `token`
   * is the consumable that records the device pairing.
   */
  apiKey?: string;
}

/**
 * Parse an ant:// deep-link.
 *
 * Canonical server-emitted format (see /api/pairing-tokens/qr):
 *   `ant://connect?url=<server>&key=<api_key>&room=<roomId>&token=<pairing>`
 *
 * Backward-compatible flat format:
 *   `ant://<roomId>?token=<pairing>&server=<server>`
 *
 * The canonical form is detected by the literal `connect` host plus a
 * `room` query parameter; the flat form falls through.
 */
export function parseAntDeepLink(url: string): ParsedDeepLink | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "ant:") return null;

    // Canonical: ant://connect?url=&key=&room=&token=
    if (u.hostname === "connect" && u.searchParams.has("room")) {
      const roomId = u.searchParams.get("room") || "";
      const token = u.searchParams.get("token") || "";
      const serverUrl = u.searchParams.get("url") || undefined;
      const apiKey = u.searchParams.get("key") || undefined;
      if (!roomId || !token) return null;
      return { roomId, token, serverUrl, apiKey };
    }

    // Flat: ant://<roomId>?token=&server=
    const roomId = u.hostname || u.pathname.replace(/^\//, "");
    const token = u.searchParams.get("token") || "";
    const serverUrl = u.searchParams.get("server") || undefined;
    if (!roomId || !token) return null;
    return { roomId, token, serverUrl };
  } catch {
    return null;
  }
}
