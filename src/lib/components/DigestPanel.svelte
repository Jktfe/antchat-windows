<script lang="ts">
  /**
   * DigestPanel — room digest viewer.
   *
   * Fetches GET /api/chat-rooms/:id/digest on open and renders the
   * server-supplied stats + active participants + top key terms. The
   * digest endpoint is the same one the web /rooms card "Digest" button
   * opens (#56 / #103) — this is a thin Tauri mirror.
   *
   * Single panel mounted at the page level; pass roomId & roomName when
   * opening, null when closed.
   */
  import { getServerUrl } from "$lib/server-config";
  import { auth } from "$lib/stores/auth.svelte";
  import { relativeTime } from "$lib/time";

  interface DigestParticipant {
    id: string;
    count: number;
    lastMessageAtMs: number;
    activityState: "active" | "idle" | string;
  }

  interface Digest {
    messageCount: number;
    participantCount: number;
    durationMinutes: number;
    messagesPerHour: number;
    participants: DigestParticipant[];
    keyTerms: { term: string; count: number }[];
    firstMessage: string;
    lastMessage: string;
  }

  interface Props {
    roomId: string | null;
    roomName: string;
    onClose: () => void;
  }
  let { roomId, roomName, onClose }: Props = $props();

  let digest = $state<Digest | null>(null);
  let status = $state<"idle" | "loading" | "ready" | "error">("idle");
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    if (!roomId) {
      digest = null;
      status = "idle";
      return;
    }
    void load(roomId);
  });

  async function load(id: string) {
    status = "loading";
    errorMessage = null;
    try {
      const res = await fetch(
        `${getServerUrl()}/api/chat-rooms/${encodeURIComponent(id)}/digest`,
        { headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`digest request failed: ${res.status}`);
      digest = (await res.json()) as Digest;
      status = "ready";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      status = "error";
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  function formatHours(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  const active = $derived(
    digest?.participants.filter((p) => p.activityState === "active") ?? [],
  );
  const idle = $derived(
    digest?.participants.filter((p) => p.activityState !== "active") ?? [],
  );
</script>

{#if roomId}
  <div
    class="dp-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label={`Digest for ${roomName}`}
    tabindex="-1"
    onkeydown={onKeyDown}
  >
    <button class="dp-scrim" type="button" aria-label="Close digest" onclick={onClose}></button>
    <div class="dp-panel">
      <header class="dp-header">
        <div>
          <span class="dp-eyebrow">Digest</span>
          <h2>{roomName}</h2>
        </div>
        <button type="button" class="dp-close" onclick={onClose} aria-label="Close">×</button>
      </header>

      {#if status === "loading"}
        <div class="dp-state">Loading digest…</div>
      {:else if status === "error"}
        <div class="dp-state error">{errorMessage}</div>
      {:else if digest}
        <section class="dp-stats">
          <div class="stat"><strong>{digest.messageCount.toLocaleString()}</strong><span>messages</span></div>
          <div class="stat"><strong>{formatHours(digest.durationMinutes)}</strong><span>span</span></div>
          <div class="stat"><strong>{digest.messagesPerHour}</strong><span>msgs/hr</span></div>
          <div class="stat"><strong>{digest.participantCount}</strong><span>people</span></div>
        </section>

        {#if active.length > 0}
          <section class="dp-section">
            <h3>Active now</h3>
            <ul class="dp-participants">
              {#each active as p (p.id)}
                <li>
                  <span class="dp-handle">{p.id}</span>
                  <span class="dp-count">{p.count} msgs</span>
                  <span class="dp-time">{relativeTime(new Date(p.lastMessageAtMs).toISOString())}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if idle.length > 0}
          <section class="dp-section">
            <h3>Idle</h3>
            <ul class="dp-participants idle">
              {#each idle as p (p.id)}
                <li>
                  <span class="dp-handle">{p.id}</span>
                  <span class="dp-count">{p.count} msgs</span>
                  <span class="dp-time">{relativeTime(new Date(p.lastMessageAtMs).toISOString())}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if digest.keyTerms.length > 0}
          <section class="dp-section">
            <h3>Key terms</h3>
            <ul class="dp-terms">
              {#each digest.keyTerms.slice(0, 12) as term (term.term)}
                <li>
                  <span class="dp-term">{term.term}</span>
                  <span class="dp-term-count">{term.count}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .dp-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 2rem;
    animation: dp-fade 140ms ease-out both;
  }
  @keyframes dp-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .dp-scrim {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: color-mix(in srgb, currentColor 35%, transparent);
    backdrop-filter: blur(6px);
    cursor: default;
  }
  .dp-panel {
    position: relative;
    z-index: 1;
    width: min(640px, 100%);
    max-height: min(80vh, 720px);
    overflow: auto;
    background: var(--dp-bg, #fffbf3);
    color: inherit;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    box-shadow: 0 24px 60px rgb(0 0 0 / 30%);
    animation: dp-rise 180ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes dp-rise {
    from { opacity: 0; transform: translateY(8px) scale(0.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (prefers-color-scheme: dark) {
    .dp-panel { background: #14160f; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dp-backdrop, .dp-panel { animation: none; }
  }
  .dp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem;
  }
  .dp-eyebrow {
    display: block;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  .dp-header h2 { margin: 0.15rem 0 0; font-size: 1.1rem; font-weight: 700; }
  .dp-close {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
  }
  .dp-close:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
  .dp-state {
    padding: 2rem 1.25rem;
    text-align: center;
    opacity: 0.7;
  }
  .dp-state.error { color: var(--ant-danger); }
  .dp-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.6rem;
    padding: 0.5rem 1.25rem 0.75rem;
  }
  .stat {
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    background: color-mix(in srgb, currentColor 6%, transparent);
    text-align: left;
  }
  .stat strong { display: block; font-size: 1.05rem; font-weight: 800; line-height: 1.1; }
  .stat span { font-size: 0.7rem; opacity: 0.65; }
  .dp-section { padding: 0.5rem 1.25rem 0.75rem; }
  .dp-section h3 {
    margin: 0 0 0.45rem;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  .dp-participants {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
  }
  .dp-participants li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.6rem;
    align-items: center;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: color-mix(in srgb, currentColor 4%, transparent);
    font-size: 0.82rem;
  }
  .dp-participants.idle li { opacity: 0.7; }
  .dp-handle { font-family: ui-monospace, "SF Mono", monospace; font-size: 0.78rem; }
  .dp-count { font-size: 0.72rem; opacity: 0.7; }
  .dp-time { font-size: 0.72rem; opacity: 0.65; }
  .dp-terms {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .dp-terms li {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    font-size: 0.78rem;
  }
  .dp-term-count {
    font-size: 0.68rem;
    opacity: 0.6;
    font-weight: 700;
  }
</style>
