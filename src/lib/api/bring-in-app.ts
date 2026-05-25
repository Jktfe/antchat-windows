import type { BringInAppResponse, BringInTarget } from "$shared/api-types";
import { getServerUrl } from "$lib/server-config";

type FetchLike = typeof fetch;

/**
 * Mint a room-context payload and append the server audit row for one
 * external-app launch. The Windows client owns the launch mechanism after
 * this returns.
 */
export async function bringInApp(
  roomId: string,
  token: string,
  target: BringInTarget,
  fetchImpl: FetchLike = fetch,
): Promise<BringInAppResponse> {
  const res = await fetchImpl(`${getServerUrl()}/api/chat-rooms/${roomId}/bring-in-app`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `bring-in-app failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as BringInAppResponse;
}
