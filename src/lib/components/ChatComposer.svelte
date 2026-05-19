<script lang="ts">
  import TableEditor from "./TableEditor.svelte";

  interface Props {
    onSend: (text: string) => void;
    /**
     * Native-paid edit affordance (#76). When provided, pressing ↑ in an
     * empty composer pulls the operator's last editable message into the
     * textarea and switches the composer to edit mode; submit then calls
     * this instead of onSend. Pass `undefined` to disable.
     */
    onEditLast?: () => { id: string; body: string } | null;
    onEditSubmit?: (id: string, body: string) => Promise<void> | void;
    disabled?: boolean;
  }
  let { onSend, onEditLast, onEditSubmit, disabled = false }: Props = $props();

  let text = $state("");
  let showTableEditor = $state(false);
  let editingId = $state<string | null>(null);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    if (editingId && onEditSubmit) {
      const id = editingId;
      // Resolve before clearing so a failure leaves state recoverable.
      const body = trimmed;
      editingId = null;
      text = "";
      void onEditSubmit(id, body);
      return;
    }
    onSend(trimmed);
    text = "";
  }

  function cancelEdit() {
    if (!editingId) return;
    editingId = null;
    text = "";
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }
    // ↑ in empty composer enters edit-last mode (#76 native-paid).
    if (e.key === "ArrowUp" && !editingId && text.length === 0 && onEditLast) {
      const last = onEditLast();
      if (last) {
        e.preventDefault();
        editingId = last.id;
        text = last.body;
      }
      return;
    }
    if (e.key === "Escape" && editingId) {
      e.preventDefault();
      cancelEdit();
    }
  }

  function insertTable(markdown: string) {
    // Insert with surrounding blank lines so the markdown table renders
    // as its own block even when the textarea already has text.
    const sep = text.length > 0 && !text.endsWith("\n") ? "\n\n" : "";
    text = `${text}${sep}${markdown}\n`;
    showTableEditor = false;
  }
</script>

<div class="composer-shell">
  {#if editingId}
    <div class="edit-badge">
      Editing your last message — Esc cancels
      <button type="button" class="edit-cancel" onclick={cancelEdit}>Cancel</button>
    </div>
  {/if}
  {#if showTableEditor}
    <TableEditor onInsert={insertTable} onCancel={() => (showTableEditor = false)} />
  {/if}
  <div class="composer" class:editing={!!editingId}>
    <textarea
      bind:value={text}
      onkeydown={onKeyDown}
      placeholder={editingId
        ? "Edit your message…"
        : disabled
        ? "Connect to a room to chat..."
        : "Type a message…  (↑ to edit your last)"}
      rows={2}
      {disabled}
    ></textarea>
    <div class="composer-actions">
      <button
        type="button"
        class="action-btn"
        title="Insert table"
        aria-label="Insert table"
        onclick={() => (showTableEditor = !showTableEditor)}
        {disabled}
      >▦</button>
      <button class="send-btn" onclick={submit} disabled={disabled || !text.trim()}>
        {editingId ? "Save" : "Send"}
      </button>
    </div>
  </div>
</div>

<style>
  .composer-shell {
    display: flex;
    flex-direction: column;
  }
  .composer {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
  }
  textarea {
    flex: 1;
    resize: none;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    padding: 0.5rem 0.75rem;
    font: inherit;
    background: transparent;
    color: inherit;
  }
  textarea:focus {
    outline: none;
    border-color: var(--ant-accent);
  }
  .composer-actions {
    display: flex;
    align-items: flex-end;
    gap: 0.4rem;
  }
  .action-btn {
    padding: 0.5rem 0.7rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
  .action-btn:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }
  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .send-btn {
    padding: 0.5rem 1rem;
    border-radius: 10px;
    border: none;
    background: var(--ant-accent);
    color: white;
    font-weight: 600;
    cursor: pointer;
  }
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .send-btn:not(:disabled):hover {
    background: var(--ant-accent-strong);
  }
  .composer.editing textarea {
    border-color: var(--ant-warn);
    background: color-mix(in srgb, var(--ant-warn) 6%, transparent);
  }
  .edit-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.4rem 0.85rem;
    margin: 0.5rem 0.75rem 0;
    border-radius: 8px;
    background: color-mix(in srgb, var(--ant-warn) 15%, transparent);
    color: #92400e;
    font-size: 0.78rem;
    font-weight: 600;
  }
  .edit-cancel {
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    padding: 0;
  }
  @media (prefers-color-scheme: dark) {
    .edit-badge { color: #fbbf24; }
  }
</style>
