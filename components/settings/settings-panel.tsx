'use client';

import { forgetAllResults } from '@/lib/client-results';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPanel() {
  const t = useTranslations('settings');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [deleted, setDeleted] = useState<{ analyses: number; cvUploads: number } | null>(null);

  async function exportData() {
    setBusy('export');
    try {
      const response = await fetch('/api/me/export');
      if (!response.ok) throw new Error('export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'futureproof-my-data.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function deleteData() {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy('delete');
    try {
      const response = await fetch('/api/me/data', { method: 'DELETE' });
      if (!response.ok) throw new Error('delete failed');
      const payload = (await response.json()) as { analyses: number; cvUploads: number };
      forgetAllResults();
      setDeleted(payload);
      toast.success(t('deleteDone'));
    } catch {
      toast.error('Delete failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t('exportTitle')}</CardTitle>
          <CardDescription>{t('exportBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={exportData} disabled={busy !== null}>
            {busy === 'export' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            {t('exportButton')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">{t('deleteTitle')}</CardTitle>
          <CardDescription>{t('deleteBody')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive" onClick={deleteData} disabled={busy !== null}>
            {busy === 'delete' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            {t('deleteButton')}
          </Button>
          {deleted ? (
            <p className="text-sm text-muted-foreground">
              {t('deleteDone')} ({deleted.analyses} analyses, {deleted.cvUploads} CV records)
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t('languageTitle')}</CardTitle>
          <CardDescription>{t('languageBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LocaleSwitcher />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t('signInNote')}</p>
    </div>
  );
}
