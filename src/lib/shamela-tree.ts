import { convertContentToMarkdown, mapPageCharacterContent, stripHtmlTags } from "shamela/content";
import type { Page, Title } from "shamela";

export type ShamelaTitleNode = {
  pageId: number | null;
  title: Title;
  label: string;
  children: ShamelaTitleNode[];
};

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeMarkdownText(text: string) {
  return normalizeWhitespace(text.replace(/#+/g, " "));
}

function buildPageLookups(pages: Page[]) {
  const byTitlePage = new Map<number, number>();
  const byNumericPage = new Map<number, number>();
  const byPrintedPage = new Map<number, number>();

  for (const page of pages) {
    byTitlePage.set(page.id, page.id);
    if (typeof page.page === "number") {
      byNumericPage.set(page.page, page.id);
    }

    if (page.number) {
      const printedPage = Number(page.number);
      if (!Number.isNaN(printedPage)) {
        byPrintedPage.set(printedPage, page.id);
      }
    }
  }

  return { byNumericPage, byPrintedPage, byTitlePage };
}

function resolveTitlePageId(
  title: Title,
  lookups: ReturnType<typeof buildPageLookups>,
) {
  return (
    lookups.byTitlePage.get(title.page) ??
    lookups.byNumericPage.get(title.page) ??
    lookups.byPrintedPage.get(title.page) ??
    null
  );
}

function sanitizeMarkdownText(text: string) {
  return normalizeMarkdownText(stripHtmlTags(mapPageCharacterContent(text)));
}

function buildNodeTree(
  parentId: number | null,
  childrenByParent: Map<number | null, Title[]>,
  pageLookups: ReturnType<typeof buildPageLookups>,
): ShamelaTitleNode[] {
  const children = childrenByParent.get(parentId) ?? [];

  return children.map((title) => {
    const label = sanitizeShamelaText(title.content) || `Section ${title.id}`;

    return {
      title,
      label,
      pageId: resolveTitlePageId(title, pageLookups),
      children: buildNodeTree(title.id, childrenByParent, pageLookups),
    };
  });
}

export function sanitizeShamelaText(text: string) {
  const markdown = convertContentToMarkdown(mapPageCharacterContent(text));
  return sanitizeMarkdownText(markdown);
}

export function buildShamelaTitleTree(
  titles: Title[],
  pages: Page[],
): ShamelaTitleNode[] {
  const sortedTitles = [...titles].sort((a, b) => a.page - b.page || a.id - b.id);
  const childrenByParent = new Map<number | null, Title[]>();

  for (const title of sortedTitles) {
    const parentId = title.parent ?? null;
    const siblings = childrenByParent.get(parentId);
    if (siblings) {
      siblings.push(title);
    } else {
      childrenByParent.set(parentId, [title]);
    }
  }

  return buildNodeTree(null, childrenByParent, buildPageLookups(pages));
}
