# AGENTS.md — Libaby Codebase Guide for AI Agents

This document is written for AI coding agents (Claude, Gemini, Copilot, etc.) working on this repository. Read it before making any changes.

---

## What This App Does

Libaby is a **Tauri 2 desktop app** for reading Islamic texts from the Shamela library. It downloads a master catalogue and individual books from a **private HuggingFace dataset**, stores them locally as JSON, and renders them in a bilingual (Arabic + English) reader.

It is **not** a web app, not a Next.js app, not a server — it is a native desktop app with a Rust backend and a React frontend communicating via Tauri IPC.

---

## Stack at a Glance

| Concern | Technology | Entry point |
|---|---|---|
| Desktop shell | Tauri 2 | `src-tauri/src/main.rs` |
| All Tauri commands | Rust | `src-tauri/src/lib.rs` |
| Search / catalogue logic | Rust | `src-tauri/src/catalog.rs` |
| Frontend entry | React 19 + Vite | `src/main.tsx` |
| Routing & shell | React (no router library) | `src/components/application-shell1.tsx` |
| HuggingFace API calls | TypeScript | `src/lib/huggingface.ts` |
| Settings state | Zustand | `src/stores/useSettingsStore.ts` |
| Package manager | Bun | `bun.lock` |

---

## Running the App

```bash
bun install
bun run dev        # Vite dev server + Tauri window
```

Type-checking only (no Tauri window):
```bash
bun run tsc --noEmit
```

Rust compile check only:
```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Full CI check:
```bash
bun run ci         # tsc + vite build + cargo check
```

---

## Architecture Rules

### Rule 1 — Every backend operation is a Tauri command

All file I/O, HuggingFace downloads, and data queries go through `#[tauri::command]` functions in `src-tauri/src/lib.rs`. The frontend calls these via `invoke()` wrappers in `src/lib/huggingface.ts`.

**Do not** add `fetch()` calls to the frontend for anything that touches the filesystem or the HuggingFace API. Use Tauri commands.

When adding a new Tauri command:
1. Define the `fn` in `lib.rs` with `#[tauri::command]`
2. Register it in the `tauri::generate_handler![...]` macro at the bottom of `lib.rs`
3. Add a typed `invoke()` wrapper in `src/lib/huggingface.ts`

### Rule 2 — React state rules (critical — violating these caused 90% CPU loops)

**`useEffectEvent` functions must never appear in `useEffect` dependency arrays.**  
They are not guaranteed to be stable references. Put only primitive values (strings, booleans, numbers) in dep arrays.

```typescript
// WRONG — causes infinite loop if useEffectEvent is not stable
const doSomething = useEffectEvent(async () => { ... });
useEffect(() => { doSomething(); }, [doSomething]); // ❌

// CORRECT
useEffect(() => { doSomething(); }, [primitiveDepOnly]); // ✅
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**Never create object literals as props inside JSX for components that use them in `useMemo` deps.**  
This causes the memo to recompute on every parent render. Extract into a `useMemo` or a wrapper component.

```typescript
// WRONG — new object on every render → child memo never stable
<BookPageView bookMeta={{ bookId, enTitle, arTitle }} /> // ❌

// CORRECT — stable reference
const bookMeta = useMemo(() => ({ bookId, enTitle, arTitle }), [bookId, enTitle, arTitle]);
<BookPageView bookMeta={bookMeta} /> // ✅
```

**`setState` with always-new objects causes unnecessary re-renders.**  
Always bail out when the new value equals the old:

```typescript
// WRONG
setKnownTitles(current => ({ ...current })); // always new object ❌

