# Antchat for Windows

Native Windows client for [ANT](https://github.com/Jktfe/a-nice-terminal) v4 chat rooms + terminals. Built with Tauri 2 + Svelte 5 + Bun + Vite.

**Companion to** [`Jktfe/antchat`](https://github.com/Jktfe/antchat) (native macOS) — both apps speak to the same v4 server (`http://localhost:6174` for dev, Tailscale funnel for remote).

## Install

Via Scoop (recommended — bypasses Windows SmartScreen automatically):

```powershell
scoop bucket add antchat https://github.com/Jktfe/scoop-antchat
scoop install antchat-app
```

Direct `.exe` download from [GitHub Releases](https://github.com/Jktfe/antchat-windows/releases) also works, but Windows SmartScreen will show an "Unrecognized app" warning on first launch (the binaries are not Authenticode-signed — see [Distribution](#distribution) below).

## Login

You'll need a dev-tier licence code. Format:

```
NEW-MODEL-ANT-DEV-<your-email>
```

Together with your email + password, the app stores a 7-day token in Windows Credential Manager. Same token survives both app restart (client-side persistence) and v4 server restart (server-side SQLite store).

## What's in the app

- **Multi-room chat** — every ANT v4 chatroom you're a member of, with live message updates over SSE.
- **Composer + reactions** — same UX as the v4 web frontend.
- **Room Tools panel** — 9 of 11 sections live (Plans, Tasks, Asks, Focus mode, Linked rooms, Interviews, Artefacts, Screenshots, Attachments); Participants + Room memory stubbed pending dedicated server endpoints.
- **`ant://` deep links** — system-level handler joins you into the right room.

## Distribution

**Unsigned NSIS installer**, deliberately. The decision (`JWPK msg_mtpqhnd0bx`):

> "no I'm not buying a signing certificate, we got a scoop repo working previously; can we use something similar?"

Scoop verifies via SHA256 manifest hash, not certificate validation — so installation via `scoop install antchat-app` runs in Scoop's install context and doesn't trigger SmartScreen. Users who download the `.exe` directly will see the "Unrecognized app" prompt; clicking "More info → Run anyway" lets them through.

Reputation builds slowly as more users run the unsigned binary; SmartScreen warnings fade over time. If broader public distribution becomes a priority, an EV Authenticode cert (~£300/yr) would close the gap immediately. Until then: Scoop is the path.

## Architecture

```
┌─────────────────────┐    SSE + REST    ┌─────────────────────┐
│  Antchat.exe        │  <──────────>   │   v4 server          │
│  (Tauri webview)    │                  │   (rooms+DB+SSE)    │
└─────────────────────┘                  └─────────────────────┘
        │ Tauri IPC                                ▲
        ▼                                          │ ant CLI
┌─────────────────────┐                            │
│  Rust commands      │                            │
│  - keychain         │                  ┌─────────────────────┐
│  - deep links       │                  │  Claude Desktop /    │
│  - file picker      │                  │  Codex / etc        │
└─────────────────────┘                  │  (via ant-mcp)      │
                                          └─────────────────────┘
```

- **Visual half**: Antchat.exe shows live room state from v4 server's SSE stream.
- **Agent half**: Claude Desktop / Codex / any LLM desktop with an MCP-server config can post into rooms via the `ant-mcp` server (slice MCP-1..5 in main `antchat` plan). The Mac user watches their agents work in real time in the Antchat window.

This is the experience JWPK described in `msg_qvxz2c761k`: "Mark or James... see a visual update of what was happening, as well as their agents, Claude Desktop / Codex / whatever, being able to interact with the MCP in the CLI."

## Development

```powershell
bun install
bun run tauri dev      # launch in dev mode
bun run tauri build    # produce NSIS installer at src-tauri/target/release/bundle/nsis/
```

Requires Rust toolchain (`rustup default stable`) + Visual Studio Build Tools (C++ workload).

## Release pipeline

1. Bump version in `package.json` + `src-tauri/Cargo.toml` + `src-tauri/tauri.conf.json`.
2. `git tag v<version> && git push --tags`.
3. `.github/workflows/release-windows.yml` builds the NSIS `.exe`, publishes a GitHub Release with the binary + SHA256 in step summary.
4. `.github/workflows/scoop-bump.yml` fires on successful release completion, re-hashes the asset (ground-truth verify), opens an auto-PR against `Jktfe/scoop-antchat` to bump `bucket/antchat-app.json`.
5. Merge the auto-PR → users get the new version on next `scoop update antchat-app`.

End-to-end auto-flow mirrors the Mac side (`Jktfe/antchat` → `Jktfe/homebrew-antchat`). Required secrets:
- `HOMEBREW_TAP_GITHUB_TOKEN` — fine-grained PAT scoped to `Jktfe/scoop-antchat` (Contents:write + Pull requests:write).

## License

MIT — see [`shared/api-types.ts`](shared/api-types.ts) header for the v4 server contract this client codes against.

## Provenance

This repo was forked from `Jktfe/ant-native/macos` (private, dormant) on 2026-05-19 as wta-01 of the `windows-tauri-antchat-2026-05-19` ANT plan. See [ORIGIN.md](ORIGIN.md) for full lineage.
