'use client';

import { rememberResult } from '@/lib/client-results';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useCallback, useRef, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface OccupationOption {
  id: string;
  title: string;
  titleBn: string | null;
}

export interface SampleOption {
  key: string;
  title: string;
  titleBn: string | null;
  summary: string;
  summaryBn: string | null;
}

type Stage = 'idle' | 'reading' | 'scrubbing' | 'matching' | 'scoring' | 'planning' | 'done';

const STAGES: Stage[] = ['reading', 'scrubbing', 'matching', 'scoring', 'planning'];

const MIN_CHARS = 80;

export function AnalyzeForm({
  occupations,
  samples,
  offline,
}: {
  occupations: OccupationOption[];
  samples: SampleOption[];
  offline: boolean;
}) {
  const t = useTranslations('analyze');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab, setTab] = useState<'upload' | 'paste' | 'sample'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [sampleKey, setSampleKey] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [targetOccupationId, setTargetOccupationId] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  const busy = stage !== 'idle' && stage !== 'done';

  const canSubmit =
    consent &&
    !busy &&
    (tab === 'upload'
      ? Boolean(file)
      : tab === 'paste'
        ? text.trim().length >= MIN_CHARS
        : Boolean(sampleKey));

  const advanceStages = useCallback(() => {
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      if (index < STAGES.length) setStage(STAGES[index] ?? 'scoring');
      else clearInterval(timer);
    }, 700);
    return () => clearInterval(timer);
  }, []);

  async function runAnalysis(cvId?: string, scrubbedText?: string) {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        // Prefer sending the (already scrubbed) text: a serverless host may not remember
        // the upload between two requests. cvId is only the fallback for very short text.
        ...(scrubbedText && scrubbedText.length >= 80
          ? { text: scrubbedText }
          : cvId
            ? { cvId }
            : {}),
        ...(tab === 'sample' ? { sampleKey } : {}),
        targetOccupationId: targetOccupationId || null,
        locale,
        consent: true,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      analysisId?: string;
      result?: unknown;
      error?: string;
    };
    if (!response.ok || !payload.analysisId) {
      throw new Error(payload.error ?? tErrors('generic'));
    }
    if (payload.result) rememberResult(payload.analysisId, payload.result);
    return payload.analysisId;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setStage('reading');
    const stop = advanceStages();

    startTransition(async () => {
      try {
        let cvId: string | undefined;
        let scrubbedText: string | undefined;

        if (tab === 'upload' && file) {
          const form = new FormData();
          form.append('file', file);
          form.append('consent', 'true');

          const ingestResponse = await fetch('/api/cv/ingest', { method: 'POST', body: form });
          const ingestPayload = (await ingestResponse.json().catch(() => ({}))) as {
            cvId?: string;
            scrubbedText?: string;
            error?: string;
          };
          if (!ingestResponse.ok || !ingestPayload.cvId) {
            throw new Error(ingestPayload.error ?? tErrors('noText'));
          }
          cvId = ingestPayload.cvId;
          scrubbedText = ingestPayload.scrubbedText;
        } else if (tab === 'paste') {
          const ingestResponse = await fetch('/api/cv/ingest', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text, consent: true }),
          });
          const ingestPayload = (await ingestResponse.json().catch(() => ({}))) as {
            cvId?: string;
            scrubbedText?: string;
            error?: string;
          };
          if (!ingestResponse.ok || !ingestPayload.cvId) {
            throw new Error(ingestPayload.error ?? tErrors('generic'));
          }
          cvId = ingestPayload.cvId;
          scrubbedText = ingestPayload.scrubbedText;
        }

        const analysisId = await runAnalysis(cvId, scrubbedText);
        setStage('done');
        router.push(`/results/${analysisId}`);
      } catch (caught) {
        setStage('idle');
        setError(caught instanceof Error ? caught.message : tErrors('generic'));
      } finally {
        stop();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Mode tabs */}
      <div className="flex rounded-xl border border-border bg-secondary/40 p-1" role="tablist">
        {(
          [
            { key: 'upload', label: t('tabUpload'), icon: Upload },
            { key: 'paste', label: t('tabPaste'), icon: FileText },
            { key: 'sample', label: t('tabSample'), icon: Sparkles },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            disabled={busy}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <Card
          className={cn('border-dashed transition-colors', dragging && 'border-accent bg-accent/5')}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) {
              if (dropped.type !== 'application/pdf' || dropped.size > 5 * 1024 * 1024) {
                setError(tErrors('invalidFile'));
                return;
              }
              setError(null);
              setFile(dropped);
            }
          }}
        >
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Upload className="size-6" aria-hidden="true" />
            </span>
            <p className="font-medium">{t('dropTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('dropHint')}</p>

            {file ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm">
                <FileText className="size-4 text-accent" aria-hidden="true" />
                <span className="max-w-[260px] truncate">
                  {t('fileSelected', { name: file.name })}
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t('removeFile')}
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                {t('browse')}
              </Button>
            )}

            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                if (!picked) return;
                if (picked.type !== 'application/pdf' || picked.size > 5 * 1024 * 1024) {
                  setError(tErrors('invalidFile'));
                  return;
                }
                setError(null);
                setFile(picked);
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === 'paste' ? (
        <div className="space-y-2">
          <label htmlFor="cv-text" className="text-sm font-medium">
            {t('pasteLabel')}
          </label>
          <textarea
            id="cv-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            placeholder={t('pastePlaceholder')}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-card p-4 text-sm leading-relaxed outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p
            className={cn(
              'text-xs',
              text.trim().length < MIN_CHARS ? 'text-muted-foreground' : 'text-accent',
            )}
          >
            {text.trim().length < MIN_CHARS
              ? t('tooShort', { min: MIN_CHARS })
              : t('charsCount', { count: text.trim().length })}
          </p>
        </div>
      ) : null}

      {tab === 'sample' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('samplesHint')}</p>
          <div className="grid gap-3">
            {samples.map((sample) => {
              const label = locale === 'bn' ? (sample.titleBn ?? sample.title) : sample.title;
              const summary =
                locale === 'bn' ? (sample.summaryBn ?? sample.summary) : sample.summary;
              const active = sampleKey === sample.key;
              return (
                <button
                  key={sample.key}
                  type="button"
                  onClick={() => setSampleKey(sample.key)}
                  disabled={busy}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    active
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-card hover:border-accent/50',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{label}</span>
                    {active ? (
                      <CheckCircle2 className="size-5 text-accent" aria-hidden="true" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Target role */}
      <div className="space-y-2">
        <label htmlFor="target-role" className="text-sm font-medium">
          {t('targetRoleLabel')}
        </label>
        <select
          id="target-role"
          value={targetOccupationId}
          onChange={(event) => setTargetOccupationId(event.target.value)}
          disabled={busy}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{t('targetRoleAuto')}</option>
          {occupations.map((occupation) => (
            <option key={occupation.id} value={occupation.id}>
              {locale === 'bn' ? (occupation.titleBn ?? occupation.title) : occupation.title}
            </option>
          ))}
        </select>
      </div>

      {/* Consent */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          disabled={busy}
          className="mt-0.5 size-4 accent-[hsl(var(--accent))]"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">{t('consentLabel')}</span>
          <span className="block text-xs text-muted-foreground">{t('consentHelp')}</span>
        </span>
      </label>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Progress */}
      {busy ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          {STAGES.map((current, index) => {
            const currentIndex = STAGES.indexOf(stage);
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;
            return (
              <div key={current} className="flex items-center gap-3 text-sm">
                {isDone ? (
                  <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
                ) : isActive ? (
                  <Loader2 className="size-4 animate-spin text-accent" aria-hidden="true" />
                ) : (
                  <span className="size-4 rounded-full border border-border" aria-hidden="true" />
                )}
                <span className={isActive ? 'font-medium' : 'text-muted-foreground'}>
                  {t(
                    `progress${current.charAt(0).toUpperCase()}${current.slice(1)}` as
                      | 'progressReading'
                      | 'progressScrubbing'
                      | 'progressMatching'
                      | 'progressScoring'
                      | 'progressPlanning',
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || isPending}>
        {busy ? t('submitting') : t('submit')}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t('privacyNote')}
        </span>
        {offline ? <Badge variant="outline">{t('offlineNote')}</Badge> : null}
      </div>
    </form>
  );
}
