'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getConfig, saveConfig } from '@/actions/config';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
    const router = useRouter();
    const [shamela, setShamela] = useState('');
    const [turath, setTurath] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            const config = await getConfig();
            setShamela(config.shamela || '');
            setTurath(config.turath || '');
            setLoading(false);
        };
        loadConfig();
    }, []);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setSaving(true);
            await saveConfig({ shamela: shamela || undefined, turath: turath || undefined });
            setSaving(false);
            router.push('/');
            router.refresh();
        },
        [shamela, turath, router],
    );

    if (loading) {
        return (
            <>
                <PageHeader title="Settings" breadcrumbs={[{ label: 'Settings' }]} />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader title="Settings" breadcrumbs={[{ label: 'Settings' }]} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="font-bold text-3xl tracking-tight">Settings</h1>
                    <p className="mt-2 text-muted-foreground">Configure your Islamic library API connections</p>
                </div>

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
                    <div className="space-y-4">
                        <div>
                            <h2 className="mb-4 font-semibold text-xl">Shamela Library (shamela.ws)</h2>
                            <div className="space-y-2">
                                <label htmlFor="shamela" className="font-medium text-sm">
                                    API Key
                                </label>
                                <input
                                    id="shamela"
                                    type="text"
                                    value={shamela}
                                    onChange={(e) => setShamela(e.target.value)}
                                    placeholder="Enter your Shamela API key"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                />
                                <p className="text-muted-foreground text-xs">
                                    Enter your API key from shamela.ws to access their book collection
                                </p>
                            </div>
                        </div>

                        <Separator className="my-6" />

                        <div>
                            <h2 className="mb-4 font-semibold text-xl">Turath Library (turath.io)</h2>
                            <div className="space-y-2">
                                <label htmlFor="turath" className="font-medium text-sm">
                                    API Key
                                </label>
                                <input
                                    id="turath"
                                    type="text"
                                    value={turath}
                                    onChange={(e) => setTurath(e.target.value)}
                                    placeholder="Enter your Turath API key"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                />
                                <p className="text-muted-foreground text-xs">
                                    Enter your API key from turath.io to access their book collection
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button type="submit" size="lg" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </form>
            </div>
        </>
    );
}
