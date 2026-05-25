<script lang="ts">
  import { BRING_IN_APP_ADAPTERS, type BringInAppAdapter, type LaunchOutcome } from "$lib/bring-in-app/adapters";
  import { bringInApp } from "$lib/api/bring-in-app";
  import type { BringInTarget } from "$shared/api-types";

  type Props = {
    roomId: string;
    token: string;
    available: boolean;
  };

  let { roomId, token, available }: Props = $props();
  let launchingTarget = $state<BringInTarget | null>(null);
  let outcome = $state<LaunchOutcome | null>(null);
  let errorMessage = $state<string | null>(null);

  async function launch(adapter: BringInAppAdapter): Promise<void> {
    if (!adapter.available || launchingTarget) return;
    launchingTarget = adapter.target;
    outcome = null;
    errorMessage = null;
    try {
      const response = await bringInApp(roomId, token, adapter.target);
      outcome = await adapter.launch(response.payload);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      launchingTarget = null;
    }
  }
</script>

{#if available}
  <section class="bring-in-row" aria-label="Bring in an external app with this room context">
    <span class="label">Bring in</span>
    {#each BRING_IN_APP_ADAPTERS as adapter}
      <button
        type="button"
        class="pill"
        class:disabled={!adapter.available}
        class:loading={launchingTarget === adapter.target}
        disabled={!adapter.available || launchingTarget !== null}
        title={adapter.unavailableReason ?? `Open ${adapter.label} with room context`}
        onclick={() => launch(adapter)}
      >
        {adapter.label}
      </button>
    {/each}
  </section>
{:else}
  <section class="bring-in-row locked" aria-label="Bring-in-App is premium">
    <span class="label">Bring in Claude / ChatGPT / Codex / Gemini</span>
    <span class="premium">Premium</span>
  </section>
{/if}

{#if outcome}
  <p class="bring-in-status status-{outcome.status}" role="status">{outcome.message}</p>
{/if}
{#if errorMessage}
  <p class="bring-in-status error" role="alert">{errorMessage}</p>
{/if}

<style>
  .bring-in-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
    background: color-mix(in srgb, currentColor 2.5%, transparent);
    overflow-x: auto;
  }
  .bring-in-row.locked {
    color: color-mix(in srgb, currentColor 62%, transparent);
  }
  .label {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    opacity: 0.72;
  }
  .pill {
    min-height: 1.85rem;
    padding: 0.25rem 0.68rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    color: inherit;
    font-size: 0.76rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .pill:hover:not(:disabled) {
    border-color: var(--ant-accent);
    color: var(--ant-accent);
  }
  .pill.disabled,
  .pill:disabled {
    opacity: 0.46;
    cursor: not-allowed;
  }
  .pill.loading {
    color: var(--ant-accent);
    border-color: var(--ant-accent);
  }
  .premium {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    border: 1px solid var(--ant-accent);
    color: var(--ant-accent);
    font-size: 0.66rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  .bring-in-status {
    margin: 0;
    padding: 0.25rem 1rem 0.35rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 8%, transparent);
    font-size: 0.75rem;
  }
  .status-launched { color: var(--ant-ok); }
  .status-fallback { color: var(--ant-warn); }
  .status-unavailable,
  .error { color: var(--ant-danger); }
</style>
