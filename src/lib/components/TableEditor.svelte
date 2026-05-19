<script lang="ts">
  /**
   * TableEditor — premium WYSIWYG cell-grid editor.
   *
   * Built around plain inputs (not contenteditable) so tab/arrow navigation
   * "just works" and cell content stays simple — markdown table cells can't
   * carry rich formatting anyway. The first row is the markdown table
   * header by convention; subsequent rows are the body.
   *
   * On Insert the grid is serialised to a markdown pipe table and handed
   * back to the parent via `onInsert`. The on-the-wire format is plain
   * markdown so it renders correctly in any client (web, Tauri, native).
   */

  interface Props {
    onInsert: (markdown: string) => void;
    onCancel: () => void;
  }

  let { onInsert, onCancel }: Props = $props();

  // 2x2 default — small enough to feel inviting, big enough to be useful.
  let grid = $state<string[][]>([
    ["", ""],
    ["", ""],
  ]);

  const rowCount = $derived(grid.length);
  const colCount = $derived(grid[0]?.length ?? 0);

  function addRow() {
    grid = [...grid, Array(colCount).fill("")];
  }

  function removeRow(rowIdx: number) {
    if (rowCount <= 1) return;
    grid = grid.filter((_, i) => i !== rowIdx);
  }

  function addCol() {
    grid = grid.map((row) => [...row, ""]);
  }

  function removeCol(colIdx: number) {
    if (colCount <= 1) return;
    grid = grid.map((row) => row.filter((_, i) => i !== colIdx));
  }

  function setCell(rowIdx: number, colIdx: number, value: string) {
    grid = grid.map((row, ri) =>
      ri === rowIdx ? row.map((cell, ci) => (ci === colIdx ? value : cell)) : row,
    );
  }

  // Pipe characters need escaping so they don't terminate the cell early.
  function escapeCell(value: string): string {
    return value.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
  }

  function serialize(): string {
    if (rowCount === 0 || colCount === 0) return "";
    const lines: string[] = [];
    // Header row.
    const header = grid[0].map((cell) => escapeCell(cell) || " ");
    lines.push(`| ${header.join(" | ")} |`);
    // Separator.
    lines.push(`|${" --- |".repeat(colCount)}`);
    // Body rows.
    for (let r = 1; r < rowCount; r += 1) {
      const row = grid[r].map((cell) => escapeCell(cell) || " ");
      lines.push(`| ${row.join(" | ")} |`);
    }
    return lines.join("\n");
  }

  function insertTable() {
    const markdown = serialize();
    if (markdown) onInsert(markdown);
  }
</script>

<div class="table-editor" role="dialog" aria-label="Insert a table">
  <div class="te-header">
    <strong>Insert table</strong>
    <span class="te-hint">First row is the header. Tab moves between cells.</span>
  </div>

  <div class="te-grid" style:grid-template-columns={`auto repeat(${colCount}, minmax(6rem, 1fr)) auto`}>
    <!-- Top-left corner -->
    <span aria-hidden="true"></span>
    <!-- Column headers (remove buttons) -->
    {#each Array(colCount) as _, colIdx (colIdx)}
      <button
        type="button"
        class="te-axis"
        aria-label={`Remove column ${colIdx + 1}`}
        title="Remove column"
        onclick={() => removeCol(colIdx)}
        disabled={colCount <= 1}
      >×</button>
    {/each}
    <button type="button" class="te-add" onclick={addCol} aria-label="Add column" title="Add column">+ col</button>

    <!-- Body rows -->
    {#each grid as row, rowIdx (rowIdx)}
      <button
        type="button"
        class="te-axis"
        aria-label={`Remove row ${rowIdx + 1}`}
        title="Remove row"
        onclick={() => removeRow(rowIdx)}
        disabled={rowCount <= 1}
      >×</button>
      {#each row as cell, colIdx (colIdx)}
        <input
          type="text"
          class="te-cell"
          class:te-header-cell={rowIdx === 0}
          value={cell}
          placeholder={rowIdx === 0 ? "Header" : ""}
          oninput={(e) => setCell(rowIdx, colIdx, e.currentTarget.value)}
        />
      {/each}
      <span aria-hidden="true"></span>
    {/each}

    <!-- Add-row button row -->
    <button type="button" class="te-add te-add-row" onclick={addRow} aria-label="Add row" title="Add row">+ row</button>
    {#each Array(colCount) as _, colIdx (colIdx)}
      <span aria-hidden="true"></span>
    {/each}
    <span aria-hidden="true"></span>
  </div>

  <div class="te-actions">
    <button type="button" class="te-cancel" onclick={onCancel}>Cancel</button>
    <button type="button" class="te-insert" onclick={insertTable}>Insert</button>
  </div>
</div>

<style>
  .table-editor {
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    border-radius: 10px;
    padding: 0.75rem;
    margin: 0 0.75rem 0.75rem;
    background: color-mix(in srgb, currentColor 5%, transparent);
  }
  .te-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .te-hint {
    font-size: 0.75rem;
    opacity: 0.65;
  }
  .te-grid {
    display: grid;
    gap: 0.25rem;
    align-items: center;
  }
  .te-cell {
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 6px;
    padding: 0.35rem 0.5rem;
    font: inherit;
    background: transparent;
    color: inherit;
    min-width: 0;
  }
  .te-cell:focus {
    outline: none;
    border-color: var(--ant-accent);
  }
  .te-header-cell {
    font-weight: 700;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }
  .te-axis {
    border: none;
    background: transparent;
    color: color-mix(in srgb, currentColor 50%, transparent);
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    padding: 0.2rem 0.35rem;
    border-radius: 4px;
  }
  .te-axis:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 10%, transparent);
    color: var(--ant-danger);
  }
  .te-axis:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .te-add {
    grid-column: span 1;
    border: 1px dashed color-mix(in srgb, currentColor 25%, transparent);
    border-radius: 6px;
    padding: 0.2rem 0.4rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 0.75rem;
  }
  .te-add:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
  .te-add-row { grid-column: 1; }
  .te-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
  .te-cancel, .te-insert {
    border-radius: 8px;
    padding: 0.4rem 0.9rem;
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-weight: 600;
  }
  .te-insert {
    background: var(--ant-accent);
    color: white;
    border-color: var(--ant-accent);
  }
  .te-insert:hover { background: var(--ant-accent-strong); }
  .te-cancel:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
</style>
