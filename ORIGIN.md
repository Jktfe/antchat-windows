# antchat-windows origin

Forked 2026-05-19 from `Jktfe/ant-native/macos` (private) by @evolveanttauri
as wta-01 of the `windows-tauri-antchat-2026-05-19` ANT plan.

**Base**: `Jktfe/ant-native/macos` was the original Tauri 2 + Svelte 5 + Bun + Vite
scaffold for the macOS antchat — dormant after the macOS sprint pivoted to
native SwiftUI (`Jktfe/antchat`). This repo lifts that scaffold + targets
Windows distribution via Scoop.

**Distribution**: Scoop only, **unsigned** binaries (no Authenticode cert per
JWPK msg_mtpqhnd0bx). Manifest will live at `Jktfe/scoop-antchat/bucket/antchat-app.json`.

**Shared types**: `shared/api-types.ts` lifted as-is. Manual-sync against
`Jktfe/ant-native/shared/` v1; promote to npm package if grows past ~150 LOC.

**Lane**: parity with Mac antchat (`Jktfe/antchat`) bakes in the 5 native
gotchas from `ObsidiANT/audits/room-tools-panel-shape-audit-2026-05-19.md`
upfront (sharedFiles key, links incoming+outgoing, interviews active+recent,
participants stub, memory-recall query param).

**Plan**: `windows-tauri-antchat-2026-05-19` — 8 rows at `/plans/windows-tauri-antchat-2026-05-19`.
