import { Buffer } from 'node:buffer';
import { BookOpen, Database, Download, HardDrive, Library } from 'lucide-react';
import HoverCard from '@/components/cuicui/hover-effect-card';
import { PageHeader } from '@/components/page-header';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getConfig, getDownloadedBooks, getMasterData } from '@/lib/data';
import { getServerStorage } from '@/lib/storage/server';

const storage = getServerStorage();

const getPrefixSize = async (prefix: string): Promise<number> => {
    const keys = await storage.getKeys(prefix);
    let totalSize = 0;

    for (const key of keys) {
        const value = await storage.getItem(key);

        if (typeof value === 'string') {
            totalSize += Buffer.byteLength(value, 'utf-8');
        } else if (value instanceof Uint8Array) {
            totalSize += value.byteLength;
        }
    }

    return totalSize;
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

const getLargestBookFile = async (library: string): Promise<{ name: string; size: number } | null> => {
    const keys = (await storage.getKeys(`libraries/${library}/books`)).filter(
        (key) => key.endsWith('.json') && !key.endsWith('.metadata.json'),
    );

    let largestFile: { name: string; size: number } | null = null;

    for (const key of keys) {
        const value = await storage.getItem(key);

        if (typeof value !== 'string') {
            continue;
        }

        const size = Buffer.byteLength(value, 'utf-8');
        const name = key.split('/').pop()?.replace('.json', '') ?? key;

        if (!largestFile || size > largestFile.size) {
            largestFile = { name, size };
        }
    }

    return largestFile;
};

const getLibraryStats = async () => {
    const config = await getConfig();
    const downloaded = await getDownloadedBooks();
    const libraries: string[] = [];

    if (config.shamela) {
        libraries.push('shamela');
    }

    let totalBooksAvailable = 0;
    const totalBooksDownloaded = downloaded.length;
    let lastDownloadDate: Date | null = null;
    let largestBook: { name: string; size: number; library: string } | null = null;
    let totalStorageSize = 0;

    for (const library of libraries) {
        const masterData = await getMasterData(library);
        if (masterData) {
            totalBooksAvailable += masterData.master.books.filter((b) => b.is_deleted === '0').length;
        }

        const largest = await getLargestBookFile(library);
        if (largest && (!largestBook || largest.size > largestBook.size)) {
            largestBook = { ...largest, library };
        }

        const dirSize = await getPrefixSize(`libraries/${library}`);
        totalStorageSize += dirSize;
    }

    if (downloaded.length > 0) {
        const sortedDownloads = [...downloaded].sort(
            (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime(),
        );
        lastDownloadDate = new Date(sortedDownloads[0].downloadedAt);
    }

    return { largestBook, lastDownloadDate, libraries, totalBooksAvailable, totalBooksDownloaded, totalStorageSize };
};

export default async function Page() {
    const stats = await getLibraryStats();

    return (
        <>
            <PageHeader title="Home" breadcrumbs={[{ label: 'Home' }]} />
            <div className="flex flex-1 flex-col gap-8 p-6">
                <div className="space-y-2">
                    <h1 className="font-bold text-4xl tracking-tight">Library Dashboard</h1>
                    <p className="text-lg text-muted-foreground">Overview of your Islamic digital library collection</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <HoverCard className="rounded-xl border border-stone-500/10 py-6 group-hover:border-stone-500/50 group-hover:bg-stone-400/25">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Active Libraries</CardTitle>
                            <Library className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-3xl">
                                <AnimatedCounter value={stats.libraries.length} />
                            </div>
                            <p className="mt-1 text-muted-foreground text-xs">
                                {stats.libraries.map((lib) => lib.charAt(0).toUpperCase() + lib.slice(1)).join(', ')}
                            </p>
                        </CardContent>
                    </HoverCard>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Books Available</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-3xl">
                                <AnimatedCounter value={stats.totalBooksAvailable} />
                            </div>
                            <p className="mt-1 text-muted-foreground text-xs">Total books in all libraries</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Books Downloaded</CardTitle>
                            <Download className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-3xl">
                                <AnimatedCounter value={stats.totalBooksDownloaded} />
                            </div>
                            <p className="mt-1 text-muted-foreground text-xs">
                                {stats.totalBooksAvailable > 0
                                    ? `${((stats.totalBooksDownloaded / stats.totalBooksAvailable) * 100).toFixed(1)}% of available books`
                                    : 'No books available'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Storage Used</CardTitle>
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-3xl">{formatBytes(stats.totalStorageSize)}</div>
                            <p className="mt-1 text-muted-foreground text-xs">Total disk space used</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Last Download</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-2xl">
                                {stats.lastDownloadDate
                                    ? stats.lastDownloadDate.toLocaleDateString('en-US', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                      })
                                    : 'Never'}
                            </div>
                            <p className="mt-1 text-muted-foreground text-xs">
                                {stats.lastDownloadDate
                                    ? `${Math.floor((Date.now() - stats.lastDownloadDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`
                                    : 'No books downloaded yet'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="font-medium text-sm">Largest Book</CardTitle>
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-bold text-3xl">
                                {stats.largestBook ? formatBytes(stats.largestBook.size) : '—'}
                            </div>
                            <p className="mt-1 text-muted-foreground text-xs">
                                {stats.largestBook ? `Book ID: ${stats.largestBook.name}` : 'No books downloaded'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Stats</CardTitle>
                            <CardDescription>Key metrics at a glance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-sm">Download Progress</span>
                                <span className="font-semibold">
                                    {stats.totalBooksAvailable > 0
                                        ? `${((stats.totalBooksDownloaded / stats.totalBooksAvailable) * 100).toFixed(1)}%`
                                        : '0%'}
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{
                                        width: `${stats.totalBooksAvailable > 0 ? (stats.totalBooksDownloaded / stats.totalBooksAvailable) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-muted-foreground text-sm">Avg. Book Size</span>
                                <span className="font-semibold">
                                    {stats.totalBooksDownloaded > 0
                                        ? formatBytes(stats.totalStorageSize / stats.totalBooksDownloaded)
                                        : '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-sm">Books Remaining</span>
                                <span className="font-semibold">
                                    {(stats.totalBooksAvailable - stats.totalBooksDownloaded).toLocaleString()}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Library Status</CardTitle>
                            <CardDescription>Connected library sources</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {stats.libraries.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No libraries configured. Visit Settings to add libraries.
                                </p>
                            ) : (
                                stats.libraries.map((lib) => {
                                    const libDownloads = stats.totalBooksDownloaded;
                                    return (
                                        <div key={lib} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">
                                                    {lib.charAt(0).toUpperCase() + lib.slice(1)}
                                                </span>
                                                <span className="text-green-600 text-sm">● Active</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Books downloaded</span>
                                                <span className="font-medium">{libDownloads.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
