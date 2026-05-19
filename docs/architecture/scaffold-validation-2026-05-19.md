# wta-09 — Tauri v2 scaffold validation (2026-05-19)

Quick static-validation pass against `src-tauri/` + `package.json` to confirm
the lifted scaffold is Tauri 2.x + Windows-buildable in principle. Full
`cargo tauri build` deferred to an actual Windows runner.

## Verified

- ✅ **Tauri 2 schema**: `src-tauri/tauri.conf.json` declares `"$schema": "https://schema.tauri.app/config/2"`.
- ✅ **Windows bundle target**: `bundle.targets = ["nsis"]` (set in commit `099adef`).
- ✅ **Windows identifier**: `com.newmodelvc.antchat.windows` (set in commit `099adef`).
- ✅ **NSIS config block**: installerIcon, installMode=currentUser, English language list — set in commit `099adef`.
- ✅ **Removed Mac-only fields**: `bundle.macOS` deleted (it'd be ignored by the Windows build but the block referenced a Mac signing identity → confusing).
- ✅ **Deep-link scheme**: `plugins.deep-link.desktop.schemes = ["ant"]` preserved from Mac scaffold.
- ✅ **Webview entrypoint**: `build.devUrl = http://localhost:1420`, `build.frontendDist = "../build"` — standard SvelteKit + Vite pattern.
- ✅ **package.json**: scripts include `tauri dev`, `tauri build`, `dev` (Vite), `build` (SvelteKit static adapter assumed).

## Open gaps (need a Windows runner OR Rust expert to clear)

- ⚠️ **`cargo check` not run** — needs Rust toolchain. On the Windows runner (GHA `windows-latest`) `tauri-action@v0` will run `cargo build --release` end-to-end on first release tag; that's the real validation.
- ⚠️ **Icons**: `bundle.icon` references `icons/icon.icns` (Mac) — `.ico` is included so NSIS will use the right icon, but the `.icns` entry will be ignored on Windows. Cleanup task: remove `.icns` from the icon array, drop `icons/icon.icns` from the repo. Backlog.
- ⚠️ **Capabilities** (`src-tauri/capabilities/`): inherited from Mac scaffold; may need Windows-specific permission grants for Credential Manager access. Implementer call.

## Action items for the Rust implementer (wta-03)

1. Add `wincred` (or equivalent) Rust crate to `Cargo.toml` for Credential Manager IPC.
2. Add three Rust commands: `secure_token_set`, `secure_token_get`, `secure_token_delete`.
3. Wire `tauri-plugin-deep-link` handler in `lib.rs` to forward `ant://` URLs into the Svelte side.
4. First `bun run tauri build` should produce `src-tauri/target/release/bundle/nsis/Antchat_0.1.0_x64-setup.exe` (matches the path `scoop-bump.yml` expects).

## Conclusion

Scaffold is Tauri-2-shape-correct + Windows-targeted. Real build validation
happens on first `release-windows.yml` workflow run via tag push.
