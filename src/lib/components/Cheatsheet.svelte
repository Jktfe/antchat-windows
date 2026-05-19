<script lang="ts">
  /**
   * Cheatsheet — keyboard-shortcut help popover.
   *
   * Triggered by pressing `?` anywhere outside an input/textarea. Mirrors
   * the menu shortcuts wired in src-tauri/src/lib.rs plus in-app shortcuts
   * so a new user can discover what the keyboard can do without trawling
   * the menu bar.
   */
  import { shortcuts } from "$lib/shortcuts";

  interface Props {
    open: boolean;
    onClose: () => void;
  }
  let { open, onClose }: Props = $props();

  const sections = shortcuts;

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }
</script>

{#if open}
  <div
    class="cs-backdrop"
    role="dialog"
    aria-modal="true"
    aria-label="Keyboard shortcuts"
    tabindex="-1"
    onkeydown={onKeyDown}
  >
    <button
      class="cs-scrim"
      type="button"
      aria-label="Close cheatsheet"
      onclick={onClose}
    ></button>
    <div class="cs-panel">
      <header class="cs-header">
        <h2>Keyboard shortcuts</h2>
        <button type="button" class="cs-close" onclick={onClose} aria-label="Close">×</button>
      </header>
      <div class="cs-body">
        {#each sections as section (section.title)}
          <section class="cs-section">
            <h3>{section.title}</h3>
            <ul>
              {#each section.rows as row (row.keys + row.label)}
                <li>
                  <kbd>{row.keys}</kbd>
                  <span>{row.label}</span>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
      <footer class="cs-footer">
        Press <kbd>?</kbd> any time to bring this back.
      </footer>
    </div>
  </div>
{/if}

<style>
  .cs-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 2rem;
    animation: cs-fade 140ms ease-out both;
  }
  @keyframes cs-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .cs-scrim {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: color-mix(in srgb, currentColor 35%, transparent);
    backdrop-filter: blur(6px);
    cursor: default;
  }
  .cs-panel {
    position: relative;
    z-index: 1;
    width: min(640px, 100%);
    max-height: min(80vh, 720px);
    overflow: auto;
    background: var(--cs-bg, #fffbf3);
    color: inherit;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    box-shadow: 0 24px 60px rgb(0 0 0 / 30%);
    animation: cs-rise 180ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes cs-rise {
    from { opacity: 0; transform: translateY(8px) scale(0.985); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .cs-backdrop, .cs-panel { animation: none; }
  }
  :global(:root[data-theme='dark']) .cs-panel { background: #14160f; }
  :global(html.dark) .cs-panel { background: #14160f; }
  @media (prefers-color-scheme: dark) {
    .cs-panel { background: #14160f; }
  }
  .cs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem;
  }
  .cs-header h2 { margin: 0; font-size: 1.05rem; font-weight: 700; }
  .cs-close {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
  }
  .cs-close:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
  .cs-body {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem 1.25rem;
    padding: 0.5rem 1.25rem 1rem;
  }
  .cs-section h3 {
    margin: 0 0 0.4rem;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  .cs-section ul { list-style: none; margin: 0; padding: 0; }
  .cs-section li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.25rem 0;
    font-size: 0.85rem;
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
  .cs-footer {
    padding: 0.6rem 1.25rem;
    border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    font-size: 0.78rem;
    opacity: 0.75;
  }
</style>
