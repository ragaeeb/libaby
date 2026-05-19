import {
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import type * as React from "react";
import {
  Fragment,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { loadBookResource } from "@/lib/book-resource-store";
import {
  getMasterBooksByIds,
  listDownloadedBooks,
  type DownloadedBookEntry,
} from "@/lib/huggingface";
import { type ShamelaTitleNode } from "@/lib/shamela-tree";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/useSettingsStore";

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);
const ShamelaPage = lazy(() =>
  import("@/pages/ShamelaPage").then((module) => ({ default: module.ShamelaPage })),
);
const BookDetailPage = lazy(() =>
  import("@/pages/BookDetailPage").then((module) => ({ default: module.BookDetailPage })),
);
const BookPagesPage = lazy(() =>
  import("@/pages/BookPagesPage").then((module) => ({ default: module.BookPagesPage })),
);
const BookPageView = lazy(() =>
  import("@/pages/BookPageView").then((module) => ({ default: module.BookPageView })),
);

type BookRouteBase = {
  bookId: number;
  bookTitle?: string;   // English / transliterated title
  bookArTitle?: string; // Original Arabic title
};

export type Route =
  | { page: "dashboard" }
  | { page: "settings" }
  | { page: "shamela-books" }
  | ({ page: "shamela-book" } & BookRouteBase)
  | ({ page: "shamela-book-pages" } & BookRouteBase)
  | ({ page: "shamela-book-page"; pageId: number; pageNumber?: string | number } & BookRouteBase);

type SimplePageId = "dashboard" | "settings" | "shamela-books";

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  pageId: SimplePageId;
  children?: BookNavItem[];
};

type BookNavItem = {
  bookId: number;
  label: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

type UserData = {
  name: string;
  email: string;
  avatar: string;
};

type BreadcrumbEntry = { label: string; onClick?: () => void };

type TitleTreeState = {
  status: "idle" | "loading" | "loaded" | "error";
  tree: ShamelaTitleNode[];
};

const userData: UserData = {
  avatar: "",
  email: "",
  name: "User",
};

const overviewGroup: NavGroup = {
  defaultOpen: true,
  items: [
    { icon: LayoutDashboard, label: "Dashboard", pageId: "dashboard" },
    { icon: Settings, label: "Settings", pageId: "settings" },
  ],
  title: "Overview",
};

function isBookRoute(route: Route): route is Extract<Route, { bookId: number }> {
  return "bookId" in route;
}

function isNavItemActive(itemPageId: string, route: Route): boolean {
  if (route.page === itemPageId) return true;
  if (itemPageId === "shamela-books" && route.page.startsWith("shamela-book")) return true;
  return false;
}

function getActiveBookId(route: Route): number | null {
  return isBookRoute(route) ? route.bookId : null;
}

function getBreadcrumbs(
  route: Route,
  getBookName: (id: number, fallbackTitle?: string) => string,
  onNavigate: (route: Route) => void,
): BreadcrumbEntry[] {
  switch (route.page) {
    case "dashboard":
      return [{ label: "Overview" }, { label: "Dashboard" }];
    case "settings":
      return [{ label: "Overview" }, { label: "Settings" }];
    case "shamela-books":
      return [{ label: "Shamela" }, { label: "Books" }];
    case "shamela-book":
      return [
        { label: "Shamela" },
        { label: "Books", onClick: () => onNavigate({ page: "shamela-books" }) },
        { label: getBookName(route.bookId, route.bookTitle) },
      ];
    case "shamela-book-pages":
      return [
        { label: "Shamela" },
        { label: "Books", onClick: () => onNavigate({ page: "shamela-books" }) },
        {
          label: getBookName(route.bookId, route.bookTitle),
          onClick: () => onNavigate({ bookId: route.bookId, bookTitle: route.bookTitle, page: "shamela-book" }),
        },
        { label: "Pages" },
      ];
    case "shamela-book-page":
      return [
        { label: "Shamela" },
        { label: "Books", onClick: () => onNavigate({ page: "shamela-books" }) },
        {
          label: getBookName(route.bookId, route.bookTitle),
          onClick: () => onNavigate({ bookId: route.bookId, bookTitle: route.bookTitle, page: "shamela-book" }),
        },
        {
          label: "Pages",
          onClick: () =>
            onNavigate({
              bookId: route.bookId,
              bookTitle: route.bookTitle,
              page: "shamela-book-pages",
            }),
        },
        { label: route.pageNumber != null ? `Page ${route.pageNumber}` : `Page ${route.pageId}` },
      ];
  }
}

const SidebarLogo = () => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg">
        <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
          <BookOpen className="size-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-medium">Libaby</span>
          <span className="text-xs text-muted-foreground">Islamic Text Tools</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
);

