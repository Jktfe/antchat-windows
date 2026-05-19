import type { ChatRoom, ListRoomsResponse } from "$shared/api-types";
import { getServerUrl } from "$lib/server-config";

export async function fetchRooms(token: string): Promise<ChatRoom[]> {
  const res = await fetch(`${getServerUrl()}/api/chat-rooms`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`rooms request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as ListRoomsResponse;
  return data.chatRooms ?? [];
}
