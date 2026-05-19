/**
 * shortcuts — single source of truth for the keyboard shortcut table.
 *
 * Both the ? cheatsheet (Cheatsheet.svelte) and the /help page render this
 * list so the two surfaces never drift. When new shortcuts get wired in
 * the native menu bar (src-tauri/src/lib.rs) or in-app, add them here.
 */

export type ShortcutRow = { keys: string; label: string };
export type ShortcutSection = { title: string; rows: ShortcutRow[] };

export const shortcuts: ShortcutSection[] = [
  {
    title: "App",
    rows: [
      { keys: "⌘ ,", label: "Settings" },
      { keys: "⌘ ⇧ A", label: "Toggle window (global)" },
      { keys: "⌘ Q", label: "Quit ANT Chat" },
      { keys: "⌘ W", label: "Close window" },
      { keys: "⌘ H", label: "Hide ANT Chat" },
    ],
  },
  {
    title: "Navigate",
    rows: [
      { keys: "⌘ R", label: "Rooms" },
      { keys: "⌘ K", label: "Command palette" },
      { keys: "⌘ B", label: "Toggle sidebar" },
      { keys: "Esc", label: "Back to rooms list" },
    ],
  },
  {
    title: "Compose",
    rows: [
      { keys: "↩", label: "Send message" },
      { keys: "⇧ ↩", label: "New line" },
      { keys: "↑", label: "Edit your last message" },
      { keys: "Esc", label: "Cancel edit" },
      { keys: "Tab", label: "Move between table cells" },
    ],
  },
  {
    title: "Connect",
    rows: [
      { keys: "⌘ N", label: "New room…" },
      { keys: "⌘ ⇧ C", label: "Connect with token…" },
    ],
  },
  {
    title: "Help",
    rows: [
      { keys: "?", label: "Open the cheatsheet" },
      { keys: "Esc", label: "Close the cheatsheet" },
    ],
  },
];