const NavMenuItem = ({
  item,
  route,
  onNavigate,
}: {
  item: NavItem;
  route: Route;
  onNavigate: (route: Route) => void;
}) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  const active = isNavItemActive(item.pageId, route);
  const activeBookId = getActiveBookId(route);
  const isChildActive = item.children?.some((child) => activeBookId === child.bookId) ?? false;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton isActive={active} onClick={() => onNavigate({ page: item.pageId })}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible" render={<SidebarMenuItem />}>
      <SidebarMenuButton isActive={active || isChildActive} onClick={() => onNavigate({ page: item.pageId })}>
        <Icon className="size-4" />
        <span>{item.label}</span>
      </SidebarMenuButton>
      <CollapsibleTrigger
        render={<SidebarMenuAction aria-label={`Toggle ${item.label}`} showOnHover={false} />}
      >
        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.bookId}>
              <SidebarMenuSubButton
                className="h-auto cursor-pointer items-start py-1.5"
                isActive={activeBookId === child.bookId}
                onClick={() =>
                  onNavigate({ bookId: child.bookId, bookTitle: child.label, page: "shamela-book" })
                }
              >
                <FileText className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 whitespace-normal break-words leading-5">
                  {child.label}
                </span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

function titleTreeHasActiveNode(nodes: ShamelaTitleNode[], pageId: number): boolean {
  return nodes.some(
    (node) => node.pageId === pageId || titleTreeHasActiveNode(node.children, pageId),
  );
}

