<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { invoke } from "@tauri-apps/api/core";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { capabilities } from "$lib/stores/capabilities.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { parseAntDeepLink } from "$lib/deeplink";
  import { getServerUrl, setServerUrl } from "$lib/server-config";

  let appVersion = $state("…");
  let deepLinks = $state<string[]>([]);

  onMount(() => {
    let unlisten: UnlistenFn | undefined;
    void (async () => {
      appVersion = await invoke<string>("app_version");
      void capabilities.load();
      unlisten = await listen<string[]>("deep-link://ant", (event) => {
        deepLinks = [...deepLinks, ...event.payload];
        for (const url of event.payload) {
          const parsed = parseAntDeepLink(url);
          if (parsed) {
            if (parsed.serverUrl) setServerUrl(parsed.serverUrl);
            // Canonical ant:// QR embeds the api_key; that's the credential
            // for room API calls. Fall back to the pairing token if the
            // sender used the flat form without `key`.
            auth.setToken(parsed.apiKey ?? parsed.token);
            auth.setHandle("@you");
            goto(`/rooms/${parsed.roomId}`);
          }
        }
      });

      // Returning user — auth already restored from storage — skip the
      // welcome screen and land on the rooms list. First-time users (no
      // token) see the welcome with the "Enter App" / "Connect" call.
      if (auth.isAuthenticated) {
        void goto("/rooms");
      }
    })();
    return () => {
      unlisten?.();
    };
  });

  function enter() {
    goto("/rooms");
  }

  function toggleTheme() {
    const root = document.documentElement;
    const current = root.style.colorScheme || "light";
    const next = current === "dark" ? "light" : "dark";
    root.style.colorScheme = next;
    localStorage.setItem("ant.theme", next);
  }
</script>

<svelte:head><title>ANT Chat</title></svelte:head>

<main>
  <header>
    <h1>🐜 ANT Chat</h1>
    <div class="actions">
      <span class="tag">Tauri v2 · Svelte 5</span>
      <button class="ghost" onclick={toggleTheme} title="Toggle theme">🌓</button>
    </div>
  </header>

  <section class="hero">
    <p class="lead">
      A fast, native chat client for ANT rooms.
      Join conversations, read real-time messages, and stay in sync.
    </p>
    <button class="cta" onclick={enter}>Enter App</button>
  </section>

  {#if capabilities.data}
    <section class="caps">
      <div class="row">
        <span class="label">Server</span>
        <code>{capabilities.data.serverVersion}</code>
      </div>
      <div class="row">
        <span class="label">Tier</span>
        <span class="tier">{capabilities.data.tier.toUpperCase()}</span>
      </div>
      <div class="row">
        <span class="label">Features</span>
        <code>{capabilities.data.features[capabilities.data.tier].length} enabled</code>
      </div>
      <div class="row">
        <span class="label">App</span>
        <code>v{appVersion}</code>
      </div>
    </section>
  {:else if capabilities.error}
    <section class="caps error">{capabilities.error}</section>
  {/if}

  {#if deepLinks.length > 0}
    <section class="caps">
      <h3>Deep links</h3>
      <ul>
        {#each deepLinks as url (url)}
          <li><code>{url}</code></li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
    color-scheme: light dark;
  }
  main {
    max-width: 520px;
    margin: 0 auto;
    padding: 4rem 1.5rem 2rem;
    text-align: center;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }
  h1 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.02em;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .tag {
    font-size: 0.75rem;
    font-weight: 500;
    color: color-mix(in srgb, currentColor 50%, transparent);
  }
  .ghost {
    padding: 0.3rem 0.5rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
  .ghost:hover {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .hero {
    margin-bottom: 2.5rem;
  }
  .lead {
    font-size: 1.05rem;
    line-height: 1.5;
    color: color-mix(in srgb, currentColor 70%, transparent);
    margin-bottom: 1.5rem;
  }
  .cta {
    padding: 0.6rem 1.5rem;
    border-radius: 12px;
    border: none;
    background: var(--ant-accent);
    color: white;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.1s ease, background 0.1s ease;
  }
  .cta:hover {
    background: var(--ant-accent-strong);
    transform: translateY(-1px);
  }
  .caps {
    border: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    border-radius: 14px;
    padding: 1rem 1.25rem;
    text-align: left;
    background: color-mix(in srgb, currentColor 3%, transparent);
    margin-bottom: 1rem;
  }
  .row {
    display: grid;
    grid-template-columns: 5rem 1fr;
    gap: 0.75rem;
    padding: 0.35rem 0;
  }
  .label {
    font-size: 0.8rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
  }
  code {
    font-family: "SF Mono", ui-monospace, monospace;
    font-size: 0.8rem;
  }
  .tier {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .error {
    color: var(--ant-danger);
    font-size: 0.85rem;
  }
  h3 {
    margin: 0 0 0.5rem;
    font-size: 0.9rem;
  }
  ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8rem;
  }
  li {
    margin: 0.25rem 0;
    word-break: break-all;
  }
</style>
