<script lang="ts">
  import { onMount, onDestroy, untrack } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { auth } from "$lib/stores/auth.svelte";
  import { roomsStore } from "$lib/stores/rooms.svelte";
  import { roomActivity } from "$lib/stores/roomActivity.svelte";
  import { messagesStore } from "$lib/stores/messages.svelte";
  import { capabilities } from "$lib/stores/capabilities.svelte";
  import MessageRow from "$lib/components/MessageRow.svelte";
  import ChatComposer from "$lib/components/ChatComposer.svelte";
  import BringInAppRow from "$lib/components/BringInAppRow.svelte";
  import { relativeTime } from "$lib/time";
  import { notifyIfBackgrounded } from "$lib/notify";

  const roomId = $derived(page.params.roomId);
  const room = $derived(roomsStore.rooms.find((r) => r.id === roomId));
  const bringInAppAvailable = $derived(
    capabilities.data?.featureFlags?.bring_in_app_ux === true,
  );
  // Per-room participant identity lookup (Fix 5) — feeds MessageRow's
  // accent colour and background style for each sender.
  const memberByHandle = $derived(
    new Map((room?.members ?? []).map((m) => [m.handle, m])),
  );

  let messagesEl = $state<HTMLDivElement | null>(null);
  let showScrollDown = $state(false);
  let sidebarOpen = $state(false);
  // Track the last message we've shown the user / already notified about,
  // so when SSE drops in new messages we only notify for those, not for
  // the whole history that loaded on mount.
  let lastSeenPostOrder = $state(-1);

  onMount(() => {
    void capabilities.load();
    if (auth.isAuthenticated) {
      void roomsStore.load(auth.token);
      if (roomId) {
        void messagesStore.load(roomId, auth.token);
        messagesStore.subscribe(roomId, auth.token);
      }
    }
  });

  // Reuse the same activity poller that /rooms uses so the sidebar
  // mirrors the rooms-list pulse without doubling network load.
  $effect(() => {
    if (roomsStore.status === "ready" && roomsStore.rooms.length > 0) {
      roomActivity.start(roomsStore.rooms.map((r) => r.id));
    }
  });

  function sidebarActivity(id: string): { active: number; label: string | null } {
    const snap = roomActivity.activity[id];
    if (!snap) return { active: 0, label: null };
    if (snap.activeCount > 0) {
      return { active: snap.activeCount, label: `${snap.activeCount} working` };
    }
    return { active: 0, label: null };
  }

  onDestroy(() => {
    messagesStore.dispose();
  });

  $effect(() => {
    if (messagesEl && messagesStore.messages.length && !showScrollDown) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  // Fire system notifications for new messages that arrive while the window
  // isn't focused. Initial load is silenced by seeding lastSeenPostOrder
  // to the highest message on first ready state; subsequent SSE deltas
  // only notify the messages strictly after that high-water mark, and
  // only for messages authored by someone other than the operator.
  $effect(() => {
    const list = messagesStore.messages;
    if (!list.length) return;
    untrack(() => {
      const highest = list[list.length - 1].postOrder;
      if (lastSeenPostOrder === -1) {
        // First ready state — seed and notify nothing.
        lastSeenPostOrder = highest;
        return;
      }
      if (highest <= lastSeenPostOrder) return;
      const fresh = list.filter((m) => m.postOrder > lastSeenPostOrder);
      lastSeenPostOrder = highest;
      const me = auth.handle;
      for (const m of fresh) {
        if (m.authorHandle === me) continue;
        if (m.kind === "system" || m.kind === "system-break") continue;
        const who = m.authorDisplayName || m.authorHandle;
        const where = room?.name ?? "ANT Chat";
        const preview = m.body.length > 140 ? `${m.body.slice(0, 140)}…` : m.body;
        void notifyIfBackgrounded({
          title: `${where} — ${who}`,
          body: preview,
        });
      }
    });
  });

  function onScroll() {
    if (!messagesEl) return;
    const nearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 80;
    showScrollDown = !nearBottom;
  }

  function scrollToBottom() {
    if (!messagesEl) return;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    showScrollDown = false;
  }

  async function sendMessage(text: string) {
    if (!auth.isAuthenticated || !roomId) return;
    await messagesStore.send(roomId, auth.token, text, auth.handle);
    scrollToBottom();
  }

  // ↑-in-empty-composer pulls the operator's last editable message for the
  // #76 native-paid edit mode; submitEdit then calls PATCH instead of POST.
  function lookupLastEditable(): { id: string; body: string } | null {
    if (!auth.isAuthenticated) return null;
    const m = messagesStore.lastEditableForHandle(auth.handle);
    return m ? { id: m.id, body: m.body } : null;
  }

  async function submitEdit(id: string, body: string) {
    if (!auth.isAuthenticated || !roomId) return;
    await messagesStore.editOwn(roomId, id, auth.token, body);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      goto("/rooms");
    }
  }
</script>

<svelte:head>
  <title>{room?.name ? `${room.name} · ANT Chat` : "Room · ANT Chat"}</title>
</svelte:head>

<svelte:window onkeydown={onKeyDown} />

<div class="app" class:sidebar-open={sidebarOpen}>
  <button class="sidebar-toggle" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Toggle rooms">
    {sidebarOpen ? "✕" : "☰"}
  </button>

  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="logo">🐜</span>
      <span class="title">Rooms</span>
      {#if auth.isAuthenticated}
        <span class="status-dot" title="Connected"></span>
      {/if}
    </div>
    <ul class="room-list">
      {#each roomsStore.rooms as r (r.id)}
        <li class:active={r.id === roomId}>
          <a
            href={`/rooms/${r.id}`}
            aria-current={r.id === roomId ? "page" : undefined}
            onclick={() => sidebarOpen = false}
          >
            <div class="room-item">
              <span class="room-name">{r.name}</span>
              <span class="room-time">{relativeTime(r.lastUpdate)}</span>
            </div>
            {#if sidebarActivity(r.id).active > 0}
              {@const sa = sidebarActivity(r.id)}
              <span class="sidebar-activity" title={sa.label ?? ""} aria-label={sa.label ?? ""}>
                <span class="sa-dot" aria-hidden="true"></span>
                {sa.active}
              </span>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  </aside>

  <button class="overlay" onclick={() => sidebarOpen = false} class:visible={sidebarOpen} aria-label="Close rooms" tabindex="-1"></button>

  <div class="chat">
    <header class="chat-header">
      <div class="room-title">
        <span class="name">{room?.name || roomId}</span>
        {#if room?.attentionState}
          <span class="state">{room.attentionState}</span>
        {/if}
      </div>
      <span class="count">{messagesStore.messages.length} messages · {room?.members.length ?? 0} members</span>
    </header>

    {#if roomId && auth.isAuthenticated}
      <BringInAppRow
        {roomId}
        token={auth.token}
        available={bringInAppAvailable}
      />
    {/if}

    <div class="messages" bind:this={messagesEl} onscroll={onScroll}>
      {#if messagesStore.status === "loading"}
        <div class="info">Loading messages...</div>
      {:else if messagesStore.status === "error"}
        <div class="info error">{messagesStore.error}</div>
      {:else if messagesStore.messages.length === 0}
        <div class="info">No messages yet. Say something!</div>
      {:else}
        {#each messagesStore.messages as message (message.id)}
          <MessageRow
            {message}
            member={memberByHandle.get(message.authorHandle)}
            selfHandle={auth.handle}
            onDelete={(id) => {
              if (!roomId) return;
              void messagesStore.deleteOwn(roomId, id, auth.token, auth.handle);
            }}
          />
        {/each}
      {/if}
    </div>

    {#if showScrollDown}
      <button class="scroll-down" onclick={scrollToBottom}>↓ New messages</button>
    {/if}

    <ChatComposer
      onSend={sendMessage}
      onEditLast={lookupLastEditable}
      onEditSubmit={submitEdit}
      disabled={!auth.isAuthenticated}
    />
  </div>
</div>

<style>
  .app { display: flex; height: 100vh; overflow: hidden; position: relative; }
  .sidebar-toggle {
    display: none;
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    z-index: 30;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: color-mix(in srgb, currentColor 5%, transparent);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    backdrop-filter: blur(4px);
  }
  .sidebar {
    width: 260px;
    flex-shrink: 0;
    border-right: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: color-mix(in srgb, currentColor 4%, transparent);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 20;
  }
  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  }
  .logo { font-size: 1.2rem; }
  .title { font-weight: 700; font-size: 0.95rem; }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ant-ok);
    margin-left: auto;
  }
  .room-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem;
    overflow-y: auto;
    flex: 1;
  }
  .room-list li {
    border-radius: 8px;
    overflow: hidden;
  }
  .room-list li.active {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
  .room-list li a {
    position: relative;
    display: block;
    padding: 0.5rem 0.6rem;
    padding-right: 3.5rem;
    text-decoration: none;
    color: inherit;
  }
  .room-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .room-name {
    font-weight: 600;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .room-time {
    font-size: 0.7rem;
    opacity: 0.5;
  }
  .sidebar-activity {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ant-ok) 22%, transparent);
    color: var(--ant-ok);
    font-size: 0.66rem;
    font-weight: 700;
  }
  .sa-dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 999px;
    background: currentColor;
    box-shadow: 0 0 0 0 currentColor;
    animation: sa-pulse 1.6s ease-out infinite;
  }
  @keyframes sa-pulse {
    0%   { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 55%, transparent); }
    70%  { box-shadow: 0 0 0 5px color-mix(in srgb, currentColor 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 0%, transparent); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sa-dot { animation: none; }
  }
  .overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 15;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  .chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    flex-shrink: 0;
  }
  .room-title { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .name { font-weight: 700; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .state { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.15rem 0.4rem; border-radius: 4px; background: color-mix(in srgb, currentColor 15%, transparent); flex-shrink: 0; }
  .count { font-size: 0.75rem; opacity: 0.5; flex-shrink: 0; }
  .messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; position: relative; }
  .info { text-align: center; padding: 2rem; opacity: 0.6; }
  .error { color: var(--ant-danger); }
  .scroll-down {
    position: absolute;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    border: none;
    background: var(--ant-accent);
    color: white;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 10;
  }
  .scroll-down:hover { background: var(--ant-accent-strong); }

  @media (max-width: 640px) {
    .sidebar-toggle { display: block; }
    .sidebar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
      box-shadow: 2px 0 12px rgba(0,0,0,0.15);
    }
    .app.sidebar-open .sidebar {
      transform: translateX(0);
    }
    .overlay.visible {
      display: block;
      opacity: 1;
    }
    .chat-header { padding-left: 3rem; }
  }
</style>
