'use client';

import { ChevronRight, File, Library, SettingsIcon } from 'lucide-react';
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
import type { LibraryConfig } from '@/lib/repository';

type BookItem = { id: string; title: string };

type LibraryItem = { name: string; path: string; books: BookItem[] };

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
                        {item.books.map((book) => (
                            <SidebarMenuButton
                                key={book.id}
                                asChild
                                isActive={pathname === `/${item.path}/book/${book.id}`}
                                className="truncate"
                                title={book.title}
                            >
                                <Link href={`/${item.path}/${book.id}`} className="truncate">
                                    <File />
                                    <span className="truncate">{book.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        ))}
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

            if (config.turath) {
                const books = await getLibraryBooks('turath');
                libs.push({ books, name: 'Turath Library', path: 'turath' });
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
