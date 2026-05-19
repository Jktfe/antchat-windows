/**
 * menuActions — tiny event bus for menu-emitted actions.
 *
 * The native menu bar fires action ids like `command-palette`, `new-room`,
 * `connect`, `toggle-sidebar`. Pages that want to react subscribe here
 * rather than coupling directly to the Tauri event API; this keeps the
 * Tauri ↔ Svelte boundary in one place (+layout.svelte) and means the
 * same bus works for in-app shortcuts later.
 */

export type MenuActionId =
  | "command-palette"
  | "new-room"
  | "connect"
  | "toggle-sidebar"
  | "about"
  | string;

type Listener = (id: MenuActionId) => void;

class MenuActionBus {
  #listeners = new Set<Listener>();

  on(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  fire(id: MenuActionId): void {
    for (const listener of this.#listeners) {
      try {
        listener(id);
      } catch (err) {
        console.error("[menuActions] listener threw for", id, err);
      }
    }
  }
}

export const menuActions = new MenuActionBus();