const DownloadedTitleMenuItem = ({
  node,
  bookId,
  bookTitle,
  route,
  onNavigate,
}: {
  node: ShamelaTitleNode;
  bookId: number;
  bookTitle: string;
  route: Route;
  onNavigate: (route: Route) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const activePageId = route.page === "shamela-book-page" && route.bookId === bookId ? route.pageId : null;
  const active = activePageId === node.pageId;
  const descendantActive = activePageId !== null ? titleTreeHasActiveNode(node.children, activePageId) : false;
  const [open, setOpen] = useState(active || descendantActive);

  useEffect(() => {
    if (active || descendantActive) {
      setOpen(true);
    }
  }, [active, descendantActive]);

  const navigate = useCallback(() => {
    if (node.pageId !== null) {
      onNavigate({ bookId, bookTitle, page: "shamela-book-page", pageId: node.pageId });
    }
  }, [bookId, bookTitle, node.pageId, onNavigate]);

  if (!hasChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          className="h-auto cursor-pointer items-start py-1.5"
          isActive={active}
          onClick={node.pageId !== null ? navigate : undefined}
        >
          <FileText className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 whitespace-normal break-words text-right leading-5" dir="rtl">
            {node.label}
          </span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible" render={<SidebarMenuSubItem />}>
      <SidebarMenuSubButton
        className="h-auto cursor-pointer items-start py-1.5"
        isActive={active}
        onClick={node.pageId !== null ? navigate : undefined}
      >
        <FileText className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0 whitespace-normal break-words text-right leading-5" dir="rtl">
          {node.label}
        </span>
      </SidebarMenuSubButton>
      <CollapsibleTrigger
        render={<SidebarMenuAction aria-label={`Toggle ${node.label}`} showOnHover={false} />}
      >
        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {node.children.map((child) => (
            <DownloadedTitleMenuItem
              key={child.title.id}
              node={child}
              bookId={bookId}
              bookTitle={bookTitle}
              route={route}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

const DownloadedBookMenuItem = ({
  book,
  route,
  treeState,
  onExpand,
  onNavigate,
}: {
  book: BookNavItem;
  route: Route;
  treeState: TitleTreeState;
  onExpand: (bookId: number) => void;
  onNavigate: (route: Route) => void;
}) => {
  const activeBookId = getActiveBookId(route);
  const active = activeBookId === book.bookId;
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  const navigateToBook = useCallback(() => {
    onNavigate({ page: "shamela-book", bookId: book.bookId, bookTitle: book.label });
  }, [book.bookId, book.label, onNavigate]);

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          onExpand(book.bookId);
        }
      }}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <SidebarMenuButton isActive={active} onClick={navigateToBook}>
        <BookOpen className="size-4" />
        <span className="min-w-0 truncate">{book.label}</span>
      </SidebarMenuButton>
      <CollapsibleTrigger
        render={<SidebarMenuAction aria-label={`Toggle ${book.label}`} showOnHover={false} />}
      >
        <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {treeState.status === "loading" && (
            <SidebarMenuSubItem>
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Loading sections…
              </div>
            </SidebarMenuSubItem>
          )}
          {treeState.status === "error" && (
            <SidebarMenuSubItem>
              <div className="px-2 py-1.5 text-right text-xs text-muted-foreground">
                Could not load sections
              </div>
            </SidebarMenuSubItem>
          )}
          {treeState.status === "loaded" && treeState.tree.length > 0
            ? treeState.tree.map((node) => (
                <DownloadedTitleMenuItem
                  key={node.title.id}
                  node={node}
                  bookId={book.bookId}
                  bookTitle={book.label}
                  route={route}
                  onNavigate={onNavigate}
                />
              ))
            : null}
          {treeState.status === "loaded" && treeState.tree.length === 0 && (
            <SidebarMenuSubItem>
              <div className="px-2 py-1.5 text-right text-xs text-muted-foreground">
                No titles available
              </div>
            </SidebarMenuSubItem>
          )}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

const ShamelaBooksSection = ({
  route,
  books,
  titleTrees,
  onExpand,
  onNavigate,
}: {
  route: Route;
  books: BookNavItem[];
  titleTrees: Record<number, TitleTreeState>;
  onExpand: (bookId: number) => void;
  onNavigate: (route: Route) => void;
}) => {
  const [open, setOpen] = useState(true);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Shamela</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible" render={<SidebarMenuItem />}>
            <SidebarMenuButton
              isActive={route.page.startsWith("shamela-book")}
              onClick={() => onNavigate({ page: "shamela-books" })}
            >
              <BookOpen className="size-4" />
              <span>Books</span>
            </SidebarMenuButton>
            <CollapsibleTrigger
              render={<SidebarMenuAction aria-label="Toggle Books" showOnHover={false} />}
            >
              <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {books.map((book) => (
                  <DownloadedBookMenuItem
                    key={book.bookId}
                    book={book}
                    route={route}
                    treeState={titleTrees[book.bookId] ?? { status: "idle", tree: [] }}
                    onExpand={onExpand}
                    onNavigate={onNavigate}
                  />
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

const NavUser = ({ user }: { user: UserData }) => (
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            />
          }
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-lg">
              {user.name
                .split(" ")
                .map((name) => name[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Account
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOut className="mr-2 size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
);

const NavGroupSection = ({
  group,
  route,
  onNavigate,
}: {
  group: NavGroup;
  route: Route;
  onNavigate: (route: Route) => void;
}) => (
  <SidebarGroup>
    <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {group.items.map((item) => (
          <NavMenuItem key={item.label} item={item} route={route} onNavigate={onNavigate} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);

function LoadingPage() {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 p-6">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

function BookPageViewWrapper({
  route,
  onNavigate,
  knownBookTitles,
}: {
  route: Extract<Route, { page: "shamela-book-page" }>;
  onNavigate: (r: Route) => void;
  knownBookTitles: Record<number, string>;
}) {
  // Memoize bookMeta so BookPageView gets a stable reference — a new object
  // literal on every render was causing BookPageView to re-render and
  // recompute expensive citationText on every parent state change.
  const bookMeta = useMemo(
    () => ({
      bookId: route.bookId,
      enTitle: knownBookTitles[route.bookId] ?? route.bookTitle,
      arTitle: route.bookArTitle, // Arabic title kept separate from English bookTitle
    }),
    [route.bookId, route.bookTitle, route.bookArTitle, knownBookTitles],
  );

  return (
    <BookPageView
      bookId={route.bookId}
      pageId={route.pageId}
      onNavigate={onNavigate}
      bookMeta={bookMeta}
    />
  );
}

function PageContent({
  route,
  onNavigate,
  onBookResolved,
  knownBookTitles,
}: {
  route: Route;
  onNavigate: (route: Route) => void;
  onBookResolved: (bookId: number, title: string) => void;
  knownBookTitles: Record<number, string>;
}) {
  return (
    <Suspense fallback={<LoadingPage />}>
      {route.page === "settings" ? (
        <SettingsPage />
      ) : route.page === "shamela-books" ? (
        <ShamelaPage
          onBookClick={(bookId, bookTitle) => {
            onBookResolved(bookId, bookTitle);
            onNavigate({ bookId, bookTitle, page: "shamela-book" });
          }}
        />
      ) : route.page === "shamela-book" ? (
        <BookDetailPage bookId={route.bookId} onNavigate={onNavigate} onBookResolved={onBookResolved} />
      ) : route.page === "shamela-book-pages" ? (
        <BookPagesPage bookId={route.bookId} onNavigate={onNavigate} />
      ) : route.page === "shamela-book-page" ? (
        <BookPageViewWrapper route={route} onNavigate={onNavigate} knownBookTitles={knownBookTitles} />
      ) : (
        <DashboardPage onNavigate={onNavigate} />
      )}
    </Suspense>
  );
}

function enrichRoute(
  route: Route,
  knownBookTitles: Record<number, string>,
  currentRoute: Route,
): Route {
  if (!isBookRoute(route)) {
    return route;
  }

  if (route.bookTitle) {
    return route;
  }

  const currentBookTitle =
    isBookRoute(currentRoute) && currentRoute.bookId === route.bookId
      ? currentRoute.bookTitle
      : undefined;

  return {
    ...route,
    bookTitle: knownBookTitles[route.bookId] ?? currentBookTitle,
  };
}

export function ApplicationShell1({ className }: { className?: string }) {
  const [currentRoute, setCurrentRoute] = useState<Route>({ page: "dashboard" });
  const [downloadedBooks, setDownloadedBooks] = useState<DownloadedBookEntry[]>([]);
  const [downloadedBookTrees, setDownloadedBookTrees] = useState<Record<number, TitleTreeState>>({});
  const [knownBookTitles, setKnownBookTitles] = useState<Record<number, string>>({}); 

  const shamelaVerified = useSettingsStore((state) => state.shamelaAccessVerified);
  const token = useSettingsStore((state) => state.huggingfaceToken);
  const dataset = useSettingsStore((state) => state.shamelaDataset);
  const hydrate = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const recordBookTitle = useCallback((bookId: number, title: string) => {
    setKnownBookTitles((current) => {
      if (current[bookId] === title) {
        return current;
      }

      return {
        ...current,
        [bookId]: title,
      };
    });
  }, []);

  const refreshDownloadedBooks = useEffectEvent(async () => {
    const entries = await listDownloadedBooks();
    setDownloadedBooks(entries);

    // Build the initial title map from manifest entries (may be Arabic)
    const titleMap: Record<number, string> = {};
    for (const entry of entries) {
      if (entry.title) titleMap[entry.book_id] = entry.title;
    }

    // Overwrite with English titles from master index when available.
    // Falls back gracefully if master is not yet loaded.
    if (entries.length > 0) {
      try {
        const books = await getMasterBooksByIds(entries.map((e) => e.book_id));
        for (const book of books) {
          const enTitle = book.en_name ?? book.name;
          titleMap[book.id] = enTitle;
        }
      } catch {
        // master not cached yet — Arabic fallback is already in titleMap
      }
    }

    setKnownBookTitles((current) => {
      let changed = false;
      const next = { ...current };
      for (const [idStr, title] of Object.entries(titleMap)) {
        const id = Number(idStr);
        if (current[id] !== title) {
          next[id] = title;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  });

  useEffect(() => {
    if (!shamelaVerified) {
      setDownloadedBooks([]);
      setDownloadedBookTrees({});
      return;
    }

    void refreshDownloadedBooks();

    const handleDownloaded = (event: Event) => {
      const detail = (event as CustomEvent<{ bookId?: number; title?: string }>).detail;
      if (detail?.bookId && detail.title) {
        recordBookTitle(detail.bookId, detail.title);
      }
      void refreshDownloadedBooks();
    };

    window.addEventListener("shamela-book-downloaded", handleDownloaded);
    return () => {
      window.removeEventListener("shamela-book-downloaded", handleDownloaded);
    };
  // refreshDownloadedBooks and recordBookTitle are useEffectEvent / stable
  // useCallback — they must NOT be in deps or they create new references
  // on every render and cause an infinite loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shamelaVerified]);

  const ensureTitleTree = useCallback(
    async (bookId: number) => {
      setDownloadedBookTrees((current) => {
        const existing = current[bookId];
        if (existing && (existing.status === "loading" || existing.status === "loaded")) {
          return current;
        }

        return {
          ...current,
          [bookId]: { status: "loading", tree: [] },
        };
      });

      try {
        const resource = await loadBookResource({
          bookId,
          token,
          dataset,
          allowDownload: false,
        });

        setDownloadedBookTrees((current) => ({
          ...current,
          [bookId]: { status: "loaded", tree: resource.titleTree },
        }));
      } catch {
        setDownloadedBookTrees((current) => ({
          ...current,
          [bookId]: { status: "error", tree: [] },
        }));
      }
    },
    [dataset, token],
  );

  const onNavigate = useCallback(
    (route: Route) => {
      setCurrentRoute((current) => enrichRoute(route, knownBookTitles, current));
    },
    [knownBookTitles],
  );

  const getBookName = useCallback(
    (id: number, fallbackTitle?: string) => knownBookTitles[id] ?? fallbackTitle ?? `Book ${id}`,
    [knownBookTitles],
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(currentRoute, getBookName, onNavigate),
    [currentRoute, getBookName, onNavigate],
  );

  const downloadedBooksNav = useMemo(
    () =>
      downloadedBooks.map((entry) => ({
        bookId: entry.book_id,
        label: getBookName(entry.book_id, entry.title ?? undefined),
      })),
    [downloadedBooks, getBookName],
  );

  const navGroups: NavGroup[] = [overviewGroup];

  return (
    <SidebarProvider className={cn("h-screen overflow-hidden", className)}>
      <Sidebar>
        <SidebarHeader>
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="min-h-0 flex-1">
            {navGroups.map((group) => (
              <NavGroupSection
                key={group.title}
                group={group}
                route={currentRoute}
                onNavigate={onNavigate}
              />
            ))}
            {shamelaVerified && downloadedBooksNav.length > 0 && (
              <ShamelaBooksSection
                route={currentRoute}
                books={downloadedBooksNav}
                titleTrees={downloadedBookTrees}
                onExpand={(bookId) => {
                  void ensureTitleTree(bookId);
                }}
                onNavigate={onNavigate}
              />
            )}
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={userData} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 hidden data-[orientation=vertical]:h-4 md:block"
          />
          <Breadcrumb className="hidden min-w-0 flex-1 md:block">
            <BreadcrumbList className="flex-nowrap">
              {breadcrumbs.map((item, index) => (
                <Fragment key={item.label}>
                  {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
                  <BreadcrumbItem className="min-w-0">
                    {item.onClick ? (
                      <BreadcrumbLink
                        onClick={item.onClick}
                        className="block max-w-[180px] cursor-pointer truncate"
                      >
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="block max-w-[200px] truncate">
                        {item.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PageContent route={currentRoute} onNavigate={onNavigate} onBookResolved={recordBookTitle} knownBookTitles={knownBookTitles} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
