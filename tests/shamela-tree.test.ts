import { describe, expect, test } from "bun:test";
import type { Page, Title } from "shamela";
import { buildShamelaTitleTree, sanitizeShamelaText } from "../src/lib/shamela-tree";

const titles: Title[] = [
  { id: 1, page: 1, parent: null, lvl: 1, tit: "", content: "الباب الأول" },
  { id: 2, page: 2, parent: 1, lvl: 2, tit: "", content: "فصل <b>ثان</b>" },
];

const pages: Page[] = [
  { id: 10, page: 1, number: "1", part: "1", nassi: 0, content: "alpha" },
  { id: 20, page: 2, number: "2", part: "1", nassi: 0, content: "beta" },
];

describe("buildShamelaTitleTree", () => {
  test("builds a nested tree and resolves page ids without repeated scans in callers", () => {
    const tree = buildShamelaTitleTree(titles, pages);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.pageId).toBe(10);
    expect(tree[0]?.label).toBe("الباب الأول");
    expect(tree[0]?.children[0]?.pageId).toBe(20);
    expect(tree[0]?.children[0]?.label).toBe("فصل ثان");
  });
});

describe("sanitizeShamelaText", () => {
  test("normalizes whitespace and strips tags after character mapping", () => {
    expect(sanitizeShamelaText("  <b>باب</b>\n\nالطهارة  ")).toBe("باب الطهارة");
  });
});
