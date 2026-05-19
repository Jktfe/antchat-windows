/**
 * roomActivity — periodically polls /api/chat-rooms/:id/agent-statuses
 * for each visible room and exposes a small per-room snapshot for the
 * room-card badge to render.
 *
 * Pattern matches the web RoomCardActivity (#117 fix + #120) without
 * the SSE subscription — a 30-second poll is plenty for a list view
 * and keeps connection count low. Pages call start(roomIds) when they
 * mount, stop() when they unmount.
 */

import { getServerUrl } from "$lib/server-config";
import { auth } from "$lib/stores/auth.svelte";

export type ActivityState =
  | "active"
  | "working"
  | "thinking"
  | "response-required"
  | "idle"
  | "unknown"
  | string;

export interface RoomActivity {
  activeCount: number;
  lastActivityMs: number | null;
}

interface StatusEntry {
  handle: string;
  status: ActivityState;
  statusAtMs: number | null;
}

const POLL_MS = 30_000;

class RoomActivityStore {
  // Reactive map keyed by roomId. Pages read activity[roomId].
  activity = $state<Record<string, RoomActivity>>({});

  #roomIds: string[] = [];
  #timer: ReturnType<typeof setInterval> | null = null;

  start(roomIds: string[]) {
    this.#roomIds = roomIds;
    void this.#tick();
    if (this.#timer === null) {
      this.#timer = setInterval(() => void this.#tick(), POLL_MS);
    }
  }

  stop() {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }

  async #tick() {
    if (!auth.isAuthenticated || this.#roomIds.length === 0) return;
    const next: Record<string, RoomActivity> = { ...this.activity };
    await Promise.all(
      this.#roomIds.map(async (id) => {
        try {
          const res = await fetch(
            `${getServerUrl()}/api/chat-rooms/${encodeURIComponent(id)}/agent-statuses`,
            { headers: { Authorization: `Bearer ${auth.token}` } },
          );
          if (!res.ok) return;
          const body = (await res.json()) as { statuses: StatusEntry[] };
          const statuses = body.statuses ?? [];
          const activeCount = statuses.filter(
            (s) => s.status === "working" || s.status === "response-required",
          ).length;
          const lastActivityMs = statuses.reduce<number | null>(
            (acc, s) => {
              const at = s.statusAtMs ?? 0;
              return at > (acc ?? 0) ? at : acc;
            },
            null,
          );
          next[id] = { activeCount, lastActivityMs };
        } catch {
          /* soft-fail: keep last known snapshot for this room */
        }
      }),
    );
    this.activity = next;
  }
}

export const roomActivity = new RoomActivityStore();
