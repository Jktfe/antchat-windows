# ANT Chat — macOS desktop client

Native macOS Tauri v2 client for the ANT v4 server. Companion to the iOS app in `../ios/`. Both consume the shared API contract in `../shared/api-types.ts` — see kimi's gatekeep rule before editing.

## Stack

| Layer | Tech |
|---|---|
| Shell | [Tauri v2](https://v2.tauri.app/) (Rust) |
| Frontend | [Svelte 5](https://svelte.dev) + [SvelteKit 2](https://svelte.dev/docs/kit/) (adapter-static, SPA mode) |
| Build | [Vite 6](https://vite.dev) + [Bun](https://bun.sh) |
| Plugins | `tauri-plugin-deep-link`, `tauri-plugin-positioner`, `tauri-plugin-window-state`, `tauri-plugin-opener` |

## Platform-moat surfaces wired in this bootstrap

- **Menu-bar tray** — `TrayIconBuilder` (Tauri v2 core, `tray-icon` feature) with Open / Settings / Quit menu items and left-click popover toggle anchored via `tauri-plugin-positioner` to `Position::TrayCenter`.
- **ant:// deep-link** — registered in `tauri.conf.json` `plugins.deep-link.desktop.schemes`. The Rust handler emits a `deep-link://ant` Tauri event with the URL list; the frontend redeems via `/api/qr-tokens/redeem` (see `qr-pairing-flow-2026-05-16.md` §3).
- **Window state restore** — `tauri-plugin-window-state` persists size/position between launches (JWPK gate Q2 = yes).
- **Unified title bar** — `titleBarStyle: "Overlay"` + `hiddenTitle: true` (JWPK gate Q1 = unified).
- **Dock + menu bar both visible** — no `LSUIElement` override (JWPK gate Q4 = show both).
- **Capability negotiation** — `src/lib/api/capabilities.ts` hits `GET /api/capabilities` with 60s SWR cache, `Ant-Client-Version` header, single-flight de-dupe, typed against `$shared/api-types`.

## JWPK-gate ratifications applied

| # | Gate | Default | Applied |
|---|---|---|---|
| Q1 | Title bar | unified | `titleBarStyle: "Overlay"`, `hiddenTitle: true` |
| Q2 | Window restore | yes | `tauri-plugin-window-state` registered |
| Q3 | PTY shell | user `$SHELL` (fallback `/bin/zsh`) | runtime concern; lands with PTY bridge in next commit |
| Q4 | Menu bar mode | show both dock + tray | no `LSUIElement`; tray added |

## Deferred from this bootstrap

- **PTY bridge** — `portable-pty` + Tauri event streaming (see spec §6)
- **Keychain storage** — `kSecClassGenericPassword` for room bearer tokens (see spec §7)
- **macOS notifications + dock badge** (spec §9)
- **File drag-and-drop** (spec §10)
- **Sparkle auto-update** — `Check for Updates` button is a UI stub (kimi spec edit `8c77845`); working pipeline is Phase 2 (spec §11)
- **Room list / room view / composer** — UI surfaces land after the platform-moat skeleton is reviewed

## Local development

```bash
bun install                  # JS deps
bun run tauri dev            # Tauri dev (hot-reload Svelte + Rust)
bun run check                # svelte-check
cd src-tauri && cargo check  # Rust type-check
```

Default server URL is `http://localhost:6174` (v4 canonical `com.ant.fresh`). Override via `localStorage.setItem('ant.serverUrl', '…')` until the settings UI lands.

## Layout

```
macos/
├── src/                            # Svelte 5 frontend (SvelteKit SPA)
│   ├── app.html
│   ├── lib/
│   │   ├── api/capabilities.ts     # GET /api/capabilities with 60s SWR cache
│   │   ├── stores/
│   │   │   └── capabilities.svelte.ts  # $state-based store
│   │   └── server-config.ts        # default :6174, localStorage override
│   └── routes/+page.svelte         # tier badge + capability summary (placeholder UI)
├── src-tauri/                      # Rust core
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs                  # tray + deep-link + plugins + app_version cmd
│   │   └── main.rs
│   ├── capabilities/
│   ├── icons/
│   └── tauri.conf.json
├── svelte.config.js                # $shared alias → ../shared
├── vite.config.js
├── tsconfig.json
└── package.json
```

## Cross-lane coordination

- **shared/** — kimi gatekeeps. Do not commit there from this branch. Import via the `$shared` alias.
- **ios/** — swift's lane; the iOS Swift client mirrors the same `api-types.ts` shapes.
- Branch convention: `macos/<topic>`; PR back to `main`.
