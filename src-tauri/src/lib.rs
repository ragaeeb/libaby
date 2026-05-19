mod catalog;

use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use catalog::{
    DenormalizedBook, DownloadedBookEntry, DownloadedBooksManifest, EnTranslation, MasterArchive,
    MasterIndex, MasterQueryParams, MasterQueryResult,
};
use serde::Serialize;
use tauri::Manager;

#[derive(Default)]
struct AppState {
    master_index: RwLock<Option<Arc<MasterIndex>>>,
}

#[derive(Serialize)]
struct DashboardStats {
    master_cached: bool,
    downloaded_books: usize,
}

#[derive(Serialize)]
struct MasterDownloadResult {
    books: usize,
}

fn decompress_brotli_bytes(data: &[u8]) -> Result<String, String> {
    let mut decompressed = Vec::new();
    let mut decoder = brotli::Decompressor::new(data, 4096);
    std::io::Read::read_to_end(&mut decoder, &mut decompressed).map_err(|e| e.to_string())?;
    String::from_utf8(decompressed).map_err(|e| e.to_string())
}

fn resolve_app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

fn resolve_books_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_app_data_dir(app)?.join("books"))
}

fn resolve_book_translations_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_books_dir(app)?.join("en"))
}

fn resolve_master_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_app_data_dir(app)?.join("master.json"))
}

fn resolve_master_en_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_app_data_dir(app)?.join("master_en.json"))
}

fn resolve_manifest_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(resolve_app_data_dir(app)?.join("downloaded_books.json"))
}

fn list_cached_book_ids_from_dir(books_dir: &Path) -> Result<Vec<u32>, String> {
    if !books_dir.exists() {
        return Ok(Vec::new());
    }

    let mut ids = std::fs::read_dir(books_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let path = entry.path();
            let is_json = path.extension().is_some_and(|ext| ext == "json");
            if !is_json {
                return None;
            }

            path.file_stem()
                .and_then(|stem| stem.to_str())
                .and_then(|stem| stem.parse::<u32>().ok())
        })
        .collect::<Vec<_>>();

    ids.sort_unstable();
    ids.dedup();
    Ok(ids)
}

