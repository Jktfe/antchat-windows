import type {
  ChatMessage,
  ListMessagesResponse,
  PostMessageRequest,
  PostMessageResponse,
  SseEvent,
} from "$shared/api-types";
import { getServerUrl } from "$lib/server-config";

export async function fetchMessages(
  roomId: string,
  token: string,
): Promise<ChatMessage[]> {
  const res = await fetch(`${getServerUrl()}/api/chat-rooms/${roomId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`messages request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as ListMessagesResponse;
  return data.messages ?? [];
}

export async function deleteMessage(
  roomId: string,
  messageId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${getServerUrl()}/api/chat-rooms/${roomId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`delete message failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Edit an existing message's body (#76 native-paid). Returns the
 * server-updated ChatMessage with editedAtMs set.
 */
export async function patchMessage(
  roomId: string,
  messageId: string,
  token: string,
  body: string,
): Promise<ChatMessage> {
  const res = await fetch(
    `${getServerUrl()}/api/chat-rooms/${roomId}/messages/${messageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );
  if (!res.ok) {
    throw new Error(`edit message failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { message: ChatMessage };
  return data.message;
}

export async function postMessage(
  roomId: string,
  token: string,
  body: string,
  authorHandle = "@you",
): Promise<ChatMessage> {
  const payload: PostMessageRequest = { body, authorHandle };
  const res = await fetch(`${getServerUrl()}/api/chat-rooms/${roomId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`post message failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as PostMessageResponse;
  return data.message;
}

export function subscribeToRoom(
  roomId: string,
  token: string,
  onEvent: (event: SseEvent) => void,
): () => void {
  const url = `${getServerUrl()}/api/realtime/${roomId}/events?token=${encodeURIComponent(token)}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as SseEvent;
      onEvent(parsed);
    } catch {
      // ignore malformed events
    }
  };

  eventSource.onerror = () => {
    // Silently reconnect on error — the server will resume from last event ID
  };

  return () => {
    eventSource.close();
  };
}
