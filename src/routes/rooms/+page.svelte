<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { RoomMember } from "$shared/api-types";
  import { auth } from "$lib/stores/auth.svelte";
  import { roomsStore } from "$lib/stores/rooms.svelte";
  import { roomActivity } from "$lib/stores/roomActivity.svelte";
  import { relativeTime } from "$lib/time";
  import DigestPanel from "$lib/components/DigestPanel.svelte";

  // djb2-hash fallback hue when the server hasn't set a per-room displayColor.
  function fallbackHue(handle: string): number {
    let hash = 5381;
    for (let i = 0; i < handle.length; i += 1) {
      hash = ((hash << 5) + hash + handle.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 360;
  }

  function avatarStyle(member: RoomMember): string {
    if (member.displayColor) return `background-color: ${member.displayColor};`;
    return `background-color: hsl(${fallbackHue(member.handle)} 62% 42%);`;
  }

  function avatarInitial(member: RoomMember): string {
    if (member.displayIcon) return member.displayIcon;
    const after = member.handle.startsWith("@") ? member.handle.slice(1) : member.handle;
    return (after.charAt(0) || "?").toUpperCase();
  }

  // Parse a leading "@handle: body" from the server-supplied summary so the
  // room card can render the latest message with the sender's room-scoped
  // colour accent + a chip, rather than a flat grey line. Falls back to a
  // plain string when the summary isn't a chat message (system events,
  // attachments, etc).
  type PreviewParts = { handle: string | null; body: string };
  function parseSummary(summary: string): PreviewParts {
    const m = /^(@[\w-]+):\s*(.*)$/.exec(summary);
    if (!m) return { handle: null, body: summary };
    return { handle: m[1], body: m[2] };
  }

  function previewSenderColor(
    members: RoomMember[],
    handle: string | null,
  ): string | null {
    if (!handle) return null;
    const m = members.find((x) => x.handle === handle);
    return m?.displayColor ?? null;
  }

  // Active digest panel — null when closed, {id, name} when open.
  let digestRoom = $state<{ id: string; name: string } | null>(null);

  // v4 principle: no native prompt()/confirm() — connect uses a real form.
  let showConnect = $state(false);
  let tokenDraft = $state("");
  let connectError = $state<string | null>(null);

  onMount(() => {
    if (auth.isAuthenticated) {
      void roomsStore.load(auth.token);
    } else {
      showConnect = true;
    }
  });

  // Once rooms are loaded, start the agent-activity poller for them all.
  // The store handles its own 30s tick; stop() on unmount closes the timer.
  $effect(() => {
    if (roomsStore.status === "ready" && roomsStore.rooms.length > 0) {
      roomActivity.start(roomsStore.rooms.map((r) => r.id));
    }
  });
  onDestroy(() => roomActivity.stop());

  // Format the per-room badge text — "N working" when anyone is doing
  // something right now, otherwise "idle <age>" relative to the last
  // status timestamp.
  function activityLabel(roomId: string): string | null {
    const snap = roomActivity.activity[roomId];
    if (!snap) return null;
    if (snap.activeCount > 0) {
      return `${snap.activeCount} working`;
    }
    if (snap.lastActivityMs) {
      return `idle ${relativeTime(new Date(snap.lastActivityMs).toISOString())}`;
    }
    return null;
  }

  async function submitConnect() {
    const t = tokenDraft.trim();
    if (!t) {
      connectError = "Please paste your room token.";
      return;
    }
    connectError = null;
    auth.setToken(t);
    showConnect = false;
    tokenDraft = "";
    await roomsStore.load(t);
  }

  function openConnect() {
    showConnect = true;
    connectError = null;
  }

  // Quick filter — narrows the visible cards by name, case-insensitive,
  // matches member handles too so "evolveantcodex" finds rooms they're in.
  let filterQuery = $state("");
  const filteredRooms = $derived.by(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return roomsStore.rooms;
    return roomsStore.rooms.filter((r) => {
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.summary && r.summary.toLowerCase().includes(q)) return true;
      return r.members.some((m) => m.handle.toLowerCase().includes(q));
    });
  });
</script>

<svelte:head>
  <title>
    {filterQuery && filteredRooms.length !== roomsStore.rooms.length
      ? `Rooms (${filteredRooms.length}/${roomsStore.rooms.length}) · ANT Chat`
      : roomsStore.rooms.length > 0
      ? `Rooms (${roomsStore.rooms.length}) · ANT Chat`
      : "Rooms · ANT Chat"}
  </title>
