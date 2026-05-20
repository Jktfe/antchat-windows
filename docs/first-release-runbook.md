# First Release Runbook — `v0.1.0`

**Purpose**: tag-and-release the very first Antchat Windows build so the end-to-end pipeline (CI build → GitHub Release → Scoop manifest bump → `scoop install antchat-app`) is validated live.

**Audience**: @you or whoever holds Jktfe-org repo write access.

**Pre-conditions** (all met as of `Jktfe/antchat-windows@5f540ba`):
- ✅ `release-windows.yml` workflow committed.
- ✅ `scoop-bump.yml` workflow committed.
- ✅ `Jktfe/scoop-antchat/bucket/antchat-app.json` stub committed (sentinel `v0.0.0`).
- ✅ `wta-03` Bearer auth wire shipped (`+layout.svelte` redirects to `/login` if unauthed).
- ✅ Tauri config Windows-ified (NSIS bundle target + identifier).
- ⚠️ `HOMEBREW_TAP_GITHUB_TOKEN` secret on `Jktfe/antchat-windows` — needed for the `scoop-bump.yml` workflow's cross-repo PR. **If absent, the release itself still succeeds; only the scoop-bump auto-PR fails. Manual scoop manifest bump remains an option.**

## Option A — Dry run first (recommended)

Workflow dispatch validates everything except the actual artifact upload.

```bash
gh workflow run release-windows.yml \
  -R Jktfe/antchat-windows \
  --ref main \
  -f version=0.1.0-dry
```

Then watch:
```bash
gh run list -R Jktfe/antchat-windows --limit 1
gh run watch -R Jktfe/antchat-windows
```

**Expected**:
- ✅ Setup steps (checkout, Node, Bun, version resolve).
- ✅ `bun install`.
- ⚠️ `Build Tauri (unsigned)` — first attempt may fail here. The Rust commands added in wta-11 (`mcp_install_claude_desktop_config`) reference `serde_json` (already in deps) but the function uses APIs the Rust compiler will verify. If it fails, fix-forward.
- ✅ Compute SHA256 + step summary.
- ✅ GitHub Release published as a draft (so dry-run doesn't pollute the public release feed; clean up via `gh release delete v0.1.0-dry`).

If the dry-run is green, proceed to Option B. If red, fix the build errors locally + re-push, then re-dispatch.

## Option B — Real release tag

```bash
cd /path/to/antchat-windows
git tag v0.1.0
git push --tags
```

This fires `release-windows.yml` against the new tag → GitHub Release → triggers `scoop-bump.yml` → opens a PR against `Jktfe/scoop-antchat/main` patching the manifest from `v0.0.0` to `v0.1.0`.

Watch:
```bash
gh run list -R Jktfe/antchat-windows --limit 3
gh pr list -R Jktfe/scoop-antchat
```

**Expected end-state**:
- `Jktfe/antchat-windows` Release `v0.1.0` with `Antchat_0.1.0_x64-setup.exe` + SHA256 in the step summary.
- `Jktfe/scoop-antchat` open PR titled `antchat-app 0.1.0`, manifest patched.

Merge the PR. Then on a Windows machine:
```powershell
scoop bucket add antchat https://github.com/Jktfe/scoop-antchat
scoop install antchat-app
```

Should download + verify hash + install.

## Rollback

If anything goes wrong:
- `gh release delete v0.1.0 -R Jktfe/antchat-windows` — removes the Release.
- `git push --delete origin v0.1.0` — removes the tag.
- Close the scoop-bump PR unmerged.
- Manifest stays at `v0.0.0` sentinel; no users affected (none installed yet).

## After successful first release

- Close `wta-08` smoke matrix row once @evolveantux runs the 16 cells against the live install (per `docs/install-test-runbook.md`).
- Update README badges (build status, latest release).
- Bump to `v0.1.1` for follow-up tag-and-release as features land.
