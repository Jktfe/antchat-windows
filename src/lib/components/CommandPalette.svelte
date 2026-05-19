<script lang="ts">
  /**
   * CommandPalette — ⌘K opens a searchable command list.
   *
   * v1 scope: static nav commands (Rooms, recent plans, Help, Cheatsheet,
   * Connect). The list filters as the user types. Arrow keys move
   * highlight; Enter runs the highlighted command; Esc closes.
   *
   * Triggered from menuActions bus on the `command-palette` id. Holds no
   * state across opens — every fresh open starts empty and focused.
   */
  import { tick } from "svelte";
  import { goto } from "$app/navigation";
  import { roomsStore } from "$lib/stores/rooms.svelte";

  interface Props {
    open: boolean;
    onClose: () => void;
    /** Optional id of the plan the user has been browsing — surfaced first. */
    recentPlanId?: string | null;
    /** Triggered when the user picks "Connect with token". */
    onOpenConnect?: () => void;
    /** Triggered when the user picks "Show keyboard shortcuts". */
    onOpenCheatsheet?: () => void;
  }
  let { open, onClose, recentPlanId, onOpenConnect, onOpenCheatsheet }: Props = $props();

  type Command = {
    id: string;
    label: string;
    hint?: string;
    run: () => void;
  };

  let query = $state("");
  let highlight = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const commands = $derived.by<Command[]>(() => {
    const out: Command[] = [
      { id: "nav.rooms", label: "Open Rooms", hint: "/rooms", run: () => goto("/rooms") },
    ];
    if (recentPlanId) {
      out.push({
        id: "nav.plan",
        label: `Open plan overview — ${recentPlanId}`,
        hint: `/plans/${recentPlanId}`,
        run: () => goto(`/plans/${recentPlanId}`),
      });
    }
    // Surface each room as a navigable command so ⌘K → roomname → Enter
    // jumps you to the room without leaving the keyboard.
    for (const room of roomsStore.rooms) {
      out.push({
        id: `room.${room.id}`,
        label: room.name,
        hint: `/rooms/${room.id}`,
        run: () => goto(`/rooms/${room.id}`),
      });
    }
    if (onOpenConnect) {
      out.push({
        id: "app.connect",
        label: "Connect with token…",
        hint: "Set room token",
        run: () => onOpenConnect(),
      });
    }
    if (onOpenCheatsheet) {
      out.push({
        id: "app.help",
        label: "Show keyboard shortcuts",
        hint: "?",
        run: () => onOpenCheatsheet(),
      });
    }
    return out;
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  });

  $effect(() => {
    if (!open) {
      query = "";
      highlight = 0;
      return;
    }
    void (async () => {
      await tick();
      inputEl?.focus();
    })();
  });

  $effect(() => {
    // Keep highlight inside the filtered range as the user types.
    if (highlight >= filtered.length) highlight = Math.max(0, filtered.length - 1);
  });

  function run(cmd: Command | undefined) {
    if (!cmd) return;
    onClose();
    cmd.run();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight = Math.min(filtered.length - 1, highlight + 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight = Math.max(0, highlight - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[highlight]);
    }
  }
</script>

{#if open}
  <div
    class="cp-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Command palette"
    tabindex="-1"
    onkeydown={onKeyDown}
  >
    <button class="cp-scrim" type="button" aria-label="Close command palette" onclick={onClose}></button>
    <div class="cp-panel">
      <input
        bind:this={inputEl}
        bind:value={query}
        type="text"
        class="cp-input"
        placeholder="Jump to room, plan, or action…"
        autocomplete="off"
        spellcheck="false"
        aria-label="Command palette search"
      />
      <ul class="cp-list" role="listbox">
        {#if filtered.length === 0}
          <li class="cp-empty">No matches.</li>
        {:else}
          {#each filtered as cmd, idx (cmd.id)}
            <li>
              <button
                type="button"
                class="cp-item"
                class:active={idx === highlight}
                role="option"
                aria-selected={idx === highlight}
                onmouseenter={() => (highlight = idx)}
                onclick={() => run(cmd)}
              >
                <span class="cp-label">{cmd.label}</span>
                {#if cmd.hint}
                  <span class="cp-hint">{cmd.hint}</span>
                {/if}
              </button>
            </li>
          {/each}
        {/if}
      </ul>
      <footer class="cp-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>↩</kbd> run</span>
        <span><kbd>Esc</kbd> close</span>
      </footer>
    </div>
  </div>
{/if}

<style>
  .cp-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1100;
    display: grid;
    place-items: start center;
    padding: 8vh 1.5rem 0;
    animation: cp-fade 140ms ease-out both;
  }
  @keyframes cp-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .cp-scrim {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: color-mix(in srgb, currentColor 35%, transparent);
    backdrop-filter: blur(6px);
    cursor: default;
  }
  .cp-panel {
    position: relative;
    z-index: 1;
    width: min(640px, 100%);
    max-height: min(70vh, 640px);
    display: flex;
    flex-direction: column;
    background: var(--cp-bg, #fffbf3);
    color: inherit;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    box-shadow: 0 24px 60px rgb(0 0 0 / 30%);
    overflow: hidden;
    animation: cp-rise 180ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes cp-rise {
    from { opacity: 0; transform: translateY(8px) scale(0.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (prefers-color-scheme: dark) {
    .cp-panel { background: #14160f; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cp-backdrop, .cp-panel { animation: none; }
  }
  .cp-input {
    border: none;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 1rem;
    padding: 0.85rem 1rem;
    outline: none;
  }
  .cp-list {
    list-style: none;
    margin: 0;
    padding: 0.35rem 0;
    overflow: auto;
    flex: 1;
  }
  .cp-empty {
    padding: 1.25rem 1rem;
    opacity: 0.6;
    font-size: 0.85rem;
  }
  .cp-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1rem;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
    font: inherit;
    font-size: 0.9rem;
  }
  .cp-item.active {
    background: color-mix(in srgb, var(--ant-accent) 16%, transparent);
  }
  .cp-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp-hint {
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.75rem;
    opacity: 0.55;
  }
  .cp-footer {
    display: flex;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    font-size: 0.72rem;
    opacity: 0.7;
  }
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    padding: 0.1rem 0.4rem;
    border-radius: 5px;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    background: color-mix(in srgb, currentColor 6%, transparent);
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.7rem;
    font-weight: 600;
    margin-right: 0.25rem;
  }
</style>
