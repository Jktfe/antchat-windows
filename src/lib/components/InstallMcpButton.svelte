<script lang="ts">
  /**
   * Honest placeholder for MCP integration.
   *
   * The prior implementation wrote a Claude Desktop config pointing at an
   * unpublished npm package. Keep the UI explicit until a real packaged MCP
   * server is shipped and testable.
   */
</script>

<div class="mcp-install">
  <h3>Claude Desktop integration</h3>
  <p>
    MCP registration is not active in this build. The Windows installer should
    use the shipped <code>ant</code> CLI and terminal router path; it must not
    write Claude Desktop config for an unpublished MCP package.
  </p>
  <button type="button" disabled>MCP installer pending packaged server</button>
  <p class="mcp-note">
    Current supported path: install via Scoop, verify <code>ant --version</code>,
    then run <code>ant router start</code> for terminal delivery.
  </p>
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
  .mcp-note { color: var(--ok, #2c7a4b); }
  code { font-family: var(--font-mono); font-size: 0.85rem; }
</style>
