import {
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import type * as React from "react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { listDownloadedBookIds, loadCachedBook, loadMasterBooks } from "@/lib/huggingface";
import { buildShamelaTitleTree, sanitizeShamelaText, type ShamelaTitleNode } from "@/lib/shamela-content";
import { cn } from "@/lib/utils";
import { BookDetailPage } from "@/pages/BookDetailPage";
import { BookPagesPage } from "@/pages/BookPagesPage";
import { BookPageView } from "@/pages/BookPageView";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ShamelaPage } from "@/pages/ShamelaPage";
import { useBooksStore } from "@/stores/useBooksStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export type Route =
  | { page: "dashboard" }
  | { page: "settings" }
  | { page: "shamela-books" }
  | { page: "shamela-book"; bookId: number }
  | { page: "shamela-book-pages"; bookId: number }
  | { page: "shamela-book-page"; bookId: number; pageId: number };

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

function isNavItemActive(itemPageId: string, route: Route): boolean {
  if (route.page === itemPageId) return true;
  if (itemPageId === "shamela-books" && route.page.startsWith("shamela-book")) return true;
  return false;
}

function getActiveBookId(route: Route): number | null {
  switch (route.page) {
    case "shamela-book":
    case "shamela-book-pages":
    case "shamela-book-page":
      return route.bookId;
    default:
      return null;
  }
}