// CORRECT
setKnownTitles(current => {
  if (noChange) return current; // same reference → React bails out ✅
  return { ...current, [id]: title };
});
```

### Rule 3 — Routing is a discriminated union, not a URL router

The `Route` type in `application-shell1.tsx` is the single source of truth for navigation. It is a TypeScript discriminated union. There is no React Router or similar library.

To add a new page:
1. Add a new variant to the `Route` type
2. Add a case to `getBreadcrumbs()`
3. Add a render branch in `PageContent`
4. Create `src/pages/YourPage.tsx`
5. Add a lazy import at the top of `application-shell1.tsx`

### Rule 4 — Data normalisation happens in Rust, not TypeScript

Search normalisation (stripping Arabic diacritics, Latin macrons, building search blobs) is done in `catalog.rs → normalize_search_text()`. Do not replicate this in TypeScript.

English translations are injected into `DenormalizedBook` at index-build time in `catalog.rs → MasterIndex::from_archive()`. The fields `en_name`, `en_author`, `en_category` come from the Rust layer — they are not computed in TypeScript.

### Rule 5 — Translation index is per-book, not per-page

`loadBookTranslationIndex(bookId)` is called in a `useEffect([bookId])`. It fires once when the book changes, not on every page navigation. The resulting `Map<pageId, EnExcerpt[]>` is then queried per page in a `useMemo`.

---

## File-by-File Reference

### `src-tauri/src/catalog.rs`

- `MasterIndex` — the in-memory index of all books, built once from `master.json` + `master_en.json`.
- `normalize_search_text(s)` — strips Arabic diacritics, Latin macrons/diacritics, lowercases. Used both at index time and query time.
- `SearchEntry` — one entry per book: `id`, `name`, `normalised_blob` (the string we search against).
- `EnTranslation` / `EnTranslation::into_maps()` — parses `master_en.json`, returns `(book_map, author_map, category_map)` keyed by numeric ID.
- `DenormalizedBook` uses `#[serde(deserialize_with = "deserialize_u32_lenient")]` on numeric fields because the production data has string-encoded floats (`"5.0"`) and nulls.

### `src-tauri/src/lib.rs`

All Tauri commands. Key path resolvers at the top:
- `resolve_app_data_dir` → Tauri `AppData` directory
- `resolve_books_dir` → `{AppData}/books/`
- `resolve_book_translations_dir` → `{AppData}/books/en/`
- `resolve_master_path` / `resolve_master_en_path` → `{AppData}/master.json` / `master_en.json`

Key commands:
| Command | What it does |
|---|---|
| `download_and_cache_master` | Downloads + decompresses `master/master.json.br` and `master/master_en.json.br`, builds `MasterIndex` |
| `query_master_books` | Paginated search through `MasterIndex` |
| `download_and_cache_book` | Fetches `books/{id}.json.br` from HuggingFace |
| `read_cached_book_if_exists` | Reads `books/{id}.json` from disk |
| `download_and_cache_book_translation` | Fetches `books/en/{id}.json.br` |
| `read_cached_book_translation_if_exists` | Reads `books/en/{id}.json` |
| `is_book_translation_cached` | Boolean check for `books/en/{id}.json` |

### `src/lib/huggingface.ts`

Typed wrappers around every `invoke()` call. If you add a Tauri command, add a wrapper here. Keep parameter names matching the Rust snake_case via the Tauri JS bridge (e.g. `book_id` in Rust → `bookId` in TS, Tauri converts automatically).

### `src/lib/book-resource.ts` + `book-resource-store.ts`

`buildBookResource(bookId, data: BookData): BookResource` — converts raw book JSON into:
- `pageRows` — flat array of page rows for the table
- `pageById` — `Map<pageId, Page>`
- `pageIndexById` — `Map<pageId, arrayIndex>` for prev/next navigation
- `titleTree` — nested `ShamelaTitleNode[]` for the sidebar collapsible

`loadBookResource(options)` — async, LRU-cached (max 6 books). Always call this, never parse book JSON directly.

### `src/lib/book-translation.ts`

- `buildTranslationIndex(translation): TranslationIndex` — maps `Map<pageId, EnExcerpt[]>` expanding `from..to` ranges.
- `loadBookTranslationIndex(bookId)` — async, session-cached (max 6). Returns `null` if no translation is cached on disk.
- `EnExcerpt.nass` — the source Arabic text (substring of the page content).
- `EnExcerpt.text` — the English translation.
- `EnExcerpt.from` / `EnExcerpt.to` — page IDs (inclusive range) from the Arabic book's `pages[].id`.

### `src/components/application-shell1.tsx`

The root component. Contains:
- `Route` type (discriminated union) — add new pages here
- `BookPageViewWrapper` — owns the stable `bookMeta` memo to prevent `BookPageView` re-renders
- `getBreadcrumbs()` — pure function, returns `BreadcrumbEntry[]`
- `enrichRoute()` — fills missing `bookTitle`/`bookArTitle` from `knownBookTitles`
- `refreshDownloadedBooks` — `useEffectEvent`, must NOT be in any `useEffect` dep array

