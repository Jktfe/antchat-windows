<script lang="ts">
  /**
   * /settings — durable settings page.
   *
   * Three sections: Connection (server URL + disconnect), Appearance
   * (theme), About (app + server info). The native menu Settings… (⌘,)
   * wires here via the `nav` event; the page is reachable from /help and
   * the rooms list link as well.
   *
   * Theme is a small client-side preference persisted in localStorage as
   * "ant.theme" — same key the root +page.svelte writes. Light/Dark/System.
   */
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { invoke } from "@tauri-apps/api/core";
  import { auth } from "$lib/stores/auth.svelte";
  import { capabilities } from "$lib/stores/capabilities.svelte";
  import { getServerUrl, setServerUrl } from "$lib/server-config";

  let appVersion = $state<string | null>(null);
  let serverDraft = $state("");
  let serverSaved = $state(false);
  let theme = $state<"light" | "dark" | "system">("system");
  let tokenPreview = $derived(
    auth.token ? `${auth.token.slice(0, 4)}…${auth.token.slice(-4)}` : "(no token)"
  );

  onMount(() => {
    serverDraft = getServerUrl();
    if (typeof localStorage !== "undefined") {
      const t = localStorage.getItem("ant.theme") as typeof theme | null;
      if (t === "light" || t === "dark" || t === "system") {
        theme = t;
        applyTheme(theme);
      }
    }
    void (async () => {
      try {
        appVersion = await invoke<string>("app_version");
      } catch {
        appVersion = null;
      }
      void capabilities.load();
    })();
  });

  function applyTheme(value: typeof theme) {
    if (typeof document === "undefined") return;
    if (value === "system") {
      document.documentElement.style.removeProperty("color-scheme");
    } else {
      document.documentElement.style.colorScheme = value;
    }
  }

  function setTheme(value: typeof theme) {
    theme = value;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("ant.theme", value);
    }
    applyTheme(value);
  }

  function saveServerUrl() {
    const url = serverDraft.trim();
    if (!url) return;
    setServerUrl(url);
    serverSaved = true;
    setTimeout(() => (serverSaved = false), 1600);
  }

  function disconnect() {
    auth.clear();
    void goto("/");
  }
</script>

<svelte:head><title>Settings · ANT Chat</title></svelte:head>

<div class="page">
  <header>
    <span class="eyebrow">Settings</span>
    <h1>ANT Chat preferences</h1>
  </header>

  <section>
    <h2>Connection</h2>
    <label class="row">
      <span class="label">Server URL</span>
      <span class="control">
        <input
          type="url"
          bind:value={serverDraft}
          placeholder="http://localhost:6174"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" class="primary" onclick={saveServerUrl}>Save</button>
      </span>
    </label>
    {#if serverSaved}<p class="hint ok">Server URL saved.</p>{/if}
    <div class="row">
      <span class="label">Room token</span>
      <span class="control">
        <code class="token">{tokenPreview}</code>
        {#if auth.isAuthenticated}
          <button type="button" class="ghost danger" onclick={disconnect}>Disconnect</button>
        {/if}
      </span>
    </div>
    <div class="row">
      <span class="label">Handle</span>
      <span class="control">
        <code class="token">{auth.handle}</code>
      </span>
    </div>
  </section>

  <section>
    <h2>Appearance</h2>
    <div class="theme-row" role="radiogroup" aria-label="Theme">
      {#each ["system", "light", "dark"] as opt (opt)}
        <button
          type="button"
          class="theme-opt"
          class:active={theme === opt}
          role="radio"
          aria-checked={theme === opt}
          onclick={() => setTheme(opt as typeof theme)}
        >
          {opt === "system" ? "Match system" : opt === "light" ? "Light" : "Dark"}
        </button>
      {/each}
    </div>
  </section>

  <section>
    <h2>About</h2>
    <dl>
      <dt>App</dt>
      <dd><code>ant-chat-desktop {appVersion ?? "…"}</code></dd>
      <dt>Server</dt>
      <dd><code>{getServerUrl()}</code></dd>
      {#if capabilities.data}
        <dt>Tier</dt>
        <dd><code>{capabilities.data.tier.toUpperCase()}</code></dd>
        <dt>Server version</dt>
        <dd><code>{capabilities.data.serverVersion}</code></dd>
      {/if}
    </dl>
    <p class="hint"><a href="/help">Keyboard shortcuts →</a></p>
  </section>

  <footer class="back">
    <a href="/rooms">← Back to rooms</a>
  </footer>
</div>

<style>
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  header { display: flex; flex-direction: column; gap: 0.3rem; }
  .eyebrow {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  h1 { margin: 0; font-size: 1.55rem; font-weight: 800; letter-spacing: -0.01em; }
  section {
    border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    background: color-mix(in srgb, currentColor 3%, transparent);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  section h2 {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .label { font-size: 0.9rem; }
  .control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    justify-content: flex-end;
  }
  input[type="url"] {
    flex: 1;
    max-width: 22rem;
    padding: 0.45rem 0.7rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
    color: inherit;
    font: inherit;
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.82rem;
  }
  input[type="url"]:focus {
    outline: none;
    border-color: var(--ant-accent);
  }
  button { font: inherit; cursor: pointer; }
  .primary {
    padding: 0.45rem 0.95rem;
    border-radius: 8px;
    border: 1px solid var(--ant-accent);
    background: var(--ant-accent);
    color: white;
    font-weight: 600;
  }
  .primary:hover { background: var(--ant-accent-strong); }
  .ghost {
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
    color: inherit;
    font-weight: 600;
  }
  .ghost:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
  .ghost.danger:hover {
    background: color-mix(in srgb, var(--ant-danger) 18%, transparent);
    color: var(--ant-danger);
    border-color: color-mix(in srgb, var(--ant-danger) 35%, transparent);
  }
  .token {
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.82rem;
    opacity: 0.85;
  }
  .hint { margin: 0; font-size: 0.78rem; opacity: 0.7; }
  .hint.ok { color: var(--ant-ok); opacity: 1; }
  .theme-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  .theme-opt {
    padding: 0.55rem 0.85rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: transparent;
    color: inherit;
    font-weight: 600;
    text-align: center;
  }
  .theme-opt:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
  .theme-opt.active {
    background: color-mix(in srgb, var(--ant-accent) 18%, transparent);
    border-color: var(--ant-accent);
    color: var(--ant-accent);
  }
  dl {
    display: grid;
    grid-template-columns: 9rem 1fr;
    gap: 0.4rem 1rem;
    margin: 0;
  }
  dt { font-size: 0.85rem; opacity: 0.7; }
  dd { margin: 0; }
  code {
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 0.85rem;
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