function getBreadcrumbs(
  route: Route,
  getBookName: (id: number) => string,
  onNavigate: (r: Route) => void,
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
        { label: getBookName(route.bookId) },
      ];
    case "shamela-book-pages":
      return [
        { label: "Shamela" },
        { label: "Books", onClick: () => onNavigate({ page: "shamela-books" }) },
        {
          label: getBookName(route.bookId),
          onClick: () => onNavigate({ bookId: route.bookId, page: "shamela-book" }),
        },
        { label: "Pages" },
      ];
    case "shamela-book-page":
      return [
        { label: "Shamela" },
        { label: "Books", onClick: () => onNavigate({ page: "shamela-books" }) },
        {
          label: getBookName(route.bookId),
          onClick: () => onNavigate({ bookId: route.bookId, page: "shamela-book" }),
        },
        {
          label: "Pages",
          onClick: () => onNavigate({ bookId: route.bookId, page: "shamela-book-pages" }),
        },
        { label: `Page ${route.pageId}` },
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
  onNavigate: (r: Route) => void;
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
                onClick={() => onNavigate({ bookId: child.bookId, page: "shamela-book" })}
              >
                <FileText className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 whitespace-normal break-words text-right leading-5" dir="rtl">
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
  route,
  onNavigate,
}: {
  node: ShamelaTitleNode;
  bookId: number;
  route: Route;
  onNavigate: (r: Route) => void;
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

  const label = sanitizeShamelaText(node.title.content) || `Section ${node.title.id}`;

  const navigate = useCallback(() => {
    if (node.pageId !== null) {
      onNavigate({ bookId, page: "shamela-book-page", pageId: node.pageId });
    }
  }, [bookId, node.pageId, onNavigate]);

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
            {label}
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
          {label}
        </span>
      </SidebarMenuSubButton>
      <CollapsibleTrigger
        render={<SidebarMenuAction aria-label={`Toggle ${label}`} showOnHover={false} />}
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
  titleTree,
  onNavigate,
}: {
  book: BookNavItem;
  route: Route;
  titleTree: ShamelaTitleNode[];
  onNavigate: (r: Route) => void;
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
    onNavigate({ page: "shamela-book", bookId: book.bookId });
  }, [book.bookId, onNavigate]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible" render={<SidebarMenuItem />}>
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
          {titleTree.length > 0 ? (
            titleTree.map((node) => (
              <DownloadedTitleMenuItem
                key={node.title.id}
                node={node}
                bookId={book.bookId}
                route={route}
                onNavigate={onNavigate}
              />
            ))
          ) : (
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
  onNavigate,
}: {
  route: Route;
  books: BookNavItem[];
  titleTrees: Record<number, ShamelaTitleNode[]>;
  onNavigate: (r: Route) => void;
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
                    titleTree={titleTrees[book.bookId] ?? []}
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
                .map((n) => n[0])
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
                      .map((n) => n[0])
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
  onNavigate: (r: Route) => void;
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

function PageContent({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  switch (route.page) {
    case "settings":
      return <SettingsPage />;
    case "shamela-books":
      return <ShamelaPage onBookClick={(id) => onNavigate({ bookId: id, page: "shamela-book" })} />;
    case "shamela-book":
      return <BookDetailPage bookId={route.bookId} onNavigate={onNavigate} />;
    case "shamela-book-pages":
      return <BookPagesPage bookId={route.bookId} onNavigate={onNavigate} />;
    case "shamela-book-page":
      return <BookPageView bookId={route.bookId} pageId={route.pageId} onNavigate={onNavigate} />;
    default:
      return <DashboardPage onNavigate={onNavigate} />;
  }
}

export function ApplicationShell1({ className }: { className?: string }) {
  const [currentRoute, setCurrentRoute] = useState<Route>({ page: "dashboard" });
  const [downloadedBookIds, setDownloadedBookIds] = useState<number[]>([]);
  const [downloadedBookTrees, setDownloadedBookTrees] = useState<Record<number, ShamelaTitleNode[]>>(
    {},
  );
  const shamelaVerified = useSettingsStore((s) => s.shamelaAccessVerified);
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const books = useBooksStore((s) => s.books);
  const booksLoading = useBooksStore((s) => s.loading);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!shamelaVerified || books.length > 0 || booksLoading) return;
    const { setLoading, setBooks, setError } = useBooksStore.getState();
    setLoading(true);
    loadMasterBooks(token, dataset)
      .then((archive) => setBooks(archive.books))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load books"));
  }, [shamelaVerified, token, dataset, books.length, booksLoading]);

  useEffect(() => {
    if (!shamelaVerified) {
      setDownloadedBookIds([]);
      setDownloadedBookTrees({});
      return;
    }

    const loadDownloadedBooks = () => {
      listDownloadedBookIds().then(setDownloadedBookIds);
    };

    loadDownloadedBooks();
    window.addEventListener("shamela-book-downloaded", loadDownloadedBooks);

    return () => {
      window.removeEventListener("shamela-book-downloaded", loadDownloadedBooks);
    };
  }, [shamelaVerified]);

  useEffect(() => {
    if (!shamelaVerified || downloadedBookIds.length === 0) {
      setDownloadedBookTrees({});
      return;
    }

    let cancelled = false;

    const loadTitleTrees = async () => {
      const entries = await Promise.all(
        downloadedBookIds.map(async (bookId) => {
          const cached = await loadCachedBook(bookId);
          const tree = cached ? buildShamelaTitleTree(cached.titles, cached.pages) : [];
          return [bookId, tree] as const;
        }),
      );

      if (!cancelled) {
        setDownloadedBookTrees(Object.fromEntries(entries));
      }
    };

    loadTitleTrees().catch(() => {
      if (!cancelled) {
        setDownloadedBookTrees({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [downloadedBookIds, shamelaVerified]);

  const onNavigate = useCallback((r: Route) => setCurrentRoute(r), []);

  const getBookName = useCallback(
    (id: number) => {
      const book = books.find((b) => b.id === id);
      return book?.name ?? `Book ${id}`;
    },
    [books],
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(currentRoute, getBookName, onNavigate),
    [currentRoute, getBookName, onNavigate],
  );

  const downloadedBooksNav = useMemo(
    () =>
      downloadedBookIds.map((bookId) => {
        const book = books.find((entry) => entry.id === bookId);
        return {
          bookId,
          label: book?.name ?? `Book ${bookId}`,
        };
      }),
    [books, downloadedBookIds],
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
            {shamelaVerified && (
              <ShamelaBooksSection
                route={currentRoute}
                books={downloadedBooksNav}
                titleTrees={downloadedBookTrees}
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
              {breadcrumbs.map((item, i) => (
                <Fragment key={item.label}>
                  {i > 0 && <BreadcrumbSeparator className="shrink-0" />}
                  <BreadcrumbItem className="min-w-0">
                    {item.onClick ? (
                      <BreadcrumbLink
                        onClick={item.onClick}
                        className="block max-w-[180px] cursor-pointer truncate"
                        dir="rtl"
                      >
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="block max-w-[200px] truncate" dir="rtl">
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
          <PageContent route={currentRoute} onNavigate={onNavigate} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
