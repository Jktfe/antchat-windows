import type { ChatMessage } from "$shared/api-types";
import {
  deleteMessage,
  fetchMessages,
  patchMessage,
  postMessage,
  subscribeToRoom,
} from "$lib/api/messages";

type Status = "idle" | "loading" | "ready" | "error";

class MessagesStore {
  messages = $state<ChatMessage[]>([]);
  status = $state<Status>("idle");
  error = $state<string | null>(null);
  unsub = $state<(() => void) | null>(null);

  async load(roomId: string, token: string): Promise<void> {
    this.status = "loading";
    this.error = null;
    try {
      this.messages = await fetchMessages(roomId, token);
      this.status = "ready";
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.status = "error";
    }
  }

  async send(roomId: string, token: string, body: string, handle: string): Promise<void> {
    const msg = await postMessage(roomId, token, body, handle);
    this.messages = [...this.messages, msg];
  }

  /**
   * Soft-delete a message authored by the caller (#74). Optimistically marks
   * the local copy with deletedAtMs so the tombstone renders immediately;
   * the server's `message_updated` SSE event will reconcile the canonical
   * deletedByHandle.
   */
  async deleteOwn(
    roomId: string,
    messageId: string,
    token: string,
    handle: string,
  ): Promise<void> {
    await deleteMessage(roomId, messageId, token);
    const now = Date.now();
    this.messages = this.messages.map((m) =>
      m.id === messageId
        ? { ...m, deletedAtMs: now, deletedByHandle: handle, body: "" }
        : m,
    );
  }

  /**
   * Edit an existing message's body (#76 native-paid). Returns the
   * updated message so callers can clear edit state on success.
   */
  async editOwn(
    roomId: string,
    messageId: string,
    token: string,
    body: string,
  ): Promise<ChatMessage> {
    const updated = await patchMessage(roomId, messageId, token, body);
    this.messages = this.messages.map((m) => (m.id === updated.id ? updated : m));
    return updated;
  }

  /**
   * Return the caller's most recent editable (non-deleted, non-system)
   * message in the current room, or null when there isn't one.
   * Used by the ↑-in-empty-composer edit-last shortcut.
   */
  lastEditableForHandle(handle: string): ChatMessage | null {
    for (let i = this.messages.length - 1; i >= 0; i -= 1) {
      const m = this.messages[i];
      if (m.authorHandle !== handle) continue;
      if (m.deletedAtMs) continue;
      if (m.kind === "system" || m.kind === "system-break") continue;
      return m;
    }
    return null;
  }

  subscribe(roomId: string, token: string) {
    this.unsub?.();
    this.unsub = subscribeToRoom(roomId, token, (event) => {
      if (event.type === "message_added") {
        const msg = event.payload as ChatMessage;
        if (!this.messages.find((m) => m.id === msg.id)) {
          this.messages = [...this.messages, msg];
        }
      } else if (event.type === "message_updated") {
        // #74/#76 — fold tombstone + edit state in by id.
        const msg = event.payload as ChatMessage;
        const idx = this.messages.findIndex((m) => m.id === msg.id);
        if (idx >= 0) {
          this.messages = this.messages.map((m, i) => (i === idx ? msg : m));
        }
      }
    });
  }

  dispose() {
    this.unsub?.();
    this.unsub = null;
  }
}

export const messagesStore = new MessagesStore();
