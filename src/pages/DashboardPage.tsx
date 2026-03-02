import { invoke } from "@tauri-apps/api/core";
import { BookOpen, CheckCircle2, Database, Download, HardDrive, Settings, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBooksStore } from "@/stores/useBooksStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Route } from "@/components/application-shell1";

type DashboardStats = {
  master_cached: boolean;
  downloaded_books: number;
};

export function DashboardPage({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const verified = useSettingsStore((s) => s.shamelaAccessVerified);
  const validating = useSettingsStore((s) => s.validating);
  const totalBooks = useBooksStore((s) => s.books.length);
  const booksLoading = useBooksStore((s) => s.loading);

  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    invoke<DashboardStats>("get_dashboard_stats").then(setStats).catch(() => {});
  }, []);

  const configured = Boolean(token && dataset);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your Libaby workspace
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HuggingFace</CardTitle>
            {verified ? (
              <CheckCircle2 className="size-4 text-green-600" />
            ) : (
              <XCircle className="size-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {validating ? "Validating..." : verified ? "Connected" : "Not Connected"}
            </div>
            <p className="text-xs text-muted-foreground">
              {configured ? dataset : "Configure in Settings"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Master Database</CardTitle>
            <Database className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {booksLoading ? "Loading..." : totalBooks > 0 ? totalBooks.toLocaleString() : stats?.master_cached ? "Cached" : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBooks > 0 ? "books in library" : stats?.master_cached ? "Ready to browse" : "Not yet downloaded"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloaded Books</CardTitle>
            <HardDrive className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.downloaded_books.toLocaleString() : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              saved locally for offline reading
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {verified ? "Ready" : "Setup Required"}
            </div>
            <p className="text-xs text-muted-foreground">
              {verified ? "Browse and download books" : "Add HuggingFace credentials"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!configured && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => onNavigate({ page: "settings" })}
              >
                <Settings className="mr-2 size-4" />
                Configure HuggingFace Access
              </Button>
            )}
            {verified && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => onNavigate({ page: "shamela-books" })}
              >
                <BookOpen className="mr-2 size-4" />
                Browse Shamela Library
              </Button>
            )}
            {verified && stats && stats.downloaded_books > 0 && (
              <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                <Download className="mb-1 mr-2 inline size-4" />
                You have {stats.downloaded_books} book{stats.downloaded_books !== 1 ? "s" : ""} available offline.
                Click any book in the library to start reading.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Libaby</CardTitle>
            <CardDescription>Islamic manuscript and text tools</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Libaby provides tools for browsing and reading Islamic manuscripts
              and texts from the Shamela library.
            </p>
            <p>
              Books are downloaded from HuggingFace datasets and cached locally
              for fast offline access.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
