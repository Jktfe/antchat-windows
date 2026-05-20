<script lang="ts">
  /**
   * wta-11 — single-click install of the antchat MCP server config into
   * Claude Desktop's `%APPDATA%\Claude\claude_desktop_config.json`.
   *
   * Calls the Rust command `mcp_install_claude_desktop_config` defined in
   * src-tauri/src/lib.rs which does a non-destructive merge (preserves
   * other MCP server entries, only adds/updates the `antchat` entry).
   *
   * After successful install, Claude Desktop on the same machine — once
   * restarted — sees the antchat MCP tools and can call `ant_post_message`,
   * `ant_list_rooms` etc. The visual half is this app; the agent half is
   * Claude Desktop. JWPK msg_qvxz2c761k describes the loop.
   */
  import { invoke } from "@tauri-apps/api/core";

  let status = $state<"idle" | "installing" | "success" | "error">("idle");
  let configPath = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  async function install() {
    status = "installing";
    configPath = null;
    errorMessage = null;
    try {
      configPath = await invoke<string>("mcp_install_claude_desktop_config");
      status = "success";
    } catch (e) {
      errorMessage = String(e);
      status = "error";
    }
  }
</script>

<div class="mcp-install">
  <h3>Claude Desktop integration</h3>
  <p>
    Install the antchat MCP server config so Claude Desktop can post into your
    rooms as your agent. Claude Desktop must be restarted after install.
  </p>
  <button type="button" onclick={install} disabled={status === "installing"}>
    {#if status === "installing"}
      Installing…
    {:else if status === "success"}
      Re-install
    {:else}
      Install antchat MCP for Claude Desktop
    {/if}
  </button>

  {#if status === "success" && configPath}
    <p class="mcp-success">
      ✓ Config written to <code>{configPath}</code>. Restart Claude Desktop to pick up the change.
    </p>
  {/if}
  {#if status === "error" && errorMessage}
    <p class="mcp-error">Install failed: {errorMessage}</p>
  {/if}
</div>

<style>
  .mcp-install {
    padding: var(--space-4, 1rem);
    background: var(--panel, #fff);
    border: 1px solid var(--surface-edge, #e8e4d9);
    border-radius: var(--radius-md, 0.65rem);
  }
  h3 {
    margin: 0 0 0.4rem;
    font-weight: var(--weight-body-strong, 600);
  }
  p {
    margin: 0.4rem 0;
    font-size: 0.9rem;
    color: var(--ink-soft, #5c6275);
  }
  button {
    padding: 0.5rem 0.85rem;
    font-weight: var(--weight-body-strong, 600);
    color: var(--panel, #fff);
    background: var(--accent, #ff3d5a);
    border: none;
    border-radius: var(--radius-sm, 0.4rem);
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
  .mcp-success { color: var(--ok, #2c7a4b); }
  .mcp-error { color: var(--accent, #ff3d5a); }
  code { font-family: var(--font-mono); font-size: 0.85rem; }
</style>
