import { downloadFile, fileExists, whoAmI } from "@huggingface/hub";
import { invoke } from "@tauri-apps/api/core";
import type { BookData, MasterArchive } from "@/types/books";

const MASTER_PATH = "master.json.br";

export async function validateToken(token: string): Promise<{ valid: boolean; username?: string }> {
  try {
    const info = await whoAmI({ credentials: { accessToken: token } });
    return { valid: true, username: info.name };
  } catch {
    return { valid: false };
  }
}

export async function checkDatasetAccess(token: string, dataset: string): Promise<boolean> {
  try {
    return await fileExists({
      credentials: { accessToken: token },
      repo: { name: dataset, type: "dataset" },
      path: MASTER_PATH,
    });
  } catch {
    return false;
  }
}

export async function validateAccess(
  token: string,
  dataset: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!token.trim()) return { ok: false, error: "HuggingFace token is required" };
  if (!dataset.trim()) return { ok: false, error: "Shamela dataset is required" };

  const { valid } = await validateToken(token);
  if (!valid) return { ok: false, error: "Invalid HuggingFace token" };

  const hasAccess = await checkDatasetAccess(token, dataset);
  if (!hasAccess) return { ok: false, error: `No access to dataset "${dataset}" or ${MASTER_PATH} not found` };

  return { ok: true };
}

async function downloadAndCacheMaster(
  token: string,
  dataset: string,
): Promise<MasterArchive> {
  const path = "master.json.br";
  const response = await downloadFile({
    credentials: { accessToken: token },
    repo: { name: dataset, type: "dataset" },
    path,
  });

  if (!response) {
    throw new Error(`${path} not found in ${dataset}`);
  }

  const compressed = new Uint8Array(await response.arrayBuffer());
  const text = await invoke<string>("decompress_and_cache_master", {
    data: Array.from(compressed),
  });

  return JSON.parse(text) as MasterArchive;
}

export async function loadCachedMaster(): Promise<MasterArchive | null> {
  try {
    const cached = await invoke<boolean>("is_master_cached");
    if (!cached) return null;
    const text = await invoke<string>("read_cached_master");
    return JSON.parse(text) as MasterArchive;
  } catch {
    return null;
  }
}

export async function loadMasterBooks(
  token: string,
  dataset: string,
): Promise<MasterArchive> {
  const cached = await loadCachedMaster();
  if (cached) return cached;
  return downloadAndCacheMaster(token, dataset);
}

export async function downloadBookData(
  token: string,
  dataset: string,
  bookId: number,
): Promise<BookData> {
  const path = `${bookId}.json.br`;
  const response = await downloadFile({
    credentials: { accessToken: token },
    repo: { name: dataset, type: "dataset" },
    path,
  });

  if (!response) {
    throw new Error(`${path} not found in ${dataset}`);
  }

  const compressed = new Uint8Array(await response.arrayBuffer());
  const text = await invoke<string>("decompress_and_cache_book", {
    bookId: String(bookId),
    data: Array.from(compressed),
  });

  return JSON.parse(text) as BookData;
}

export async function loadCachedBook(bookId: number): Promise<BookData | null> {
  try {
    const cached = await invoke<boolean>("is_book_cached", { bookId: String(bookId) });
    if (!cached) return null;
    const text = await invoke<string>("read_cached_book", { bookId: String(bookId) });
    return JSON.parse(text) as BookData;
  } catch {
    return null;
  }
}
