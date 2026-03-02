use tauri::Manager;

fn decompress_brotli_bytes(data: &[u8]) -> Result<String, String> {
    let mut decompressed = Vec::new();
    let mut decoder = brotli::Decompressor::new(data, 4096);
    std::io::Read::read_to_end(&mut decoder, &mut decompressed).map_err(|e| e.to_string())?;
    String::from_utf8(decompressed).map_err(|e| e.to_string())
}

fn resolve_app_data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

fn resolve_books_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(resolve_app_data_dir(app)?.join("books"))
}

#[tauri::command]
fn decompress_brotli(data: Vec<u8>) -> Result<String, String> {
    decompress_brotli_bytes(&data)
}

// --- Book cache commands ---

#[tauri::command]
fn is_book_cached(app: tauri::AppHandle, book_id: String) -> Result<bool, String> {
    Ok(resolve_books_dir(&app)?.join(format!("{book_id}.json")).exists())
}

#[tauri::command]
fn read_cached_book(app: tauri::AppHandle, book_id: String) -> Result<String, String> {
    let path = resolve_books_dir(&app)?.join(format!("{book_id}.json"));
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn decompress_and_cache_book(
    app: tauri::AppHandle,
    book_id: String,
    data: Vec<u8>,
) -> Result<String, String> {
    let text = decompress_brotli_bytes(&data)?;
    let dir = resolve_books_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(format!("{book_id}.json")), &text).map_err(|e| e.to_string())?;
    Ok(text)
}

// --- Master cache commands ---

#[tauri::command]
fn is_master_cached(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(resolve_app_data_dir(&app)?.join("master.json").exists())
}

#[tauri::command]
fn read_cached_master(app: tauri::AppHandle) -> Result<String, String> {
    let path = resolve_app_data_dir(&app)?.join("master.json");
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn decompress_and_cache_master(app: tauri::AppHandle, data: Vec<u8>) -> Result<String, String> {
    let text = decompress_brotli_bytes(&data)?;
    let dir = resolve_app_data_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("master.json"), &text).map_err(|e| e.to_string())?;
    Ok(text)
}

// --- Dashboard stats ---

#[derive(serde::Serialize)]
struct DashboardStats {
    master_cached: bool,
    downloaded_books: usize,
}

#[tauri::command]
fn get_dashboard_stats(app: tauri::AppHandle) -> Result<DashboardStats, String> {
    let data_dir = resolve_app_data_dir(&app)?;
    let books_dir = data_dir.join("books");

    let downloaded_books = if books_dir.exists() {
        std::fs::read_dir(&books_dir)
            .map_err(|e| e.to_string())?
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().is_some_and(|ext| ext == "json"))
            .count()
    } else {
        0
    };

    Ok(DashboardStats {
        master_cached: data_dir.join("master.json").exists(),
        downloaded_books,
    })
}

// --- macOS menu ---

#[cfg(target_os = "macos")]
use tauri::menu::{AboutMetadata, MenuBuilder, SubmenuBuilder};

#[cfg(target_os = "macos")]
fn configure_macos_menu<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let author = env!("CARGO_PKG_AUTHORS")
        .split(':')
        .find(|value| !value.trim().is_empty())
        .unwrap_or("Unknown");
    let website = env!("CARGO_PKG_HOMEPAGE");
    let repository = env!("CARGO_PKG_REPOSITORY");

    let about_metadata = AboutMetadata {
        name: Some("Libaby".to_string()),
        version: Some(env!("CARGO_PKG_VERSION").to_string()),
        credits: Some(format!(
            "Author: {author}\nWebsite: {website}\nRepository: {repository}"
        )),
        website: if website.is_empty() {
            None
        } else {
            Some(website.to_string())
        },
        website_label: Some("Libaby Website".to_string()),
        ..Default::default()
    };

    let app_name = app.package_info().name.clone();
    let app_submenu = SubmenuBuilder::new(app, app_name)
        .about(Some(about_metadata))
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .separator()
        .quit()
        .build()?;

    let file_submenu = SubmenuBuilder::new(app, "File")
        .close_window()
        .build()?;

    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .close_window()
        .build()?;

    let help_submenu = SubmenuBuilder::new(app, "Help").build()?;

    let menu = MenuBuilder::new(app)
        .item(&app_submenu)
        .item(&file_submenu)
        .item(&edit_submenu)
        .item(&window_submenu)
        .item(&help_submenu)
        .build()?;

    app.set_menu(menu)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            configure_macos_menu(app)?;
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            decompress_brotli,
            is_book_cached,
            read_cached_book,
            decompress_and_cache_book,
            is_master_cached,
            read_cached_master,
            decompress_and_cache_master,
            get_dashboard_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