</svelte:head>

<div class="page">
  <header>
    <h1>ANT Chat</h1>
    {#if auth.isAuthenticated}
      <span class="badge">Connected</span>
    {:else}
      <button onclick={openConnect}>Connect</button>
    {/if}
  </header>

  {#if showConnect}
    <form class="connect-card" onsubmit={(e) => { e.preventDefault(); void submitConnect(); }}>
      <label for="room-token">Paste your room token</label>
      <input
        id="room-token"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="rt_…"
        bind:value={tokenDraft}
      />
      {#if connectError}
        <p class="connect-error" role="alert">{connectError}</p>
      {/if}
      <div class="connect-actions">
        {#if auth.isAuthenticated}
          <button type="button" class="ghost" onclick={() => { showConnect = false; tokenDraft = ""; connectError = null; }}>Cancel</button>
        {/if}
        <button type="submit" class="primary">Connect</button>
      </div>
    </form>
  {:else if !auth.isAuthenticated}
    <div class="empty">
      <p>Paste a room token to join the conversation.</p>
      <button onclick={openConnect}>Connect with token</button>
    </div>
  {:else if roomsStore.status === "loading"}
    <div class="empty">Loading rooms...</div>
  {:else if roomsStore.status === "error"}
    <div class="empty error">
      <p>{roomsStore.error}</p>
      <button onclick={() => roomsStore.load(auth.token)}>Retry</button>
    </div>
  {:else if roomsStore.rooms.length === 0}
    <div class="empty">No rooms found.</div>
  {:else}
    <div class="filter-bar">
      <input
        type="search"
        bind:value={filterQuery}
        placeholder="Filter rooms by name, summary, or member…"
        aria-label="Filter rooms"
      />
      {#if filterQuery && filteredRooms.length !== roomsStore.rooms.length}
        <span class="filter-count" aria-live="polite">
          {filteredRooms.length} of {roomsStore.rooms.length}
        </span>
      {/if}
    </div>
    {#if filteredRooms.length === 0}
      <div class="empty">No rooms match “{filterQuery}”.</div>
    {:else}
    <ul class="room-list">
      {#each filteredRooms as room (room.id)}
        <li class="room-card">
          <a class="card-body" href={`/rooms/${room.id}`}>
            <div class="room-header">
              <span class="name">{room.name}</span>
              <span class="state">{room.attentionState}</span>
            </div>
            {#if room.members.length > 0}
              <div class="room-members" aria-label="Participants">
                {#each room.members as member (member.handle)}
                  <span
                    class="avatar"
                    style={avatarStyle(member)}
                    title={member.displayName && member.displayName !== member.handle
                      ? `${member.handle} (${member.displayName})`
                      : member.handle}
                  >{avatarInitial(member)}</span>
                {/each}
              </div>
            {/if}
            {#if room.description}
              <!-- User/agent-authored description (server a19a496
                   2026-05-24) takes precedence over the auto-derived
                   summary preview when set. Matches RoomStrip on
                   a-nice-terminal (cb65df5). -->
              <div class="room-preview">
                <span class="preview-body">{room.description}</span>
              </div>
            {:else if room.summary}
              {@const parts = parseSummary(room.summary)}
              {@const senderColor = previewSenderColor(room.members, parts.handle)}
              <div class="room-preview">
                {#if parts.handle}
                  <span
                    class="preview-sender"
                    style:color={senderColor ?? "inherit"}
                    style:border-left-color={senderColor ?? "currentColor"}
                  >{parts.handle}</span>
                {/if}
                <span class="preview-body">{parts.body}</span>
              </div>
            {/if}
            <div class="room-meta">
              {#if activityLabel(room.id)}
                {@const snap = roomActivity.activity[room.id]}
                <span class="activity-pill" class:active={(snap?.activeCount ?? 0) > 0}>
                  <span class="dot" aria-hidden="true"></span>
                  {activityLabel(room.id)}
                </span>
                <span class="meta-sep">·</span>
              {/if}
              {room.members.length} member{room.members.length === 1 ? "" : "s"} ·
              {relativeTime(room.lastUpdate)}
            </div>
          </a>
          <div class="card-actions">
            <button
              type="button"
              class="card-action"
              title="Open digest"
              aria-label={`Show digest for "${room.name}"`}
              onclick={() => (digestRoom = { id: room.id, name: room.name })}
            >Digest</button>
          </div>
        </li>
      {/each}
    </ul>
    {/if}
  {/if}
</div>

<DigestPanel
  roomId={digestRoom?.id ?? null}
  roomName={digestRoom?.name ?? ""}
  onClose={() => (digestRoom = null)}
/>

<style>
  .page { max-width: 720px; margin: 0 auto; padding: 2rem 1rem; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
  h1 { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .badge { font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.7rem; border-radius: 999px; background: var(--ant-ok); color: white; }
  button { padding: 0.45rem 1rem; border-radius: 8px; border: 1px solid currentColor; background: transparent; color: inherit; cursor: pointer; font: inherit; }
  button:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
  .empty { text-align: center; padding: 3rem 1rem; opacity: 0.7; }
  .error { color: var(--ant-danger); }
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.85rem;
  }
  .filter-bar input {
    flex: 1;
    padding: 0.5rem 0.85rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    color: inherit;
    font: inherit;
    font-size: 0.88rem;
  }
  .filter-bar input:focus {
    outline: none;
    border-color: var(--ant-accent);
  }
  .filter-count {
    font-size: 0.78rem;
    opacity: 0.65;
    white-space: nowrap;
  }
  .room-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
  a { text-decoration: none; color: inherit; }
  .room-card {
    position: relative;
    border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, currentColor 3%, transparent);
    transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease, border-color 160ms ease;
    overflow: hidden;
  }
  .room-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px color-mix(in srgb, currentColor 14%, transparent); border-color: color-mix(in srgb, currentColor 28%, transparent); }
  .room-card:active { transform: translateY(0); transition-duration: 80ms; }
  @media (prefers-reduced-motion: reduce) {
    .room-card { transition: none; }
    .room-card:hover { transform: none; }
  }
  .card-body {
    display: block;
    padding: 1rem 1.25rem 0.6rem;
  }
  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
    padding: 0 0.75rem 0.6rem;
  }
  .card-action {
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .card-action:hover {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .room-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem; }
  .name { font-weight: 600; font-size: 1rem; }
  .state { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.2rem 0.5rem; border-radius: 6px; background: color-mix(in srgb, currentColor 15%, transparent); }
  .room-members { display: flex; gap: 0.25rem; margin-bottom: 0.4rem; flex-wrap: wrap; }
  .avatar { display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border-radius: 999px; color: white; font-size: 0.7rem; font-weight: 700; line-height: 1; user-select: none; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); box-sizing: border-box; flex-shrink: 0; }
  .room-preview {
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
    line-height: 1.35;
    /* Up to two lines of preview, ellipsis after — gives a real glance at
       the latest message instead of the flat single-line summary. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .preview-sender {
    display: inline;
    font-weight: 700;
    margin-right: 0.4rem;
    padding-left: 0.45rem;
    border-left: 2px solid;
    /* Colour comes via inline style:color from the room-scoped member. */
  }
  .preview-body { opacity: 0.85; }
  .room-meta { font-size: 0.8rem; opacity: 0.6; display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
  .meta-sep { opacity: 0.45; }
  .activity-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    font-size: 0.72rem;
    font-weight: 600;
    opacity: 0.95;
  }
  .activity-pill .dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.55;
  }
  .activity-pill.active {
    background: color-mix(in srgb, var(--ant-ok) 18%, transparent);
    color: var(--ant-ok);
    opacity: 1;
  }
  .activity-pill.active .dot {
    background: var(--ant-ok);
    opacity: 1;
    box-shadow: 0 0 0 0 var(--ant-ok);
    animation: activity-pulse 1.6s ease-out infinite;
  }
  @keyframes activity-pulse {
    0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ant-ok) 55%, transparent); }
    70%  { box-shadow: 0 0 0 6px color-mix(in srgb, var(--ant-ok) 0%, transparent); }
    100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ant-ok) 0%, transparent); }
  }
  @media (prefers-reduced-motion: reduce) {
    .activity-pill.active .dot { animation: none; }
  }
  .connect-card {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, currentColor 4%, transparent);
  }
  .connect-card label {
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0.85;
  }
  .connect-card input {
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
    color: inherit;
    font: inherit;
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.85rem;
  }
  .connect-card input:focus {
    outline: none;
    border-color: var(--ant-accent);
  }
  .connect-error {
    margin: 0;
    color: var(--ant-danger);
    font-size: 0.8rem;
  }
  .connect-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .connect-actions .ghost {
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  }
  .connect-actions .primary {
    background: var(--ant-accent);
    border-color: var(--ant-accent);
    color: white;
  }
  .connect-actions .primary:hover { background: var(--ant-accent-strong); }
</style>
