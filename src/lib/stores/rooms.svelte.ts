import type { ChatRoom } from "$shared/api-types";
import { fetchRooms } from "$lib/api/rooms";

type Status = "idle" | "loading" | "ready" | "error";

class RoomsStore {
  rooms = $state<ChatRoom[]>([]);
  status = $state<Status>("idle");
  error = $state<string | null>(null);

  async load(token: string): Promise<void> {
    this.status = "loading";
    this.error = null;
    try {
      this.rooms = await fetchRooms(token);
      this.status = "ready";
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.status = "error";
    }
  }
}

export const roomsStore = new RoomsStore();
