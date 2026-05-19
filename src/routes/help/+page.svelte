<script lang="ts">
  /**
   * /help — persistent help page.
   *
   * The native menu bar wires Help → /help via the `nav` event; the
   * cheatsheet (?) is the same content as a transient popover. This page
   * is the durable surface — same shortcuts table plus app/server info so
   * a user (or screenshot reviewer) has one place to land for "what is
   * this and how do I use it".
   */
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { shortcuts } from "$lib/shortcuts";
  import { capabilities } from "$lib/stores/capabilities.svelte";
  import { getServerUrl } from "$lib/server-config";

  let appVersion = $state<string | null>(null);

  onMount(() => {
    void (async () => {
      try {
        appVersion = await invoke<string>("app_version");
      } catch {
        appVersion = null;
      }
      void capabilities.load();
    })();
  });

  const serverUrl = $derived(getServerUrl());
</script>

<svelte:head><title>Help · ANT Chat</title></svelte:head>

<div class="page">
  <header>
    <span class="eyebrow">Help</span>
    <h1>ANT Chat — keyboard shortcuts</h1>
    <p class="lead">Everything you can do without leaving the keyboard.</p>
  </header>

  <section class="shortcuts">
    {#each shortcuts as section (section.title)}
      <article>
        <h2>{section.title}</h2>
        <ul>
          {#each section.rows as row (row.keys + row.label)}
            <li>
              <kbd>{row.keys}</kbd>
              <span>{row.label}</span>
            </li>
          {/each}
        </ul>
      </article>
    {/each}
  </section>

  <section class="about">
    <h2>About this build</h2>
    <dl>
      <dt>App</dt>
      <dd><code>ant-chat-desktop {appVersion ?? "…"}</code></dd>
      <dt>Server</dt>
      <dd><code>{serverUrl}</code></dd>
      {#if capabilities.data}
        <dt>Tier</dt>
        <dd><code>{capabilities.data.tier.toUpperCase()}</code></dd>
        <dt>Server version</dt>
        <dd><code>{capabilities.data.serverVersion}</code></dd>
      {/if}
    </dl>
  </section>

  <footer class="back">
    <a href="/rooms">← Back to rooms</a>
  </footer>
</div>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }
  header { display: flex; flex-direction: column; gap: 0.4rem; }
  .eyebrow {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  h1 { margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.01em; }
  .lead { margin: 0; opacity: 0.75; font-size: 0.95rem; }
  .shortcuts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
  }
  .shortcuts h2 {
    margin: 0 0 0.5rem;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  .shortcuts ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
  .shortcuts li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.86rem;
  }
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.8rem;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    background: color-mix(in srgb, currentColor 6%, transparent);
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
  }
  .about h2 {
    margin: 0 0 0.6rem;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  dl {
    display: grid;
    grid-template-columns: 9rem 1fr;
    gap: 0.5rem 1rem;
    margin: 0;
  }
  dt { font-size: 0.85rem; opacity: 0.7; }
  dd { margin: 0; }
  code {
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.85rem;
  }
  .back {
    margin-top: 0.5rem;
  }
  .back a {
    color: inherit;
    text-decoration: none;
    font-size: 0.85rem;
    opacity: 0.75;
    padding: 0.35rem 0.6rem;
    border-radius: 6px;
  }
  .back a:hover {
    background: color-mix(in srgb, currentColor 10%, transparent);
    opacity: 1;
  }
</style>
