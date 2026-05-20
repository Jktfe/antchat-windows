<script lang="ts">
  import { goto } from "$app/navigation";
  import { auth } from "$lib/stores/auth.svelte";
  import LoginForm from "$lib/components/LoginForm.svelte";

  function onSuccess() {
    void goto("/");
  }
</script>

<svelte:head>
  <title>Sign in — Antchat</title>
</svelte:head>

<div class="login-page">
  <LoginForm {onSuccess} />
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: var(--space-6, 2rem);
    background: var(--bg, #f7f5ef);
  }
</style>
