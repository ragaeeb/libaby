import { describe, expect, test } from "bun:test";
import type { BookData } from "shamela";
import { buildBookResource, createBookResourceCache, filterPageRows } from "../src/lib/book-resource";

const sampleBook: BookData = {
  id: 42,
  titles: [
    { id: 1, page: 10, parent: null, lvl: 1, tit: "", content: "مقدمة" },
    { id: 2, page: 11, parent: 1, lvl: 2, tit: "", content: "باب الطهارة" },
  ],
  pages: [
    { id: 10, page: 1, number: "1", part: "1", nassi: 0, content: "<span data-type=\"title\">مقدمة</span>قال الإمام رحمه الله" },
    { id: 11, page: 2, number: "2", part: "1", nassi: 0, content: "<span data-type=\"title\">باب الطهارة</span>هذا باب في الطهارة" },
    { id: 12, page: 3, number: "3", part: "1", nassi: 0, content: "is_deleted" },
  ],
};

describe("buildBookResource", () => {
  test("precomputes filtered page rows and page indexes", () => {
    const resource = buildBookResource(42, sampleBook);

    expect(resource.pageRows).toHaveLength(2);
    expect(resource.pageIndexById.get(10)).toBe(0);
    expect(resource.pageIndexById.get(11)).toBe(1);
    expect(resource.titleTree).toHaveLength(1);
    expect(resource.titleTree[0]?.children).toHaveLength(1);
  });
});

describe("filterPageRows", () => {
  test("matches multi-term normalized content", () => {
    const resource = buildBookResource(42, sampleBook);
    const rows = filterPageRows(resource.pageRows, "باب الطهارة");

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(11);
  });
});

describe("createBookResourceCache", () => {
  test("deduplicates concurrent loads for the same book", async () => {
    let calls = 0;
    const cache = createBookResourceCache({
      maxEntries: 2,
      loadBook: async (bookId) => {
        calls += 1;
        return buildBookResource(bookId, sampleBook);
      },
    });

    const [first, second] = await Promise.all([cache.get(42), cache.get(42)]);

    expect(calls).toBe(1);
    expect(first).toBe(second);
  });

  test("evicts the least recently used entry", async () => {
    const cache = createBookResourceCache({
      maxEntries: 2,
      loadBook: async (bookId) =>
        buildBookResource(bookId, {
          ...sampleBook,
          id: bookId,
        }),
    });

    await cache.get(1);
    await cache.get(2);
    await cache.get(3);

    expect(cache.peek(1)).toBeNull();
    expect(cache.peek(2)?.bookId).toBe(2);
    expect(cache.peek(3)?.bookId).toBe(3);
  });
});
