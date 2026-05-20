<script lang="ts">
  /**
   * wta-10 — F7 11-section Room Tools panel for the room view.
   *
   * Each section fetches its own endpoint on mount + refreshes on prop change.
   * Live count badges per section header. Gotchas (per
   * `ObsidiANT/audits/room-tools-panel-shape-audit-2026-05-19.md`):
   *
   *   G1. attachments returns `sharedFiles`, NOT `attachments`
   *   G2. links: `{ outgoing, incoming }` — sum both
   *   G3. interviews: `{ active, recent }` — recent.count + 🔴 badge if active
   *   G4. participants 404 today → stub with "—" until codex SSE endpoint
   *   G5. memory-recall requires `query=` → lazy-load on expand + inline search
   *
   * D2 remote-invites + D4 checkout/create-session UI surfaces are HIDDEN in
   * dev tier (per JWPK msg_mtpqhnd0bx no-cert + dev-tier-only framing).
   */
  import { onMount } from "svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { getServerUrl } from "$lib/server-config";

  let { roomId }: { roomId: string } = $props();

  type Counts = Record<string, number | null>;
  let counts = $state<Counts>({});
  let loading = $state(true);

  async function fetchJson<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${getServerUrl()}${path}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async function loadCounts(rid: string) {
    loading = true;
    const [
      focusMode,
      asks,
      plans,
      tasks,
      links,
      interviews,
      artefacts,
      screenshots,
      attachments,
    ] = await Promise.all([
      fetchJson<{ focusedMembers: unknown[] }>(`/api/chat-rooms/${rid}/focus-mode`),
      fetchJson<{ asks: unknown[] }>(`/api/asks?roomId=${rid}&openOnly=1`),
      fetchJson<{ plans: unknown[] }>(`/api/chat-rooms/${rid}/plans`),
      fetchJson<{ tasks: unknown[] }>(`/api/chat-rooms/${rid}/tasks`),
      fetchJson<{ outgoing: unknown[]; incoming: unknown[] }>(`/api/chat-rooms/${rid}/links`),
      fetchJson<{ active: unknown | null; recent: unknown[] }>(`/api/chat-rooms/${rid}/interviews`),
      fetchJson<{ artefacts: unknown[] }>(`/api/chat-rooms/${rid}/artefacts`),
      fetchJson<{ screenshots: unknown[] }>(`/api/chat-rooms/${rid}/screenshots`),
      fetchJson<{ sharedFiles: unknown[] }>(`/api/chat-rooms/${rid}/attachments`),
    ]);

    counts = {
      // G4 participants stubbed null until SSE endpoint ships (codex lane)
      participants: null,
      focusMode: focusMode?.focusedMembers.length ?? 0,
      asks: asks?.asks.length ?? 0,
      plans: plans?.plans.length ?? 0,
      tasks: tasks?.tasks.length ?? 0,
      // G2 links: SUM incoming + outgoing
      links: (links?.outgoing.length ?? 0) + (links?.incoming.length ?? 0),
      // G3 interviews: recent.count; active surfaces as 🔴 badge separately
      interviews: interviews?.recent.length ?? 0,
      interviewsActive: interviews?.active ? 1 : 0,
      artefacts: artefacts?.artefacts.length ?? 0,
      screenshots: screenshots?.screenshots.length ?? 0,
      // G1 attachments: NOTE — `sharedFiles` key, NOT `attachments`
      attachments: attachments?.sharedFiles.length ?? 0,
      // G5 memory: no upfront count; lazy-load on expand
      memory: null,
    };
    loading = false;
  }

  $effect(() => {
    if (!auth.isAuthenticated || !roomId) return;
    void loadCounts(roomId);
  });

  function badge(value: number | null, fallback = "—"): string {
    return value === null ? fallback : String(value);
  }
</script>

<aside class="room-tools" aria-label="Room tools">
  <h2>Room Tools</h2>

  <details>
    <summary>
      <span>Participants</span>
      <span class="count">{badge(counts.participants)}</span>
    </summary>
    <p class="hint">Stub until SSE participants endpoint ships (codex lane).</p>
  </details>

  <details>
    <summary>
      <span>Focus mode</span>
      <span class="count">{badge(counts.focusMode)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Open asks</span>
      <span class="count">{badge(counts.asks)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Plans</span>
      <span class="count">{badge(counts.plans)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Tasks</span>
      <span class="count">{badge(counts.tasks)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Linked rooms</span>
      <span class="count">{badge(counts.links)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Interviews</span>
      <span class="count">
        {#if counts.interviewsActive}<span class="active-dot">🔴</span>{/if}
        {badge(counts.interviews)}
      </span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Artefacts</span>
      <span class="count">{badge(counts.artefacts)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Screenshots</span>
      <span class="count">{badge(counts.screenshots)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Attachments</span>
      <span class="count">{badge(counts.attachments)}</span>
    </summary>
  </details>

  <details>
    <summary>
      <span>Room memory</span>
      <span class="count">…</span>
    </summary>
    <p class="hint">
      Search room memory — type a query (memory-recall endpoint requires it; G5 from audit).
    </p>
    <input type="search" placeholder="Search room memory…" />
  </details>

  {#if loading}
    <p class="loading">Loading…</p>
  {/if}
</aside>

<style>
  .room-tools {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: var(--space-4, 1rem);
    background: var(--panel, #fff);
    border-left: 1px solid var(--surface-edge, #e8e4d9);
    width: 280px;
    min-height: 100vh;
    overflow-y: auto;
  }
  h2 {
    margin: 0 0 var(--space-3, 0.75rem);
    font-family: var(--font-display);
    font-weight: var(--weight-display, 850);
    font-size: 1rem;
    color: var(--ink-strong);
  }
  details {
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-sm, 0.4rem);
  }
  details:hover {
    background: var(--bg, #f7f5ef);
  }
  summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    list-style: none;
    font-weight: var(--weight-body-strong, 600);
    color: var(--ink, #0a1022);
  }
  summary::-webkit-details-marker { display: none; }
  .count {
    font-family: var(--font-mono);
    font-weight: var(--weight-mono-header, 700);
    color: var(--ink-soft, #5c6275);
    font-size: 0.85rem;
  }
  .active-dot {
    margin-right: 0.3rem;
    font-size: 0.7rem;
  }
  .hint {
    margin: 0.4rem 0;
    font-size: 0.85rem;
    color: var(--ink-soft, #5c6275);
  }
  details input[type="search"] {
    width: 100%;
    padding: 0.4rem 0.7rem;
    margin-top: 0.4rem;
    font: inherit;
    border: 1px solid var(--surface-edge);
    border-radius: var(--radius-sm);
    background: var(--bg);
  }
  .loading {
    margin: 0.8rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-soft, #5c6275);
  }
</style>