### `src/pages/BookPageView.tsx`

The page reader. Key internals:
- Two `useEffect` hooks: one for book content (`[bookId, pageId, token, dataset]`), one for translation (`[bookId]`).
- `masterMeta` state — loaded via `getMasterBook(bookId)` to get author names for citations.
- `effectiveMeta` memo — merges `masterMeta` (authoritative) with `bookMeta` prop (from route).
- `buildCitation()` — formats clipboard text with English + Arabic citation lines and Arabic-Indic numerals.
- `CopyButton` — 2-second teal checkmark feedback via `setTimeout`.

---

## Data Formats

### HuggingFace dataset paths
```
master/master.json.br           ← full book catalogue (arabic)
master/master_en.json.br        ← english transliterations
books/{bookId}.json.br          ← individual book content
books/en/{bookId}.json.br       ← english translation (optional)
```

### `master_en.json` structure
```jsonc
{
  "headings": [{ "id": "A55",   "text": "Muḥammad ibn Ismāʿīl al-Bukhārī" }],
  "footnotes": [{ "id": "C23",  "text": "Hadith" }],
  "excerpts":  [{ "id": "B1681","text": "Ṣaḥīḥ al-Bukhārī [al-Sulṭānīyah]" }]
}
```
`A{n}` = `authors.id`, `C{n}` = `categories.id`, `B{n}` = `books.id`

### `books/en/{id}.json` structure (same shape as `master_en.json`)
```jsonc
{
  "excerpts": [
    {
      "nass": "بَابٌ: إِفْشَاءُ السَّلَامِ",   // source Arabic (substring of page content)
      "text": "Chapter: Spreading the Salām",    // English translation
      "from": 222,                               // pages.id (inclusive start)
      "to": 223                                  // pages.id (inclusive end, optional)
    }
  ]
}
```

---

## Common Tasks

### Add a new Tauri command

1. Add `#[tauri::command] fn my_command(...) -> Result<T, String>` in `lib.rs`
2. Add it to `tauri::generate_handler![..., my_command]`
3. Add `export async function myCommand(...): Promise<T>` in `huggingface.ts`
4. Run `cargo check --manifest-path src-tauri/Cargo.toml` to verify

### Add a new page

1. Create `src/pages/MyPage.tsx` exporting `function MyPage(...)`
2. Add variant to `Route` type in `application-shell1.tsx`
3. Add lazy import: `const MyPage = lazy(() => import("@/pages/MyPage").then(m => ({ default: m.MyPage })))`
4. Add case to `getBreadcrumbs()`
5. Add render branch in `PageContent`

### Add a field to `DenormalizedBook`

The type lives in `src/types/books.ts`. The base type comes from the `shamela` npm package. Extended fields (like `en_name`) are injected by Rust in `catalog.rs → MasterIndex::from_archive()` and declared in the TS type as optional (`en_name?: string`).

### Upgrade Tauri

```bash
bun run upgrade:tauri
```

See `scripts/upgrade-tauri.sh` and `README.md → Maintenance` for details.

---

## Known Gotchas

| Gotcha | Detail |
|---|---|
| `version` field in master is a string float | `"5.0"` not `5` — handled by `deserialize_u32_lenient` in Rust |
| `date` field can be negative | Pre-Hijri dates → use `i32`, not `u32` |
| `useEffectEvent` is not stable | Never put in `useEffect` deps — causes infinite re-render loops |
| `knownBookTitles` must bail out | Always return `current` when no titles changed — avoids cascading re-renders |
| `bookMeta` must be memoized | Inline JSX objects cause `BookPageView` to re-render on every parent tick |
| Arabic translation line | `arTitle` comes from `masterMeta.arTitle = book.name` (Rust field), NOT from `route.bookTitle` which is English |
| `tauri-build` ≠ `@tauri-apps/api` version | Only the `tauri` crate must match — `tauri-build` and plugins version independently |

---

## Code Style

- **TypeScript**: strict mode, no `any`. Prefer `unknown` + type guards.
- **Biome** for formatting and linting. Run `bun run lint:fix && bun run format:fix` before committing.
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- **Rust**: `cargo fmt` + `cargo clippy` before committing Rust changes.
- **No inline object props** for components that use them in `useMemo` deps (see Rule 2 above).
- **No `useEffect` with functions in deps** unless those functions are `useCallback` with empty `[]` deps.
