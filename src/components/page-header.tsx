import { memo } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

type BreadcrumbEntry = { label: string; href?: string };

type PageHeaderProps = { title: string; breadcrumbs: BreadcrumbEntry[] };

export const PageHeader = memo(({ breadcrumbs }: PageHeaderProps) => (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((crumb, idx) => (
                    <span key={crumb.href || crumb.label} className="contents">
                        {idx > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                            {crumb.href ? (
                                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                    </span>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    </header>
));

PageHeader.displayName = 'PageHeader';
