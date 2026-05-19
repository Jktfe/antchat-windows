<script lang="ts">
  /**
   * /plans/[planId] — minimal cockpit mirror.
   *
   * Consumes the server's GET /api/plans/:planId/cockpit projection
   * (cockpit.plan / progress / phases / unphasedTasks / rooms /
   * recentActivity) and renders a focused-at-a-glance summary. Unphased
   * tasks are grouped by status (planned, in_progress, completed) so an
   * operator can spot what's missing a phase versus what's actively
   * moving versus what's banked.
   *
   * This is a v4 mirror, not full v3 cockpit parity — drag-to-phase,
   * dependency-edit, evidence preview, etc. land as follow-on slices.
   */
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { auth } from "$lib/stores/auth.svelte";
  import { getServerUrl } from "$lib/server-config";

  type TaskStatus =
    | "planned"
    | "in_progress"
    | "blocked"
    | "completed"
    | "cancelled"
    | string;

  interface CockpitTask {
    id: string;
    subject: string;
    description: string;
    status: TaskStatus;
    priority: number;
    planId: string;
    assignedAgent?: string | null;
  }

  interface CockpitPlan {
    id: string;
    title: string;
    description: string;
    lifecycle: string;
  }

  interface CockpitProgress {
    tasks: { total: number; completed: number; pct: number };
    phases: unknown[];
    milestones: { total: number; completed: number; pct: number };
  }

  interface CockpitRoom {
    id: string;
    name: string;
  }

  interface CockpitActivityEntry {
    kind: string;
    refId?: string;
    atMs: number;
    subject?: string;
    title?: string;
  }

  interface Cockpit {
    plan: CockpitPlan;
    progress: CockpitProgress;
    phases: unknown[];
    unphasedTasks: CockpitTask[];
    rooms?: CockpitRoom[];
    recentActivity?: CockpitActivityEntry[];
  }

  const planId = $derived(page.params.planId);

  let cockpit = $state<Cockpit | null>(null);
  let status = $state<"loading" | "ready" | "error">("loading");
  let errorMessage = $state<string | null>(null);

  async function load() {
    if (!planId || !auth.isAuthenticated) return;
    status = "loading";
    errorMessage = null;
    try {
      const res = await fetch(
        `${getServerUrl()}/api/plans/${encodeURIComponent(planId)}/cockpit`,
        { headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/json" } },
      );
      if (!res.ok) throw new Error(`cockpit request failed: ${res.status}`);
      const body = (await res.json()) as { cockpit: Cockpit };
      cockpit = body.cockpit;
      status = "ready";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      status = "error";
    }
  }

  onMount(() => {
    void load();
  });

  // Group unphased tasks by status — the v4 cockpit's grouped-unphased view.
  // Order matters: surface anything in-progress + blocked first, then planned,
  // then completed at the bottom so the eye lands on work that needs eyes.
  const groupedUnphased = $derived.by(() => {
    const buckets = new Map<TaskStatus, CockpitTask[]>();
    const order: TaskStatus[] = ["in_progress", "blocked", "planned", "completed", "cancelled"];
    for (const t of cockpit?.unphasedTasks ?? []) {
      const arr = buckets.get(t.status) ?? [];
      arr.push(t);
      buckets.set(t.status, arr);
    }
    return order
      .filter((s) => buckets.has(s))
      .map((s) => ({ status: s, tasks: buckets.get(s)! }));
  });

  const progressPct = $derived(
    cockpit ? Math.round(cockpit.progress.tasks.pct * 100) : 0,
  );

  function statusLabel(s: TaskStatus): string {
    switch (s) {
      case "in_progress": return "In progress";
      case "blocked": return "Blocked";
      case "planned": return "Planned";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return s;
    }
  }
</script>

<svelte:head><title>{cockpit?.plan?.title ?? "Plan"} | ANT Chat</title></svelte:head>

<div class="cockpit">
  {#if status === "loading"}
    <div class="state">Loading cockpit…</div>
  {:else if status === "error"}
    <div class="state error">
      <p>{errorMessage}</p>
      <button onclick={load}>Retry</button>
    </div>
  {:else if cockpit}
    <header class="cock-header">
      <div>
        <h1>{cockpit.plan.title}</h1>
        {#if cockpit.plan.description}
          <p class="cock-desc">{cockpit.plan.description}</p>
        {/if}
      </div>
      <span class="lifecycle" data-lifecycle={cockpit.plan.lifecycle}>{cockpit.plan.lifecycle}</span>
    </header>

    <section class="progress">
      <div class="progress-meta">
        <strong>{cockpit.progress.tasks.completed}/{cockpit.progress.tasks.total}</strong>
        <span>tasks · {progressPct}%</span>
      </div>
      <div class="progress-bar" aria-hidden="true">
        <div class="progress-fill" style:width={`${progressPct}%`}></div>
      </div>
    </section>

    {#if groupedUnphased.length > 0}
      <section class="unphased">
        <h2>Unphased tasks</h2>
        {#each groupedUnphased as group (group.status)}
          <div class="group">
            <header class="group-header">
              <span class="status-dot" data-status={group.status}></span>
              <h3>{statusLabel(group.status)}</h3>
              <span class="count">{group.tasks.length}</span>
            </header>
            <ul>
              {#each group.tasks as task (task.id)}
                <li class="task" class:done={task.status === "completed"}>
                  <span class="task-subject">{task.subject}</span>
                  {#if task.assignedAgent}
                    <span class="task-agent">{task.assignedAgent}</span>
                  {/if}
                  {#if task.priority > 0}
                    <span class="task-pri" title="Priority">P{task.priority}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </section>
    {:else}
      <section class="unphased">
        <h2>Unphased tasks</h2>
        <p class="state">No unphased tasks — every task is in a phase.</p>
      </section>
    {/if}

    {#if cockpit.rooms && cockpit.rooms.length > 0}
      <section class="rooms">
        <h2>Rooms</h2>
        <ul>
          {#each cockpit.rooms as room (room.id)}
            <li><a href={`/rooms/${room.id}`}>{room.name}</a></li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</div>

<style>
  .cockpit {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .state { padding: 2rem 0; text-align: center; opacity: 0.7; }
  .state.error { color: var(--ant-danger); }
  .cock-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .cock-header h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.01em; }
  .cock-desc { margin: 0.4rem 0 0; opacity: 0.75; font-size: 0.9rem; }
  .lifecycle {
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
  .lifecycle[data-lifecycle="active"] { background: color-mix(in srgb, var(--ant-ok) 25%, transparent); color: #166534; }
  .lifecycle[data-lifecycle="archived"] { opacity: 0.5; }
  .progress {
    border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    background: color-mix(in srgb, currentColor 3%, transparent);
  }
  .progress-meta {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .progress-meta strong { font-size: 1.2rem; font-weight: 800; }
  .progress-meta span { font-size: 0.85rem; opacity: 0.7; }
  .progress-bar {
    height: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 10%, transparent);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--ant-ok);
    transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .unphased h2, .rooms h2 {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
    font-weight: 700;
  }
  .group { margin-bottom: 1rem; }
  .group-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .group-header h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.65;
  }
  .count {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 10%, transparent);
    opacity: 0.75;
  }
  .status-dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.6;
  }
  .status-dot[data-status="in_progress"] { background: var(--ant-accent); opacity: 1; }
  .status-dot[data-status="blocked"]     { background: var(--ant-danger); opacity: 1; }
  .status-dot[data-status="planned"]     { background: var(--ant-warn); opacity: 0.85; }
  .status-dot[data-status="completed"]   { background: var(--ant-ok); opacity: 0.85; }
  .status-dot[data-status="cancelled"]   { background: currentColor; opacity: 0.35; }
  .group ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .task {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0.8rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    font-size: 0.85rem;
  }
  .task.done { opacity: 0.55; text-decoration: line-through; }
  .task-subject { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .task-agent { font-size: 0.7rem; opacity: 0.7; font-family: ui-monospace, monospace; }
  .task-pri {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    background: color-mix(in srgb, currentColor 12%, transparent);
  }
  .rooms ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .rooms li a {
    display: inline-block;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    text-decoration: none;
    color: inherit;
    font-size: 0.8rem;
  }
  .rooms li a:hover { background: color-mix(in srgb, currentColor 14%, transparent); }
</style>
