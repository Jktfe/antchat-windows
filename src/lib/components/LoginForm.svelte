<script lang="ts">
  /**
   * Login form — email + password + dev licence code → Bearer token.
   *
   * License format: NEW-MODEL-ANT-DEV-<your-email>. Suggests the literal
   * by auto-filling from the typed email so the user only has to enter
   * the first half plus pick (or accept) the licence prefix.
   *
   * On success the auth store persists token + user record. Routing back
   * to / happens in the parent (login page or layout effect).
   */
  import { auth } from "$lib/stores/auth.svelte";

  let { onSuccess }: { onSuccess?: () => void } = $props();

  let email = $state("");
  let password = $state("");
  let licenseOverride = $state("");

  const derivedLicense = $derived(
    licenseOverride.trim().length > 0
      ? licenseOverride.trim()
      : email.trim().length > 0
        ? `NEW-MODEL-ANT-DEV-${email.trim().toLowerCase()}`
        : "",
  );

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !derivedLicense) return;
    try {
      await auth.login(email.trim(), password, derivedLicense);
      onSuccess?.();
    } catch {
      /* error already on auth.loginError; form stays open */
    }
  }
</script>

<form onsubmit={submit} class="login-form" autocomplete="on">
  <h1 class="login-heading">Sign in to Antchat</h1>
  <p class="login-subtitle">Native Windows client for ANT v4.</p>

  <label class="login-label">
    <span>Email</span>
    <input
      type="email"
      autocomplete="email"
      bind:value={email}
      placeholder="you@newmodel.vc"
      required
      disabled={auth.loginPending}
    />
  </label>

  <label class="login-label">
    <span>Password</span>
    <input
      type="password"
      autocomplete="current-password"
      bind:value={password}
      required
      disabled={auth.loginPending}
    />
  </label>

  <details class="login-license">
    <summary>Licence code <code>{derivedLicense || "—"}</code></summary>
    <p class="login-hint">
      Auto-derived from your email. Override only if your licence prefix is non-standard.
    </p>
    <input
      type="text"
      bind:value={licenseOverride}
      placeholder="NEW-MODEL-ANT-DEV-someone-else@..."
      disabled={auth.loginPending}
    />
  </details>

  {#if auth.loginError}
    <p class="login-error" role="alert">{auth.loginError}</p>
  {/if}

  <button type="submit" class="login-submit" disabled={auth.loginPending}>
    {auth.loginPending ? "Signing in…" : "Sign in"}
  </button>
</form>

<style>
  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 1rem);
    max-width: 360px;
    padding: var(--space-6, 2rem);
    background: var(--panel, #fff);
    border: 1px solid var(--surface-edge, #e8e4d9);
    border-radius: var(--radius-lg, 1rem);
    box-shadow: var(--shadow-card, 0 4px 12px rgba(10, 16, 34, 0.06));
    font-family: var(--font-body, "Inter", system-ui, sans-serif);
  }
  .login-heading {
    margin: 0;
    font-family: var(--font-display);
    font-weight: var(--weight-display, 850);
    color: var(--ink-strong, #0a1022);
    letter-spacing: -0.01em;
  }
  .login-subtitle {
    margin: 0;
    color: var(--ink-soft, #5c6275);
    font-size: 0.95rem;
  }
  .login-label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 0.25rem);
    font-weight: var(--weight-body-strong, 600);
  }
  .login-label input {
    padding: 0.6rem 0.85rem;
    font: inherit;
    font-weight: var(--weight-body, 500);
    border: 1px solid var(--surface-edge, #e8e4d9);
    border-radius: var(--radius-md, 0.65rem);
    background: var(--bg, #f7f5ef);
  }
  .login-label input:focus {
    outline: 2px solid var(--accent, #ff3d5a);
    outline-offset: 1px;
  }
  .login-license summary {
    cursor: pointer;
    font-weight: var(--weight-body-strong, 600);
    color: var(--ink-soft, #5c6275);
    font-size: 0.9rem;
  }
  .login-license code {
    font-family: var(--font-mono, monospace);
    color: var(--accent, #ff3d5a);
  }
  .login-hint {
    margin: 0.6rem 0 0.4rem;
    font-size: 0.85rem;
    color: var(--ink-soft, #5c6275);
  }
  .login-license input {
    width: 100%;
    padding: 0.5rem 0.7rem;
    font: inherit;
    border: 1px solid var(--surface-edge, #e8e4d9);
    border-radius: var(--radius-sm, 0.4rem);
  }
  .login-error {
    margin: 0;
    padding: 0.6rem 0.85rem;
    color: var(--accent, #ff3d5a);
    background: var(--accent-soft, #ffeaee);
    border-radius: var(--radius-md, 0.65rem);
    font-size: 0.9rem;
  }
  .login-submit {
    padding: 0.7rem 1.1rem;
    font: inherit;
    font-weight: var(--weight-body-strong, 600);
    color: var(--panel, #fff);
    background: var(--accent, #ff3d5a);
    border: none;
    border-radius: var(--radius-md, 0.65rem);
    cursor: pointer;
  }
  .login-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
