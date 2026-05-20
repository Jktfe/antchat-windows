// ANT Chat — macOS native client (Tauri v2 + Svelte 5)
//
// Rust core responsibilities:
//   - Native macOS application menu bar (top-of-screen File/Edit/View/Window/Help)
//   - Menu-bar tray icon + popover anchor (tauri-plugin-positioner)
//   - System notifications (tauri-plugin-notification)
//   - Global keyboard shortcuts (tauri-plugin-global-shortcut)
//   - ant:// deep-link redemption flow (tauri-plugin-deep-link)
//   - Window state restore between launches (tauri-plugin-window-state)

use tauri::{
    menu::{Menu, MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, LogicalSize, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_positioner::{Position, WindowExt};

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        // Cmd+Shift+A: toggle main window (global, works even
                        // when ANT Chat is in the background).
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false)
                                && window.is_focused().unwrap_or(false)
                            {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Native macOS application menu — gives ANT Chat real top-of-screen
            // File/Edit/View/Window/Help menus instead of the Tauri default. Web
            // shortcuts work in-app (Cmd+K palette, Cmd+1..9 rooms, etc.); these
            // are the menu-level affordances + Quit, Hide, Close Window.
            let app_handle = app.handle();
            let app_submenu = SubmenuBuilder::new(app_handle, "ANT Chat")
                .item(&MenuItem::with_id(app, "menu.about", "About ANT Chat", true, None::<&str>)?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "menu.settings",
                    "Settings…",
                    true,
                    Some("CmdOrCtrl+,"),
                )?)
                .separator()
                .item(&PredefinedMenuItem::hide(app_handle, Some("Hide ANT Chat"))?)
                .item(&PredefinedMenuItem::hide_others(app_handle, None)?)
                .item(&PredefinedMenuItem::show_all(app_handle, None)?)
                .separator()
                .item(&PredefinedMenuItem::quit(app_handle, Some("Quit ANT Chat"))?)
                .build()?;
            let file_submenu = SubmenuBuilder::new(app_handle, "File")
                .item(&MenuItem::with_id(
                    app,
                    "menu.new-room",
                    "New Room…",
                    true,
                    Some("CmdOrCtrl+N"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "menu.connect",
                    "Connect with Token…",
                    true,
                    Some("CmdOrCtrl+Shift+C"),
                )?)
                .separator()
                .item(&PredefinedMenuItem::close_window(app_handle, None)?)
                .build()?;
            let edit_submenu = SubmenuBuilder::new(app_handle, "Edit")
                .item(&PredefinedMenuItem::undo(app_handle, None)?)
                .item(&PredefinedMenuItem::redo(app_handle, None)?)
                .separator()
                .item(&PredefinedMenuItem::cut(app_handle, None)?)
                .item(&PredefinedMenuItem::copy(app_handle, None)?)
                .item(&PredefinedMenuItem::paste(app_handle, None)?)
                .item(&PredefinedMenuItem::select_all(app_handle, None)?)
                .build()?;
            let view_submenu = SubmenuBuilder::new(app_handle, "View")
                .item(&MenuItem::with_id(
                    app,
                    "menu.command-palette",
                    "Command Palette…",
                    true,
                    Some("CmdOrCtrl+K"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "menu.rooms",
                    "Rooms",
                    true,
                    Some("CmdOrCtrl+R"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "menu.toggle-sidebar",
                    "Toggle Sidebar",
                    true,
                    Some("CmdOrCtrl+B"),
                )?)
                .separator()
                .item(&PredefinedMenuItem::fullscreen(app_handle, None)?)
                .build()?;
            let window_submenu = SubmenuBuilder::new(app_handle, "Window")
                .item(&PredefinedMenuItem::minimize(app_handle, None)?)
                .item(&PredefinedMenuItem::close_window(app_handle, None)?)
                .build()?;
            let help_submenu = SubmenuBuilder::new(app_handle, "Help")
                .item(&MenuItem::with_id(
                    app,
                    "menu.help",
                    "ANT Chat Help",
                    true,
                    None::<&str>,
                )?)
                .build()?;
            let app_menu = MenuBuilder::new(app_handle)
                .item(&app_submenu)
                .item(&file_submenu)
                .item(&edit_submenu)
                .item(&view_submenu)
                .item(&window_submenu)
                .item(&help_submenu)
                .build()?;
            app.set_menu(app_menu)?;
            repair_bad_window_state(app_handle);

            // Forward menu events to the frontend as `nav` / `action` events.
            app.on_menu_event(|app, event| {
                let id = event.id.as_ref();
                match id {
                    "menu.settings" => {
                        let _ = app.emit("nav", "/settings");
                    }
                    "menu.new-room" => {
                        let _ = app.emit("action", "new-room");
                    }
                    "menu.connect" => {
                        let _ = app.emit("action", "connect");
                    }
                    "menu.command-palette" => {
                        let _ = app.emit("action", "command-palette");
                    }
                    "menu.rooms" => {
                        let _ = app.emit("nav", "/rooms");
                    }
                    "menu.toggle-sidebar" => {
                        let _ = app.emit("action", "toggle-sidebar");
                    }
                    "menu.help" => {
                        let _ = app.emit("nav", "/help");
                    }
                    "menu.about" => {
                        let _ = app.emit("action", "about");
                    }
                    _ => {}
                }
            });

            // Register the global toggle shortcut (Cmd/Ctrl+Shift+A → show/hide).
            let toggle_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyA);
            let _ = app.global_shortcut().register(toggle_shortcut);

            let open_item = MenuItem::with_id(app, "open", "Open ANT Chat", true, None::<&str>)?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Settings…", true, None::<&str>)?;
            let separator = MenuItem::with_id(app, "sep", "—", false, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit ANT Chat", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &settings_item, &separator, &quit_item])?;

            let _tray = TrayIconBuilder::with_id("ant-chat-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => focus_main(app),
                    "settings" => {
                        focus_main(app);
                        let _ = app.emit("nav", "/settings");
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.move_window(Position::TrayCenter);
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // ant:// deep-link handler — emits URLs to the frontend for redemption.
            // The QR pairing client subscribes to `deep-link://ant` and runs the
            // /api/qr-tokens/redeem exchange (see qr-pairing-flow-2026-05-16.md §3).
            #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    let urls: Vec<String> =
                        event.urls().iter().map(|u| u.to_string()).collect();
                    let _ = handle.emit("deep-link://ant", urls);
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![app_version])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn focus_main<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn repair_bad_window_state<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let size = window.inner_size().ok();
    let has_bad_size = size
        .map(|s| s.width < 480 || s.height < 320)
        .unwrap_or(false);
    let is_visible = window.is_visible().unwrap_or(false);

    if has_bad_size || !is_visible {
        let _ = window.set_size(LogicalSize::new(1100.0, 720.0));
        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
