import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateAccess } from "@/lib/huggingface";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export function SettingsPage() {
  const hydrate = useSettingsStore((s) => s.hydrate);
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const updateToken = useSettingsStore((s) => s.updateHuggingfaceToken);
  const updateDataset = useSettingsStore((s) => s.updateShamelaDataset);
  const verified = useSettingsStore((s) => s.shamelaAccessVerified);
  const validating = useSettingsStore((s) => s.validating);
  const validationError = useSettingsStore((s) => s.validationError);
  const setValidation = useSettingsStore((s) => s.setValidation);
  const setValidating = useSettingsStore((s) => s.setValidating);

  const [tokenRevealed, setTokenRevealed] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    const result = await validateAccess(token, dataset);
    setValidation({ verified: result.ok, error: result.error ?? null });
  }, [token, dataset, setValidating, setValidation]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your HuggingFace access for Shamela dataset
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HuggingFace Dataset</CardTitle>
          <CardDescription>
            Configure your HuggingFace access token and Shamela dataset repository to browse and
            search books.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hf-token">Access Token</Label>
            <div className="flex gap-2">
              <Input
                id="hf-token"
                type={tokenRevealed ? "text" : "password"}
                defaultValue={token}
                onBlur={(e) => updateToken(e.target.value)}
                placeholder="hf_..."
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setTokenRevealed(!tokenRevealed)}>
                {tokenRevealed ? "Hide" : "Show"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Create a token at{" "}
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                huggingface.co/settings/tokens
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shamela-dataset">Shamela Dataset</Label>
            <Input
              id="shamela-dataset"
              defaultValue={dataset}
              onBlur={(e) => updateDataset(e.target.value)}
              placeholder="username/dataset-name"
            />
            <p className="text-xs text-muted-foreground">
              The HuggingFace dataset repository containing master.json.br
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleValidate} disabled={validating || !token || !dataset}>
              {validating && <Loader2 className="mr-2 size-4 animate-spin" />}
              {validating ? "Validating..." : "Validate Access"}
            </Button>

            {verified && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="size-4" />
                Access verified
              </span>
            )}

            {validationError && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <XCircle className="size-4" />
                {validationError}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
