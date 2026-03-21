import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Page, Title } from "@/types/books";
import { convertContentToMarkdown, mapPageCharacterContent } from "../../shamela/src/content.ts";

const FOOTNOTE_MARKER = "_________";

type Block = { kind: "heading"; level: number; text: string } | { kind: "paragraph"; text: string };

type ShamelaContentProps = {
  content: string;
  className?: string;
  compact?: boolean;
  previewBlocks?: number;
  showFootnotes?: boolean;
};

export type ShamelaTitleNode = {
  pageId: number | null;
  title: Title;
  children: ShamelaTitleNode[];
};

function toMarkdown(content: string) {
  return convertContentToMarkdown(mapPageCharacterContent(content));
}

function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({ kind: "paragraph", text: paragraphLines.join("\n").trim() });
    paragraphLines = [];
  };

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return blocks;
}

function resolveTitlePageId(title: Title, pages: Page[]) {
  const exactPage = pages.find((page) => page.id === title.page);
  if (exactPage) return exactPage.id;

  const numericPage = pages.find((page) => page.page === title.page);
  if (numericPage) return numericPage.id;

  const printedPage = pages.find((page) => Number(page.number) === title.page);
  if (printedPage) return printedPage.id;

  return null;
}

function buildNodeTree(
  titles: Title[],
  pages: Page[],
  parentId: number | null,
): ShamelaTitleNode[] {
  return titles
    .filter((title) => (title.parent ?? null) === parentId)
    .sort((a, b) => a.page - b.page || a.id - b.id)
    .map((title) => ({
      title,
      pageId: resolveTitlePageId(title, pages),
      children: buildNodeTree(titles, pages, title.id),
    }));
}

export function buildShamelaTitleTree(titles: Title[], pages: Page[]): ShamelaTitleNode[] {
  return buildNodeTree(titles, pages, null);
}

export function sanitizeShamelaText(text: string) {
  return mapPageCharacterContent(text).replace(/\s+/g, " ").trim();
}

function renderBlock(block: Block, index: number, compact: boolean) {
  if (block.kind === "heading") {
    const headingClassName = compact
      ? "rounded-md bg-primary/8 px-3 py-2 text-right text-sm font-semibold leading-snug text-foreground"
      : "rounded-md bg-primary/8 px-5 py-3 text-right text-xl font-bold leading-snug text-foreground";

    return (
      <div key={`${block.kind}-${index}`} className={headingClassName}>
        <h2 dir="rtl">{block.text}</h2>
      </div>
    );
  }

  const paragraphClassName = compact
    ? "whitespace-pre-line text-right text-sm leading-7 text-foreground/90"
    : "whitespace-pre-line text-right text-base leading-8 text-foreground/90";

  return (
    <p key={`${block.kind}-${index}`} className={paragraphClassName} dir="rtl">
      {block.text}
    </p>
  );
}

export function ShamelaContent({
  content,
  className,
  compact = false,
  previewBlocks,
  showFootnotes = true,
}: ShamelaContentProps) {
  const [bodyContent, footnoteContent = ""] = content.split(FOOTNOTE_MARKER);

  const bodyBlocks = useMemo(() => {
    const blocks = toBlocks(toMarkdown(bodyContent));
    return typeof previewBlocks === "number" ? blocks.slice(0, previewBlocks) : blocks;
  }, [bodyContent, previewBlocks]);

  const footnoteBlocks = useMemo(() => {
    if (!showFootnotes || !footnoteContent.trim()) return [];
    return toBlocks(toMarkdown(footnoteContent));
  }, [footnoteContent, showFootnotes]);

  return (
    <div className={cn("space-y-6", className)} dir="rtl">
      <div className={cn("space-y-4", compact && "space-y-3")}>
        {bodyBlocks.map((block, index) => renderBlock(block, index, compact))}
      </div>

      {showFootnotes && footnoteBlocks.length > 0 && (
        <div className="border-t pt-6">
          {footnoteBlocks.map((block, index) => renderBlock(block, index, true))}
        </div>
      )}
    </div>
  );
}

export function getShamelaSearchText(content: string) {
  return sanitizeShamelaText(toMarkdown(content)).toLowerCase();
}
