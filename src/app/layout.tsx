import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppSidebar } from '@/components/app-sidebar';
import { Footer } from '@/components/footer';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import './globals.css';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = { description: 'My Islāmic Library', title: 'Libaby' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <SidebarProvider>
                    <div className="flex min-h-screen w-full flex-col">
                        <div className="flex flex-1">
                            <AppSidebar />
                            <SidebarInset>{children}</SidebarInset>
                        </div>
                        <Footer />
                    </div>
                </SidebarProvider>
            </body>
        </html>
    );
}
