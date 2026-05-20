# wta-07 — Install test runbook (Win10 + Win11 fresh VMs)

**Purpose**: Validate end-to-end that `scoop install antchat-app` produces a
working Antchat install on freshly-provisioned Windows machines.

**Prerequisites** (handled before this runbook can execute):
- wta-03 Bearer auth wire shipped + first build runs on `windows-latest` CI.
- First `release-windows.yml` run completed → GitHub Release v0.0.1 with NSIS `.exe` + sha256.
- First `scoop-bump.yml` run completed → PR merged into `Jktfe/scoop-antchat` updating `bucket/antchat-app.json` from sentinel `v0.0.0` to `v0.0.1`.

**VM setup**:
- 2 VMs needed: clean Windows 10 21H2+ and clean Windows 11 23H2+.
- Either via UTM/Parallels on JWPK's Mac OR via a hosted Windows runner.
- Both VMs should have:
  - Windows updates current.
  - SmartScreen + Defender at default settings (don't pre-disable; we want to observe the user-facing behaviour).

## Cell matrix (each VM)

For each of Win10 + Win11:

### Cell 1 — Cold install via Scoop

```powershell
# 1. Install Scoop (~1 min)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# 2. Add the antchat bucket
scoop bucket add antchat https://github.com/Jktfe/scoop-antchat

# 3. Install the Tauri app
scoop install antchat-app
```

**Expected**:
- Scoop downloads NSIS `.exe` from GitHub Releases.
- SHA256 verified against manifest hash.
- **No SmartScreen prompt** (Scoop runs install in its own context).
- `Antchat.exe` available on PATH; Start menu entry created.

**Capture**:
- Time from `scoop install` invocation to first launch ready.
- Any output warnings.
- Screenshot of the Start menu entry.

### Cell 2 — Cold launch

Double-click the Start-menu Antchat entry OR run `Antchat.exe` from PowerShell.

**Expected**:
- App window opens with the Direction C v3.3 visual (warm cream `#F7F5EF` background, red `#FF3D5A` accent).
- Login form visible (user is not yet authenticated; auth bootstrap effect routes to `/login`).
- No JS errors in the Tauri dev tools (open with F12 or via tray menu).

**Capture**:
- Time from double-click to login form rendered.
- Screenshot of login form.

### Cell 3 — First-time login

Enter:
- Email: `james@newmodel.vc` (or whichever team email is set in `dev-users.json`).
- Password: `ANT_DEMO_PASSWORD` from server's `~/.ant/secrets.env`.
- Licence: auto-derived (`NEW-MODEL-ANT-DEV-james@newmodel.vc`).

**Expected**:
- `POST /api/auth/login` → 200 with token + user.
- Auth store persists token + user to localStorage.
- App routes to `/` and shows the rooms list.
- SSE event stream connects to `/api/realtime/<room>/events` on room open.

**Capture**:
- Network tab screenshot showing `200 /api/auth/login` + `200 /api/auth/me`.
- Screenshot of rooms list rendered.

### Cell 4 — Restart persistence (F3 pincer)

1. Close the Antchat window completely.
2. Wait 5 seconds.
3. Relaunch.

**Expected**: token survives. App opens directly to rooms list, no login prompt.

**Capture**: time to ready-state on second launch (should be faster — no SSE handshake delay until room open).

### Cell 5 — Server-kickstart persistence (O1 pincer)

On the v4 server host (Mac):
```
launchctl kickstart -k gui/$(id -u)/com.ant.fresh
```

Then in the Windows VM:
1. Trigger a room refresh in Antchat (open a different room then back).

**Expected**: same token still valid (O1 SQLite projection survives kickstart). No login prompt.

**Capture**: confirm `GET /api/auth/me` returns 200 in the network tab post-kickstart.

### Cell 6 — Upgrade from existing install

Pre-condition: VM has `antchat-app` v0.0.1 installed via Cell 1.

```powershell
# Bump available
scoop update
scoop status

# Install the upgrade
scoop update antchat-app
```

**Expected**:
- New version replaces old.
- localStorage (token + user) preserved across upgrade (Scoop puts new bin in same location).
- Re-launch shows the upgraded version + same logged-in state.

**Capture**: from-version → to-version diff; verify no re-login needed.

### Cell 7 — Direct `.exe` download (SmartScreen path)

For comparison vs Scoop:
1. Download the `.exe` from GitHub Releases directly (not via Scoop).
2. Double-click.

**Expected**:
- Windows SmartScreen blocks: "Windows protected your PC — Unrecognized app".
- "More info → Run anyway" lets it through.
- Subsequent launches don't re-prompt (per-binary trust granted).

**Capture**: screenshot of the SmartScreen dialog (this is the UX gap JWPK accepted in msg_mtpqhnd0bx).

### Cell 8 — Server-down degradation

With the v4 server stopped:
1. Launch Antchat fresh (or restart it).

**Expected**:
- Login attempt shows a network error (UX showing the visual-auth-fallback from wta-10-visual-auth-fallback).
- Server URL can be reconfigured via Settings.

**Capture**: error UI state.

## Pass criteria

- All 16 cells (8 each × 2 OSes) green for "Expected" → release-ready.
- Any cells with FAIL or PARTIAL must be filed as follow-up tasks; lane re-runs after fixes.

## Smoke matrix doc cross-ref

@evolveantux's wta-08 smoke matrix doc tracks the cells in a single CSV/table.
This runbook is the executable counterpart — how to run each cell.
