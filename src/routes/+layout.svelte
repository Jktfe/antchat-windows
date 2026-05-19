<script lang="ts">
  /**
   * Root layout — wires global Tauri menu events + the `?` cheatsheet.
   *
   * The native macOS menu bar (configured in src-tauri/src/lib.rs) emits
   * two event channels:
   *   `nav`    → string path, route the window there.
   *   `action` → string action id; pages or stores can subscribe to it.
   *
   * Navigation is handled here so menu items always work, no matter which
   * route is active. Actions are forwarded to a small in-memory bus so any
   * page that wants to react (e.g. command palette, new-room modal) can
   * subscribe without coupling to the menu.
   *
   * Pressing `?` outside an input/textarea opens the keyboard cheatsheet,
   * so a new user can discover the shortcut set without scanning the menu
   * bar. Escape (or clicking the scrim) closes it.
   */
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { auth } from "$lib/stores/auth.svelte";
  import { menuActions } from "$lib/stores/menuActions.svelte";
  import { ensureNotificationPermission } from "$lib/notify";
  import Cheatsheet from "$lib/components/Cheatsheet.svelte";
  import CommandPalette from "$lib/components/CommandPalette.svelte";

  let { children } = $props();
  let cheatsheetOpen = $state(false);
  let paletteOpen = $state(false);

  // Proactively prompt for the macOS notification permission the first time
  // the app launches with an authenticated session. Without this the very
  // first new-message banner triggers the system prompt, which means the
  // message banner itself gets eaten — the user only sees them from message
  // two onwards. Calling here means the prompt lands on first room load and
  // is ready when SSE deltas start arriving.
  let permissionRequested = $state(false);
  $effect(() => {
    if (auth.isAuthenticated && !permissionRequested) {
      permissionRequested = true;
      void ensureNotificationPermission();
    }
  });

  // The current /plans/[planId] route exposes its id so the palette can
  // offer "open plan overview — <id>" as a first-class command.
  const recentPlanId = $derived(
    page.route.id === "/plans/[planId]" ? page.params.planId ?? null : null,
  );

  // `?` should bring up the cheatsheet, but not while the user is typing
  // in an input or textarea — that's where they meant to type the literal
  // character.
  function isEditing(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "?" || e.metaKey || e.ctrlKey) return;
    if (isEditing(e.target)) return;
    e.preventDefault();
    cheatsheetOpen = !cheatsheetOpen;
  }

  onMount(() => {
    let unlistenNav: UnlistenFn | undefined;
    let unlistenAction: UnlistenFn | undefined;

    void (async () => {
      try {
        unlistenNav = await listen<string>("nav", (event) => {
          if (typeof event.payload === "string" && event.payload.startsWith("/")) {
            void goto(event.payload);
          }
        });
        unlistenAction = await listen<string>("action", (event) => {
          if (typeof event.payload === "string") {
            menuActions.fire(event.payload);
          }
        });
      } catch {
        // Outside Tauri (e.g. `npm run preview` in a regular browser) the
        // event API isn't present — that's fine, the listeners are a no-op.
      }
    })();

    return () => {
      unlistenNav?.();
      unlistenAction?.();
    };
  });

  // Menu actions: command-palette opens the real palette; about routes
  // to the cheatsheet for now (real about dialog can land later).
  $effect(() => {
    return menuActions.on((id) => {
      if (id === "command-palette") paletteOpen = true;
      if (id === "about") cheatsheetOpen = true;
    });
  });
</script>

<svelte:window onkeydown={onKeyDown} />

{@render children?.()}

<CommandPalette
  open={paletteOpen}
  recentPlanId={recentPlanId}
  onOpenCheatsheet={() => {
    paletteOpen = false;
    cheatsheetOpen = true;
  }}
  onClose={() => (paletteOpen = false)}
/>

<Cheatsheet open={cheatsheetOpen} onClose={() => (cheatsheetOpen = false)} />

<style>
  /*
   * Global design tokens. Mirrors the v4 web app.css palette names so
   * surfaces feel like one product. New colour decisions land here first,
   * not as inline hex in components.
   */
  :global(:root) {
    --ant-accent: #2563eb;        /* primary action / focus rings / agent accent */
    --ant-accent-strong: #1d4ed8; /* hover/active states for accent surfaces */
    --ant-ok: #16a34a;            /* success / connected / progress fill */
    --ant-warn: #d97706;          /* edit mode / planned status */
    --ant-danger: #dc2626;        /* destructive actions / errors / blocked */
  }

  /*
   * Global a11y baseline (v4 mirror of server 18ffdc8 a11y push).
   * - :focus-visible outlines are explicit so keyboard nav is discoverable
   *   on every interactive element. Mouse focus stays unstyled to avoid
   *   visual noise during click interactions.
   * - aria-current="page" on nav links gets a subtle accent so users
   *   know where they are without re-reading the URL.
   */
  :global(:focus-visible) {
    outline: 2px solid var(--ant-accent);
    outline-offset: 2px;
    border-radius: 4px;
  }
  :global(button:focus-visible),
  :global(a:focus-visible) {
    outline: 2px solid var(--ant-accent);
    outline-offset: 2px;
  }
  :global([aria-current="page"]) {
    font-weight: 700;
  }
</style>
