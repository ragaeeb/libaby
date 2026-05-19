use std::cmp::Ordering;
use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};

// ---------------------------------------------------------------------------
// Lenient numeric deserializer
// The dataset encodes some integer fields as JSON strings ("5") or floats
// (5.0). Accept all three forms, truncating any fractional part.
// ---------------------------------------------------------------------------

fn deserialize_u32_lenient<'de, D: Deserializer<'de>>(de: D) -> Result<u32, D::Error> {
    let v = serde_json::Value::deserialize(de)?;
    match v {
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_u64() {
                return Ok(i as u32);
            }
            if let Some(f) = n.as_f64() {
                return Ok(f as u32);
            }
            Err(serde::de::Error::custom(format!("cannot coerce {n} to u32")))
        }
        serde_json::Value::String(s) => s
            .parse::<f64>()
            .map(|f| f as u32)
            .map_err(|_| serde::de::Error::custom(format!("cannot parse \"{s}\" as u32"))),
        serde_json::Value::Null => Ok(0),
        other => Err(serde::de::Error::custom(format!(
            "expected number, got {other}"
        ))),
    }
}

// ---------------------------------------------------------------------------
// Master (Arabic) structs — matches new denormalized DatasetMaster schema
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DenormalizedAuthor {
    #[serde(default, deserialize_with = "deserialize_u32_lenient")]
    pub id: u32,
    #[serde(default)]
    pub name: String,
    pub death: Option<i32>,
    pub biography: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DenormalizedCategory {
    #[serde(default, deserialize_with = "deserialize_u32_lenient")]
    pub id: u32,
    #[serde(default)]
    pub name: String,
    #[serde(default, deserialize_with = "deserialize_u32_lenient")]
    pub order: u32,
}

/// Mirrors the TypeScript DenormalizedBook shape.
/// Unrecognised fields (pdf_links, hint, date, etc.) are captured in `extra`
/// and forwarded as-is so the front-end still receives the full object.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DenormalizedBook {
    #[serde(default, deserialize_with = "deserialize_u32_lenient")]
    pub id: u32,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub bibliography: String,
    #[serde(default)]
    pub author: DenormalizedAuthor,
    #[serde(default)]
    pub category: DenormalizedCategory,
    /// String in new schema (e.g. "5.0")
    #[serde(default)]
    pub version: String,
    #[serde(default, deserialize_with = "deserialize_u32_lenient")]
    pub printed: u32,
    #[serde(default)]
    pub date: Option<i32>,
    #[serde(default)]
    pub hint: Option<String>,
    /// English transliterated title injected after loading master_en
    #[serde(default, skip_deserializing)]
    pub en_name: Option<String>,
    /// English transliterated author name
    #[serde(default, skip_deserializing)]
    pub en_author: Option<String>,
    /// English transliterated category name
    #[serde(default, skip_deserializing)]
    pub en_category: Option<String>,
    /// Catch-all for extra fields (metadata, pdf_links, etc.) so the
    /// front-end receives the full payload without us modelling every field.
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct MasterArchive {
    #[serde(default)]
    pub timestamp: u64,
    #[serde(default)]
    pub version: u64,
    #[serde(default)]
    pub books: Vec<DenormalizedBook>,
}

// ---------------------------------------------------------------------------
// English translation structs — matches master_en.json (Compilation format)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
pub struct EnExcerpt {
    /// e.g. "B1", "A55", "C23"
    pub id: String,
    /// English (transliterated) text; may be absent for untranslated entries
    pub text: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct EnTranslation {
    /// Book translations — id prefix "B"
    #[serde(default)]
    pub excerpts: Vec<EnExcerpt>,
    /// Author translations — id prefix "A"
    #[serde(default)]
    pub headings: Vec<EnExcerpt>,
    /// Category translations — id prefix "C"
    #[serde(default)]
    pub footnotes: Vec<EnExcerpt>,
}

impl EnTranslation {
    /// Build lookup maps: numeric id → english text, for each section.
    pub fn into_maps(self) -> EnMaps {
        fn build(items: Vec<EnExcerpt>, prefix: char) -> HashMap<u32, String> {
            items
                .into_iter()
                .filter_map(|e| {
                    let text = e.text?;
                    let numeric = e.id.strip_prefix(prefix)?.parse::<u32>().ok()?;
                    Some((numeric, text))
                })
                .collect()
        }

        EnMaps {
            books: build(self.excerpts, 'B'),
            authors: build(self.headings, 'A'),
            categories: build(self.footnotes, 'C'),
        }
    }
}

pub struct EnMaps {
    pub books: HashMap<u32, String>,
    pub authors: HashMap<u32, String>,
    pub categories: HashMap<u32, String>,
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DownloadedBookEntry {
    pub book_id: u32,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DownloadedBooksManifest {
    #[serde(default)]
    pub books: Vec<DownloadedBookEntry>,
}

// ---------------------------------------------------------------------------
// Query types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MasterQueryParams {
    #[serde(default)]
    pub page_index: usize,
    #[serde(default = "default_page_size")]
    pub page_size: usize,
    #[serde(default)]
    pub query: String,
    #[serde(default)]
    pub sort_by: Option<String>,
    #[serde(default)]
    pub sort_desc: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct MasterQueryResult {
    pub items: Vec<DenormalizedBook>,
    pub page_index: usize,
    pub page_size: usize,
    pub total: usize,
    pub total_all: usize,
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
struct MasterBookRecord {
    book: DenormalizedBook,
    /// Pre-built lowercase search blob (Arabic + English)
    search_blob: String,
}

#[derive(Debug, Clone)]
pub struct MasterIndex {
    books: Vec<MasterBookRecord>,
    by_id: HashMap<u32, usize>,
}

fn default_page_size() -> usize {
    25
}

fn normalize_search_text(text: &str) -> String {
    // Lowercase, collapse whitespace, and strip Latin diacritics/macrons
    // commonly used in Arabic transliteration (ā ī ū ḥ ḍ ṭ ẓ ṣ ḏ ġ etc.).
    let stripped: String = text
        .chars()
        .map(|c| match c {
            'ā' | 'à' | 'á' | 'â' | 'ã' | 'ä' => 'a',
            'Ā' | 'À' | 'Á' | 'Â' | 'Ã' | 'Ä' => 'a',
            'ī' | 'ì' | 'í' | 'î' | 'ï' => 'i',
            'Ī' | 'Ì' | 'Í' | 'Î' | 'Ï' => 'i',
            'ū' | 'ù' | 'ú' | 'û' | 'ü' => 'u',
            'Ū' | 'Ù' | 'Ú' | 'Û' | 'Ü' => 'u',
            'ḥ' | 'ḫ' => 'h',
            'Ḥ' | 'Ḫ' => 'h',
            'ḍ' => 'd',
            'Ḍ' => 'd',
            'ṭ' => 't',
            'Ṭ' => 't',
            'ẓ' => 'z',
            'Ẓ' => 'z',
            'ṣ' => 's',
            'Ṣ' => 's',
            'ḏ' => 'd',
            'Ḏ' => 'd',
            'ġ' | 'ğ' => 'g',
            'Ġ' | 'Ğ' => 'g',
            '\u{02be}' | '\u{02bf}' => ' ', // hamza / ayn markers (ʾ ʿ)
            'ñ' => 'n',
            'ç' => 'c',
            'ő' | 'ò' | 'ó' | 'ô' | 'õ' | 'ö' | 'ō' => 'o',
            'Ő' | 'Ò' | 'Ó' | 'Ô' | 'Õ' | 'Ö' | 'Ō' => 'o',
            'é' | 'è' | 'ê' | 'ë' | 'ē' => 'e',
            'É' | 'È' | 'Ê' | 'Ë' | 'Ē' => 'e',
            other => other,
        })
        .collect();
    stripped
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn compare_optional_text(left: Option<&str>, right: Option<&str>) -> Ordering {
    normalize_search_text(left.unwrap_or_default())
        .cmp(&normalize_search_text(right.unwrap_or_default()))
}

impl DownloadedBooksManifest {
    pub fn from_downloaded_ids(ids: Vec<u32>) -> Self {
        let mut books = ids
            .into_iter()
            .map(|book_id| DownloadedBookEntry {
                book_id,
                title: None,
            })
            .collect::<Vec<_>>();
        books.sort_by_key(|entry| entry.book_id);
        books.dedup_by_key(|entry| entry.book_id);

        Self { books }
    }

    pub fn contains(&self, book_id: u32) -> bool {
        self.books.iter().any(|entry| entry.book_id == book_id)
    }

    pub fn upsert(&mut self, book_id: u32, title: Option<String>) {
        if let Some(existing) = self.books.iter_mut().find(|entry| entry.book_id == book_id) {
            if title.is_some() {
                existing.title = title;
            }
        } else {
            self.books.push(DownloadedBookEntry { book_id, title });
        }

        self.books.sort_by_key(|entry| entry.book_id);
        self.books.dedup_by_key(|entry| entry.book_id);
    }
}

impl MasterIndex {
    /// Build an index from the Arabic master archive plus optional English maps.
    pub fn from_archive(archive: MasterArchive, en: Option<EnMaps>) -> Self {
        let mut books = Vec::with_capacity(archive.books.len());
        let mut by_id = HashMap::with_capacity(archive.books.len());

        for (index, mut book) in archive.books.into_iter().enumerate() {
            // Inject English translations when available
            if let Some(ref maps) = en {
                book.en_name = maps.books.get(&book.id).cloned();
                book.en_author = maps.authors.get(&book.author.id).cloned();
                book.en_category = maps.categories.get(&book.category.id).cloned();
            }

            // Build a combined Arabic + English + ID search blob
            let search_blob = normalize_search_text(&[
                book.name.as_str(),
                book.en_name.as_deref().unwrap_or_default(),
                book.author.name.as_str(),
                book.en_author.as_deref().unwrap_or_default(),
                book.category.name.as_str(),
                book.en_category.as_deref().unwrap_or_default(),
                book.bibliography.as_str(),
                &book.id.to_string(), // numeric ID search
            ]
            .join(" "));

            by_id.insert(book.id, index);
            books.push(MasterBookRecord { book, search_blob });
        }

        Self { books, by_id }
    }

    pub fn get(&self, book_id: u32) -> Option<DenormalizedBook> {
        self.by_id
            .get(&book_id)
            .and_then(|index| self.books.get(*index))
            .map(|record| record.book.clone())
    }

    pub fn get_many(&self, book_ids: &[u32]) -> Vec<DenormalizedBook> {
        let mut items = book_ids
            .iter()
            .filter_map(|book_id| self.get(*book_id))
            .collect::<Vec<_>>();
        items.sort_by_key(|book| book.id);
        items
    }

    pub fn len(&self) -> usize {
        self.books.len()
    }

    pub fn query(&self, params: &MasterQueryParams) -> MasterQueryResult {
        // Normalize the query the same way as the search blob so diacritics
        // are stripped before matching.
        let normalized_query = normalize_search_text(&params.query);
        let terms: Vec<String> = normalized_query
            .split_whitespace()
            .map(str::to_owned)
            .collect();

        let mut matches = self
            .books
            .iter()
            .filter(|record| {
                terms
                    .iter()
                    .all(|term| record.search_blob.contains(term.as_str()))
            })
            .map(|record| record.book.clone())
            .collect::<Vec<_>>();

        let sort_key = params.sort_by.as_deref().unwrap_or("id");

        matches.sort_by(|left, right| {
            // Prefer English text for text sorts when available
            let ordering = match sort_key {
                "name" => compare_optional_text(
                    Some(left.en_name.as_deref().unwrap_or(left.name.as_str())),
                    Some(right.en_name.as_deref().unwrap_or(right.name.as_str())),
                ),
                "author" => compare_optional_text(
                    Some(left.en_author.as_deref().unwrap_or(left.author.name.as_str())),
                    Some(right.en_author.as_deref().unwrap_or(right.author.name.as_str())),
                ),
                "authorDeath" => left.author.death.cmp(&right.author.death),
                "category" => compare_optional_text(
                    Some(left.en_category.as_deref().unwrap_or(left.category.name.as_str())),
                    Some(right.en_category.as_deref().unwrap_or(right.category.name.as_str())),
                ),
                "printed" => left.printed.cmp(&right.printed),
                "version" => left.version.cmp(&right.version),
                _ => left.id.cmp(&right.id),
            };

            let stabilized = if ordering == Ordering::Equal {
                left.id.cmp(&right.id)
            } else {
                ordering
            };

            if params.sort_desc {
                stabilized.reverse()
            } else {
                stabilized
            }
        });

        let total = matches.len();
        let page_size = params.page_size.max(1);
        let start = params.page_index.saturating_mul(page_size);
        let items = matches
            .into_iter()
            .skip(start)
            .take(page_size)
            .collect::<Vec<_>>();

        MasterQueryResult {
            items,
            page_index: params.page_index,
            page_size,
            total,
            total_all: self.len(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_archive() -> MasterArchive {
        MasterArchive {
            timestamp: 1,
            version: 2,
            books: vec![
                DenormalizedBook {
                    id: 2,
                    name: "كتاب الطهارة".into(),
                    bibliography: "شرح مختصر".into(),
                    printed: 1,
                    version: "3.0".into(),
                    author: DenormalizedAuthor {
                        id: 1,
                        name: "ابن حجر".into(),
                        death: Some(852),
                        biography: None,
                    },
                    category: DenormalizedCategory {
                        id: 1,
                        name: "فقه".into(),
                        order: 1,
                    },
                    ..Default::default()
                },
                DenormalizedBook {
                    id: 1,
                    name: "كتاب الحديث".into(),
                    bibliography: "جامع".into(),
                    printed: 0,
                    version: "1.0".into(),
                    author: DenormalizedAuthor {
                        id: 2,
                        name: "النووي".into(),
                        death: Some(676),
                        biography: None,
                    },
                    category: DenormalizedCategory {
                        id: 2,
                        name: "حديث".into(),
                        order: 2,
                    },
                    ..Default::default()
                },
            ],
        }
    }

    #[test]
    fn query_filters_sorts_and_paginates() {
        let index = MasterIndex::from_archive(sample_archive(), None);
        let result = index.query(&MasterQueryParams {
            page_index: 0,
            page_size: 1,
            query: "ابن حجر".into(),
            sort_by: Some("name".into()),
            sort_desc: false,
        });

        assert_eq!(result.total, 1);
        assert_eq!(result.total_all, 2);
        assert_eq!(result.items[0].id, 2);
    }

    #[test]
    fn manifest_upsert_is_stable_and_deduplicated() {
        let mut manifest = DownloadedBooksManifest::from_downloaded_ids(vec![9, 1, 9]);
        manifest.upsert(2, Some("Second".into()));
        manifest.upsert(1, Some("First".into()));

        assert_eq!(
            manifest.books,
            vec![
                DownloadedBookEntry {
                    book_id: 1,
                    title: Some("First".into()),
                },
                DownloadedBookEntry {
                    book_id: 2,
                    title: Some("Second".into()),
                },
                DownloadedBookEntry {
                    book_id: 9,
                    title: None,
                },
            ]
        );
    }

    #[test]
    fn en_translation_maps_are_built_correctly() {
        let en = EnTranslation {
            excerpts: vec![EnExcerpt {
                id: "B2".into(),
                text: Some("Book of Purification".into()),
            }],
            headings: vec![EnExcerpt {
                id: "A1".into(),
                text: Some("Ibn Hajar".into()),
            }],
            footnotes: vec![EnExcerpt {
                id: "C1".into(),
                text: Some("Jurisprudence".into()),
            }],
        };
        let maps = en.into_maps();
        assert_eq!(maps.books.get(&2), Some(&"Book of Purification".to_string()));
        assert_eq!(maps.authors.get(&1), Some(&"Ibn Hajar".to_string()));
        assert_eq!(maps.categories.get(&1), Some(&"Jurisprudence".to_string()));
    }

    #[test]
    fn en_translations_injected_into_index() {
        let en = EnTranslation {
            excerpts: vec![EnExcerpt {
                id: "B2".into(),
                text: Some("Book of Purification".into()),
            }],
            headings: vec![],
            footnotes: vec![],
        };
        let index = MasterIndex::from_archive(sample_archive(), Some(en.into_maps()));
        let book = index.get(2).unwrap();
        assert_eq!(book.en_name.as_deref(), Some("Book of Purification"));
        assert_eq!(book.en_author, None);
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[test]
    #[ignore]
    fn parse_cached_master() {
        let path = std::path::PathBuf::from(
            "/Users/rhaq/Library/Application Support/com.muslimcode.libaby/master.json",
        );
        let bytes = std::fs::read(&path).expect("master.json not found");
        let archive: MasterArchive =
            serde_json::from_slice(&bytes).expect("parse failed");
        assert!(!archive.books.is_empty(), "no books parsed");
        println!("Parsed {} books", archive.books.len());
    }
}