fn save_manifest(app: &tauri::AppHandle, manifest: &DownloadedBooksManifest) -> Result<(), String> {
    let path = resolve_manifest_path(app)?;
    let dir = resolve_app_data_dir(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_vec_pretty(manifest).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

fn rebuild_manifest(app: &tauri::AppHandle) -> Result<DownloadedBooksManifest, String> {
    let manifest =
        DownloadedBooksManifest::from_downloaded_ids(list_cached_book_ids_from_dir(&resolve_books_dir(app)?)?);
    save_manifest(app, &manifest)?;
    Ok(manifest)
}

fn load_manifest(app: &tauri::AppHandle) -> Result<DownloadedBooksManifest, String> {
    let path = resolve_manifest_path(app)?;

    if path.exists() {
        let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
        if let Ok(manifest) = serde_json::from_slice::<DownloadedBooksManifest>(&bytes) {
            return Ok(manifest);
        }
    }

    rebuild_manifest(app)
}

fn load_en_maps(app: &tauri::AppHandle) -> Result<catalog::EnMaps, String> {
    let path = resolve_master_en_path(app)?;
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let en = serde_json::from_slice::<EnTranslation>(&bytes).map_err(|e| e.to_string())?;
    Ok(en.into_maps())
}

fn set_master_index(state: &AppState, index: Arc<MasterIndex>) -> Result<(), String> {
    let mut guard = state
        .master_index
        .write()
        .map_err(|_| "Master index lock poisoned".to_string())?;
    *guard = Some(index);
    Ok(())
}

fn get_or_load_master_index(
    app: &tauri::AppHandle,
    state: &AppState,
) -> Result<Arc<MasterIndex>, String> {
    if let Some(index) = state
        .master_index
        .read()
        .map_err(|_| "Master index lock poisoned".to_string())?
        .as_ref()
        .cloned()
    {
        return Ok(index);
    }

    let path = resolve_master_path(app)?;
    if !path.exists() {
        return Err("Master database is not cached yet".to_string());
    }

    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let archive = serde_json::from_slice::<MasterArchive>(&bytes).map_err(|e| e.to_string())?;

    // Load English translations if available
    let en_maps = load_en_maps(app).ok();

    let index = Arc::new(MasterIndex::from_archive(archive, en_maps));
    set_master_index(state, index.clone())?;
    Ok(index)
}

async fn download_hf_file(token: &str, dataset: &str, path: &str) -> Result<Vec<u8>, String> {
    let url = format!(
        "https://huggingface.co/datasets/{dataset}/resolve/main/{path}"
    );
    let response = reqwest::Client::new()
        .get(url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download {path}: HTTP {}",
            response.status()
        ));
    }

    response
        .bytes()
        .await
        .map(|bytes| bytes.to_vec())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_dashboard_stats(app: tauri::AppHandle) -> Result<DashboardStats, String> {
    let manifest = load_manifest(&app)?;
    Ok(DashboardStats {
        master_cached: resolve_master_path(&app)?.exists(),
        downloaded_books: manifest.books.len(),
    })
}

#[tauri::command]
fn is_master_cached(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(resolve_master_path(&app)?.exists() && resolve_master_en_path(&app)?.exists())
}

#[tauri::command]
fn query_master_books(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    params: MasterQueryParams,
) -> Result<MasterQueryResult, String> {
    Ok(get_or_load_master_index(&app, &state)?.query(&params))
}

#[tauri::command]
fn get_master_book(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    book_id: u32,
) -> Result<Option<DenormalizedBook>, String> {
    Ok(get_or_load_master_index(&app, &state)?.get(book_id))
}

#[tauri::command]
fn get_master_books_by_ids(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    book_ids: Vec<u32>,
) -> Result<Vec<DenormalizedBook>, String> {
    Ok(get_or_load_master_index(&app, &state)?.get_many(&book_ids))
}

#[tauri::command]
fn list_downloaded_books(app: tauri::AppHandle) -> Result<Vec<DownloadedBookEntry>, String> {
    Ok(load_manifest(&app)?.books)
}

#[tauri::command]
fn list_downloaded_book_ids(app: tauri::AppHandle) -> Result<Vec<u32>, String> {
    Ok(load_manifest(&app)?
        .books
        .into_iter()
        .map(|entry| entry.book_id)
        .collect())
}

#[tauri::command]
fn is_book_downloaded(app: tauri::AppHandle, book_id: u32) -> Result<bool, String> {
    Ok(load_manifest(&app)?.contains(book_id))
}

#[tauri::command]
fn read_cached_book_if_exists(
    app: tauri::AppHandle,
    book_id: u32,
) -> Result<Option<String>, String> {
    let path = resolve_books_dir(&app)?.join(format!("{book_id}.json"));
    if !path.exists() {
        return Ok(None);
    }

    std::fs::read_to_string(path)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn is_book_translation_cached(app: tauri::AppHandle, book_id: u32) -> Result<bool, String> {
    Ok(resolve_book_translations_dir(&app)?
        .join(format!("{book_id}.json"))
        .exists())
}

#[tauri::command]
fn read_cached_book_translation_if_exists(
    app: tauri::AppHandle,
    book_id: u32,
) -> Result<Option<String>, String> {
    let path = resolve_book_translations_dir(&app)?.join(format!("{book_id}.json"));
    if !path.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(path)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_and_cache_book_translation(
    app: tauri::AppHandle,
    book_id: u32,
    token: String,
    dataset: String,
) -> Result<(), String> {
    let compressed =
        download_hf_file(&token, &dataset, &format!("books/en/{book_id}.json.br")).await?;
    let text = decompress_brotli_bytes(&compressed)?;
    let dir = resolve_book_translations_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(format!("{book_id}.json")), &text).map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_and_cache_master(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    token: String,
    dataset: String,
) -> Result<MasterDownloadResult, String> {
    let compressed = download_hf_file(&token, &dataset, "master/master.json.br").await?;
    let compressed_en = download_hf_file(&token, &dataset, "master/master_en.json.br").await?;

    let text = decompress_brotli_bytes(&compressed)?;
    let text_en = decompress_brotli_bytes(&compressed_en)?;

    eprintln!("[libaby] Parsing master archive ({} bytes)…", text.len());
    let archive = serde_json::from_str::<MasterArchive>(&text).map_err(|e| {
        eprintln!("[libaby] ERROR parsing master archive: {e}");
        e.to_string()
    })?;
    eprintln!("[libaby] Parsed {} books ok", archive.books.len());
    let books = archive.books.len();

    let dir = resolve_app_data_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(resolve_master_path(&app)?, &text).map_err(|e| e.to_string())?;
    std::fs::write(resolve_master_en_path(&app)?, &text_en).map_err(|e| e.to_string())?;

    let en_maps = serde_json::from_str::<EnTranslation>(&text_en)
        .ok()
        .map(|en| en.into_maps());

    set_master_index(&state, Arc::new(MasterIndex::from_archive(archive, en_maps)))?;

    Ok(MasterDownloadResult { books })
}

#[tauri::command]
async fn download_and_cache_book(
    app: tauri::AppHandle,
    book_id: u32,
    token: String,
    dataset: String,
    title: Option<String>,
) -> Result<String, String> {
    let compressed = download_hf_file(&token, &dataset, &format!("books/{book_id}.json.br")).await?;
    let text = decompress_brotli_bytes(&compressed)?;
    let dir = resolve_books_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(format!("{book_id}.json")), &text).map_err(|e| e.to_string())?;

    let mut manifest = load_manifest(&app)?;
    manifest.upsert(book_id, title);
    save_manifest(&app, &manifest)?;

    Ok(text)
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
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_dashboard_stats,
            is_master_cached,
            query_master_books,
            get_master_book,
            get_master_books_by_ids,
            list_downloaded_books,
            list_downloaded_book_ids,
            is_book_downloaded,
            read_cached_book_if_exists,
            download_and_cache_master,
            download_and_cache_book,
            is_book_translation_cached,
            read_cached_book_translation_if_exists,
            download_and_cache_book_translation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
