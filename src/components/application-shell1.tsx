import {
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { loadMasterBooks } from "@/lib/huggingface";
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
  children?: NavItem[];
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

const shamelaGroup: NavGroup = {
  defaultOpen: true,
  items: [{ icon: BookOpen, label: "Books", pageId: "shamela-books" }],
  title: "Shamela",
};

function isNavItemActive(itemPageId: string, route: Route): boolean {
  if (route.page === itemPageId) return true;
  if (itemPageId === "shamela-books" && route.page.startsWith("shamela-book")) return true;
  return false;
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
      <CollapsibleTrigger render={<SidebarMenuButton isActive={active} />}>
        <Icon className="size-4" />
        <span>{item.label}</span>
        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.label}>
              <SidebarMenuSubButton
                isActive={isNavItemActive(child.pageId, route)}
                onClick={() => onNavigate({ page: child.pageId })}
              >
                {child.label}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
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

  const navGroups: NavGroup[] = shamelaVerified ? [overviewGroup, shamelaGroup] : [overviewGroup];

  return (
    <SidebarProvider className={cn(className)}>
      <Sidebar>
        <SidebarHeader>
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent className="overflow-hidden">
          <ScrollArea className="min-h-0 flex-1">
            {navGroups.map((group) => (
              <NavGroupSection
                key={group.title}
                group={group}
                route={currentRoute}
                onNavigate={onNavigate}
              />
            ))}
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={userData} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 hidden data-[orientation=vertical]:h-4 md:block"
          />
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              {breadcrumbs.map((item, i) => (
                <Fragment key={item.label}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {item.onClick ? (
                      <BreadcrumbLink onClick={item.onClick} className="cursor-pointer">
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <PageContent route={currentRoute} onNavigate={onNavigate} />
      </SidebarInset>
    </SidebarProvider>
  );
}
