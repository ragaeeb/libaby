'use client';

import { ChevronRight, File, Library, Search, SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useEffect, useState } from 'react';
import { getLibraryBooks } from '@/actions/books';
import { getConfig } from '@/actions/config';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarRail,
} from '@/components/ui/sidebar';
import type { LibraryConfig } from '@/lib/data';

type BookItem = { id: string; title: string };

type LibraryItem = { books: BookItem[]; name: string; path: string };

const LibraryTree = memo(({ item }: { item: LibraryItem }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(`/${item.path}`);

    return (
        <SidebarMenuItem>
            <Collapsible
                className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                defaultOpen={isActive}
            >
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton asChild>
                        <Link href={`/libraries/${item.path}`}>
                            <ChevronRight className="transition-transform" />
                            <Library />
                            {item.name}
                        </Link>
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {item.books.map((book) => {
                            const link = `/libraries/${item.path}/book/${book.id}`;

                            return (
                                <SidebarMenuButton
                                    key={book.id}
                                    asChild
                                    isActive={pathname === link}
                                    className="truncate"
                                    title={book.title}
                                >
                                    <Link href={link} className="truncate">
                                        <File />
                                        <span className="truncate">{book.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            );
                        })}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
});

LibraryTree.displayName = 'LibraryTree';

export const AppSidebar = memo(({ ...props }: React.ComponentProps<typeof Sidebar>) => {
    const pathname = usePathname();
    const [libraries, setLibraries] = useState<LibraryItem[]>([]);

    useEffect(() => {
        const loadLibraries = async () => {
            const config: LibraryConfig = await getConfig();
            const libs: LibraryItem[] = [];

            if (config.shamela) {
                const books = await getLibraryBooks('shamela');
                libs.push({ books, name: 'Shamela Library', path: 'shamela' });
            }

            setLibraries(libs);
        };

        loadLibraries();
    }, []);

    return (
        <Sidebar {...props}>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/search'}>
                                    <Link href="/search">
                                        <Search />
                                        Search
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === '/settings'}>
                                    <Link href="/settings">
                                        <SettingsIcon />
                                        Settings
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {libraries.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Libraries</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {libraries.map((library, idx) => (
                                    <LibraryTree key={idx.toString()} item={library} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    );
});

AppSidebar.displayName = 'AppSidebar';
