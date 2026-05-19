# Web → Tauri component map (wta-04 draft)

**Author**: @evolveanttauri (distribution lane, lifting from Mac antchat audits).
**Status**: scaffold-draft — implementer (TBD) fills in component-by-component
diffs as the lift proceeds. Each row gates on the @evolveantswift Mac client
reference + the room-tools shape audit's 5 native gotchas.

## Source mapping

| Source (`Jktfe/a-nice-terminal/src`) | Target (this repo `src`) | Notes |
|---|---|---|
| `routes/rooms/+page.svelte` | `routes/+page.svelte` | Top-level rooms list. Direct lift; replace any `window.location.href` deep-links with Tauri `invoke('open_room', {roomId})` if we want native window control. |
| `routes/rooms/[roomId]/+page.svelte` | `routes/room/[roomId]/+page.svelte` | Main room view. Composer + messages + SSE. Largest single component. |
| `lib/components/CreateChatRoomForm.svelte` | `lib/components/CreateChatRoomForm.svelte` | Direct lift — pure UI + `/api/chat-rooms` POST. |
| `lib/components/InviteAgentForm.svelte` | `lib/components/InviteAgentForm.svelte` | Lifts as-is. Note the `placeholder="@evolveantclaude"` cosmetic default per F10 trace (msg_0zhuixdhwa) — keep convention. |
| `lib/components/LocalInviteForm.svelte` | `lib/components/LocalInviteForm.svelte` | Source-of-truth picker. `onMount` fetches `/api/terminals/handles` per JWPK PICKER-SAME-SET. |
| Auth — cookie-based browser-session | Bearer token via `POST /api/auth/login` + Windows Credential Manager | New surface. See wta-03. |

## Tauri IPC bridge points

These are the ONLY places that need Rust commands in `src-tauri/src/` —
everything else is straight Svelte calling `fetch()` to the v4 server.

| Function | Rust command | Reason |
|---|---|---|
| Store/retrieve antchat Bearer token | `secure_token_set / secure_token_get / secure_token_delete` | Use Windows Credential Manager (via the `wincred` crate or `tauri-plugin-stronghold`); mirror Mac Keychain pattern. |
| Open `ant://` deep links from system → app | Tauri `tauri-plugin-deep-link` handler | Already wired in `tauri.conf.json` plugins block. |
| File picker for attachments upload | `tauri-plugin-dialog` (built-in) | Used by the attachments panel. |
| Start-menu shortcut creation | NSIS installer config (no runtime code) | Handled in `bundle.windows.nsis`. |
| Window decorations / native chrome | Already in `tauri.conf.json` `app.windows[0]` | Title-bar overlay + hidden title matches Mac. |

## Endpoints the Svelte side consumes

Lifted verbatim from `ObsidiANT/audits/mac-client-endpoint-drift-2026-05-19.md`
— Windows client codes against the FIXED shapes (D3 cleared, D2/D4 hide in dev tier).

### Auth (Bearer flow)
- `POST /api/auth/login` { email, password, license } → { token, user, expiresAt }
- `GET /api/auth/me` → user record
- `POST /api/auth/logout` → ack
- `POST /api/auth/rotate-password` { tempToken, newPassword } → ack

### Rooms
- `GET /api/chat-rooms` → `{ chatRooms: [...] }`
- `POST /api/chat-rooms` { name, whoCreatedIt } → 201 `{ chatRoom: {...} }`
- `GET /api/chat-rooms/:roomId/messages?limit=N` → `{ messages: [...] }`
- `POST /api/chat-rooms/:roomId/messages` { body, clientAuthorHandle, kind } → message row
- `GET /api/realtime/:roomId/events` (SSE) → live message stream

### Room Tools panel (9 sections wirable today, 2 stubbed)
**Bake the 5 native gotchas in upfront** — don't re-litigate during impl:
1. **Attachments**: response key is `sharedFiles`, NOT `attachments`. Decode as `{ sharedFiles: SharedFile[] }`.
2. **Links**: split shape `{ outgoing: [], incoming: [] }` — sum both for count.
3. **Interviews**: split shape `{ active: null|{}, recent: [] }` — `.recent.count` + 🔴 badge if `active != nil`.
4. **Participants**: 404 today (tauri F7 server-side scope). Stub with spinner; wire when codex's SSE participants endpoint ships.
5. **Memory-recall**: requires `query=` param (400 without). Lazy-load on expand + inline search box; no upfront count.

### Drift to AVOID calling
- `/api/remote-invites/*` (D2): 404 surface. Hide remote-invite UI in dev tier.
- `/api/license/refresh` (D3): **now live** via @antchatdev's `ant@eb74dd4` server stub — wire as live affordance.
- `/api/checkout/create-session` (D4): 404. Hide Upgrade CTA in dev tier.

## Open implementer questions

1. Use `tauri-plugin-stronghold` for token storage, OR raw `wincred` Rust crate, OR `tauri-plugin-store` with the encryption layer? Recommend `wincred` for direct Credential Manager parity with Mac Keychain; `stronghold` is overkill for a single-token surface.
2. SSE in Tauri webview — `EventSource` polyfill needed, or does Tauri 2's webview support natively? (Modern WebView2 on Windows 10/11 supports `EventSource` natively — likely fine.)
3. Window state restoration across launches — store last-active-room + window position in `tauri-plugin-store`?

## Estimated effort breakdown

Once an implementer is assigned:
- **wta-02 (api-types lift)**: already done in wta-01 (lifted as part of the fork). Mark closeable.
- **wta-03 (Bearer auth wire)**: ~½ day — Rust command for keychain + Svelte login form + token persistence. Smoke: token survives app restart (F3 client) + server kickstart (O1 already cleared).
- **wta-04 (component lift, all panels)**: ~1.5-2 days — copy ~12 Svelte components from v4 web + adapt for Tauri webview. Most expensive single chunk.
- **wta-09 (first cargo tauri build)**: ~2-3 hours from scaffold to first `Antchat.exe` artifact in `src-tauri/target/release/`.
- **wta-07 (install test)**: gates on wta-09 + first Release Windows workflow run + scoop-bump PR merged into bucket.
