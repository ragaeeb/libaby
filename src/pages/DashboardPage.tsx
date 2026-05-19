import { invoke } from "@tauri-apps/api/core";
import { BookOpen, CheckCircle2, Database, Download, HardDrive, Loader2, Settings, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Route } from "@/components/application-shell1";
import { downloadAndCacheMaster } from "@/lib/huggingface";

type DashboardStats = {
  master_cached: boolean;
  downloaded_books: number;
};

export function DashboardPage({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const verified = useSettingsStore((s) => s.shamelaAccessVerified);
  const validating = useSettingsStore((s) => s.validating);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    invoke<DashboardStats>("get_dashboard_stats").then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleDownloadMaster = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadAndCacheMaster(token, dataset);
      loadStats();
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  }, [token, dataset, loadStats]);

  const configured = Boolean(token && dataset);

  return (
    <PageLayout
      title="Dashboard"
      description="Overview of your Libaby workspace"
    >
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HuggingFace</CardTitle>
            {verified ? (
              <CheckCircle2 className="size-4 text-green-600 shrink-0" />
            ) : (
              <XCircle className="size-4 text-muted-foreground shrink-0" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {validating ? "Validating…" : verified ? "Connected" : "Not Connected"}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {configured ? dataset : "Configure in Settings"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Master Database</CardTitle>
            <Database className="size-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.master_cached ? "Cached" : "—"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats?.master_cached ? "Ready to browse on demand" : "Not yet downloaded"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloaded Books</CardTitle>
            <HardDrive className="size-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? stats.downloaded_books.toLocaleString() : "—"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">saved locally for offline reading</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <BookOpen className="size-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verified ? "Ready" : "Setup Required"}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {verified ? "Browse and download books" : "Add HuggingFace credentials"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions + about */}
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
            {verified && stats && !stats.master_cached && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={handleDownloadMaster}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Database className="mr-2 size-4" />
                )}
                {downloading ? "Downloading Master Database…" : "Download Master Database"}
              </Button>
            )}
            {downloadError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" />
                {downloadError}
              </p>
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
                <Download className="mb-0.5 mr-2 inline size-4" />
                You have {stats.downloaded_books} book
                {stats.downloaded_books !== 1 ? "s" : ""} available offline. Click any book in
                the library to start reading.
              </div>
            )}
            {!configured && !verified && (
              <p className="text-sm text-muted-foreground">
                Add your HuggingFace credentials in Settings to get started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Libaby</CardTitle>
            <CardDescription>Islamic manuscript and text tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Libaby provides tools for browsing and reading Islamic manuscripts and texts from the
              Shamela library.
            </p>
            <p>
              Books are downloaded from HuggingFace datasets and cached locally for fast offline
              access.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
