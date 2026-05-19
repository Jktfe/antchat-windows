<script lang="ts">
  import type { ChatMessage, RoomMember } from "$shared/api-types";
  import { renderMarkdown } from "$lib/markdown";
  import { relativeTime } from "$lib/time";
  interface Props {
    message: ChatMessage;
    member?: RoomMember;
    /** Caller's own handle; controls whether the delete affordance shows. */
    selfHandle?: string;
    /** Click-handler for the delete pill. Pass `undefined` to hide. */
    onDelete?: (messageId: string) => void;
  }
  let { message, member, selfHandle, onDelete }: Props = $props();

  const isAgent = $derived(message.kind === "agent");
  const isSystem = $derived(message.kind === "system" || message.kind === "system-break");
  const isDeleted = $derived(typeof message.deletedAtMs === "number");
  const isEdited = $derived(!isDeleted && typeof message.editedAtMs === "number");
  const isOwn = $derived(!!selfHandle && message.authorHandle === selfHandle);
  const time = $derived(new Date(message.postedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const rel = $derived(relativeTime(message.postedAt));
  // Deleted messages render as a tombstone, not as the (now-empty) body.
  const html = $derived(isDeleted ? "" : renderMarkdown(message.body));

  // Provenance tooltips: hover the "edited" badge or the tombstone to see
  // when the change happened. Relative + full datetime both, so casual
  // glance and forensic check both work.
  const editedTooltip = $derived(
    message.editedAtMs
      ? `Edited ${relativeTime(new Date(message.editedAtMs).toISOString())} — ${new Date(message.editedAtMs).toLocaleString()}`
      : "",
  );
  const deletedTooltip = $derived(
    message.deletedAtMs
      ? `Removed ${relativeTime(new Date(message.deletedAtMs).toISOString())} — ${new Date(message.deletedAtMs).toLocaleString()}`
      : "",
  );

  // Per-room participant identity (Fix 5). When the server has set displayColor
  // for this member, use it for the left accent + handle. displayBackgroundStyle
  // 'card' = subtle tint of accent, 'transparent' = no row background.
  const accent = $derived(member?.displayColor ?? null);
  const bgStyle = $derived(member?.displayBackgroundStyle ?? null);
  const rowStyle = $derived(
    accent
      ? `border-left-color: ${accent};${bgStyle === "card" ? ` background: color-mix(in srgb, ${accent} 8%, transparent);` : bgStyle === "transparent" ? " background: transparent;" : ""}`
      : "",
  );
  const handleStyle = $derived(accent ? `color: ${accent};` : "");
</script>

<div
  class="message-row"
  class:agent={isAgent}
  class:system={isSystem}
  class:keyed={!!accent}
  class:deleted={isDeleted}
  style={rowStyle}
>
  <div class="meta">
    <span class="handle" class:agent={isAgent} style={handleStyle}>{message.authorDisplayName || message.authorHandle}</span>
    <span class="time" title={new Date(message.postedAt).toLocaleString()}>{time} · {rel}</span>
    {#if isEdited}
      <span class="edited" title={editedTooltip}>edited</span>
    {/if}
    {#if isOwn && !isDeleted && onDelete}
      <button
        type="button"
        class="row-action"
        title="Delete message"
        aria-label="Delete message"
        onclick={() => onDelete?.(message.id)}
      >Delete</button>
    {/if}
  </div>
  {#if isDeleted}
    <div class="body tombstone" title={deletedTooltip}>Message removed{message.deletedByHandle ? ` by ${message.deletedByHandle}` : ""}.</div>
  {:else}
    <div class="body">{@html html}</div>
  {/if}
</div>

<style>
  .message-row {
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    margin-bottom: 0.35rem;
    background: color-mix(in srgb, currentColor 4%, transparent);
    animation: row-in 180ms ease-out both;
  }
  @keyframes row-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .message-row { animation: none; }
  }
  .message-row.agent {
    background: color-mix(in srgb, currentColor 7%, transparent);
    border-left: 3px solid var(--ant-accent);
  }
  /* Per-room participant identity (Fix 5) supplies the left accent color
     inline; the class ensures a non-agent message also gets the 3px stripe
     when displayColor is set, and overrides the fallback agent blue. */
  .message-row.keyed {
    border-left: 3px solid transparent;
  }
  .message-row.system {
    opacity: 0.7;
    font-size: 0.85rem;
    background: transparent;
  }
  .meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.25rem;
  }
  .edited {
    font-size: 0.65rem;
    opacity: 0.55;
    font-style: italic;
  }
  .row-action {
    margin-left: auto;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.7rem;
    font-weight: 600;
    opacity: 0;
    transition: opacity 120ms ease, background 120ms ease;
  }
  .message-row:hover .row-action,
  .row-action:focus-visible {
    opacity: 0.85;
  }
  .row-action:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--ant-danger) 18%, transparent);
    color: var(--ant-danger);
    border-color: color-mix(in srgb, var(--ant-danger) 35%, transparent);
  }
  .message-row.deleted {
    opacity: 0.65;
  }
  .body.tombstone {
    font-style: italic;
    opacity: 0.65;
    font-size: 0.85rem;
  }
  .handle {
    font-weight: 600;
    font-size: 0.8rem;
  }
  .handle.agent {
    color: var(--ant-accent);
  }
  .time {
    font-size: 0.7rem;
    opacity: 0.5;
  }
  .body {
    font-size: 0.9rem;
    line-height: 1.4;
    word-break: break-word;
  }
  .body :global(p) { margin: 0 0 0.35rem; }
  .body :global(p:last-child) { margin-bottom: 0; }
  .body :global(code) {
    font-family: "SF Mono", ui-monospace, monospace;
    font-size: 0.82rem;
    background: color-mix(in srgb, currentColor 12%, transparent);
    padding: 0.15rem 0.35rem;
    border-radius: 5px;
  }
  .body :global(pre) {
    background: color-mix(in srgb, currentColor 10%, transparent);
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.35rem 0;
  }
  .body :global(pre code) { background: none; padding: 0; }
  .body :global(table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.82rem;
    margin: 0.35rem 0;
  }
  .body :global(th), .body :global(td) {
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    padding: 0.35rem 0.6rem;
    text-align: left;
  }
  .body :global(th) {
    background: color-mix(in srgb, currentColor 10%, transparent);
    font-weight: 700;
  }
  .body :global(blockquote) {
    margin: 0.35rem 0;
    padding-left: 0.75rem;
    border-left: 3px solid color-mix(in srgb, currentColor 30%, transparent);
    opacity: 0.85;
  }
  .body :global(ul), .body :global(ol) {
    margin: 0.35rem 0;
    padding-left: 1.25rem;
  }
  .body :global(li) { margin: 0.15rem 0; }
  .body :global(a) { color: var(--ant-accent); text-decoration: none; }
  .body :global(a:hover) { text-decoration: underline; }
  .body :global(img) { max-width: 100%; border-radius: 8px; margin: 0.35rem 0; }
  /* Bracketed mentions ([@handle]) are informational-only per #152 — fan-out
     does not interrupt these agents, so render them muted. */
  .body :global(.mention-bracketed) {
    opacity: 0.6;
    font-size: 0.85em;
    font-style: italic;
  }
</style>
