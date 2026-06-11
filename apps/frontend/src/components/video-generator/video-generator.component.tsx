'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useAiConfig } from '@gitroom/frontend/components/settings/ai-provider.component';

type Mode = 'text' | 'frames' | 'ingredients';
interface ImageRef { mimeType: string; base64: string }
interface ResultMedia { id: string; path: string }

function readFileAsBase64(file: File): Promise<ImageRef> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      resolve({ mimeType: file.type || 'image/png', base64 });
    };
    reader.readAsDataURL(file);
  });
}

const fieldCls =
  'h-[42px] bg-newBgColorInner px-[12px] border-newTableBorder border rounded-[8px] text-[14px] outline-none focus:border-forth transition-colors';

const UploadCard: React.FC<{
  label: string;
  hint?: string;
  image: ImageRef | null;
  onPick: (f?: File) => void;
  onClear: () => void;
}> = ({ label, hint, image, onPick, onClear }) => (
  <div className="flex flex-col gap-[6px] flex-1 min-w-[160px]">
    <div className="text-[13px] font-medium">{label}</div>
    {image ? (
      <div className="relative group rounded-[8px] overflow-hidden border-newTableBorder border">
        <img
          src={`data:${image.mimeType};base64,${image.base64}`}
          alt={label}
          className="w-full h-[120px] object-cover"
        />
        <button
          onClick={onClear}
          className="absolute top-[6px] right-[6px] w-[24px] h-[24px] rounded-full bg-black/70 text-white text-[12px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove image"
        >
          ✕
        </button>
      </div>
    ) : (
      <label className="cursor-pointer h-[120px] flex flex-col items-center justify-center gap-[4px] border border-dashed border-newTableBorder rounded-[8px] bg-newBgColorInner hover:border-forth transition-colors text-customColor18">
        <span className="text-[22px] leading-none">+</span>
        <span className="text-[12px]">{hint || 'Click to upload'}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
    )}
  </div>
);

export const VideoGeneratorComponent: React.FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();

  const { data: aiConfig } = useAiConfig();
  const hasVideoProvider = !!aiConfig?.videoProvider;

  const [mode, setMode] = useState<Mode>('text');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | 'auto'>('16:9');
  const [durationSeconds, setDurationSeconds] = useState(8);
  const [seed, setSeed] = useState<string>('');
  const [numberOfVideos, setNumberOfVideos] = useState(1);
  const [startImage, setStartImage] = useState<ImageRef | null>(null);
  const [endImage, setEndImage] = useState<ImageRef | null>(null);
  const [referenceImages, setReferenceImages] = useState<ImageRef[]>([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<ResultMedia[]>([]);
  const pollRef = useRef<any>(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const pickStart = useCallback(async (f?: File) => {
    if (f) setStartImage(await readFileAsBase64(f));
  }, []);
  const pickEnd = useCallback(async (f?: File) => {
    if (f) setEndImage(await readFileAsBase64(f));
  }, []);
  const pickRef = useCallback(async (index: number, f?: File) => {
    if (!f) return;
    const ref = await readFileAsBase64(f);
    setReferenceImages((prev) => {
      const next = [...prev];
      next[index] = ref;
      return next.slice(0, 3);
    });
  }, []);
  const clearRef = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const poll = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      const res = await (await fetch(`/media/ai-video/${jobId}`)).json();
      if (res.status === 'done') {
        clearInterval(pollRef.current);
        setResults(res.media || []);
        setGenerating(false);
        toaster.show(t('video_done', 'Video ready!'), 'success');
      } else if (res.status === 'error') {
        clearInterval(pollRef.current);
        setGenerating(false);
        toaster.show(res.error || t('video_failed', 'Generation failed'), 'warning');
      }
    }, 5000);
  }, [fetch, toaster, t]);

  const canGenerate =
    hasVideoProvider &&
    !generating &&
    (mode === 'text'
      ? !!prompt.trim()
      : mode === 'frames'
      ? !!startImage
      : !!prompt.trim() && referenceImages.length > 0);

  const generate = useCallback(async () => {
    const body: any = { mode, aspectRatio, numberOfVideos, durationSeconds };
    if (prompt.trim()) body.prompt = prompt.trim();
    if (negativePrompt.trim()) body.negativePrompt = negativePrompt.trim();
    if (seed) {
      const parsedSeed = parseInt(seed, 10);
      if (!Number.isNaN(parsedSeed)) body.seed = parsedSeed;
    }
    if (mode === 'frames') {
      body.startImage = startImage;
      if (endImage) body.endImage = endImage;
    }
    if (mode === 'ingredients') body.referenceImages = referenceImages;

    setGenerating(true);
    setResults([]);
    try {
      const res = await fetch('/media/ai-video', { method: 'POST', body: JSON.stringify(body) });
      if (res.status !== 200 && res.status !== 201) {
        const msg = await res.text();
        toaster.show(msg || t('video_failed', 'Generation failed'), 'warning');
        setGenerating(false);
        return;
      }
      const { jobId } = await res.json();
      poll(jobId);
    } catch {
      setGenerating(false);
      toaster.show(t('video_failed', 'Generation failed'), 'warning');
    }
  }, [mode, aspectRatio, numberOfVideos, durationSeconds, prompt, negativePrompt, seed, startImage, endImage, referenceImages, fetch, poll, toaster, t]);

  const tabs: { key: Mode; label: string; hint: string }[] = [
    { key: 'text', label: t('text_to_video', 'Text to Video'), hint: t('text_to_video_hint', 'Describe a scene and let Veo create it') },
    { key: 'frames', label: t('frames_to_video', 'Frames to Video'), hint: t('frames_to_video_hint', 'Animate from a start frame (and optional end frame)') },
    { key: 'ingredients', label: t('ingredients_to_video', 'Ingredients'), hint: t('ingredients_hint', 'Blend up to 3 reference images into a scene') },
  ];
  const activeTab = tabs.find((tb) => tb.key === mode)!;

  return (
    <div className="flex flex-col gap-[16px] max-w-[720px]">
      <div className="flex items-center justify-between flex-wrap gap-[8px]">
        <div className="text-[20px] font-medium">{t('ai_video_generator', 'AI Video Generator')}</div>
        {hasVideoProvider && (
          <div className="text-[12px] text-customColor18 bg-newBgColorInner border-newTableBorder border rounded-full px-[12px] h-[26px] flex items-center gap-[6px]">
            <span className="w-[8px] h-[8px] rounded-full bg-green-500 inline-block" />
            {aiConfig?.videoProvider} · {aiConfig?.videoModel}
          </div>
        )}
      </div>

      {!hasVideoProvider && (
        <div className="text-[13px] text-customColor18 bg-newBgColorInner border-newTableBorder border rounded-[8px] p-[12px]">
          {t(
            'video_no_provider',
            'No video provider configured. Set up Google Veo in Settings → AI provider first.'
          )}{' '}
          <a href="/settings" className="underline">
            {t('go_to_settings', 'Go to settings')}
          </a>
        </div>
      )}

      <div className="flex p-[4px] gap-[4px] bg-newBgColorInner border-newTableBorder border rounded-[10px] w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setMode(tb.key)}
            className={`px-[16px] h-[34px] rounded-[8px] text-[14px] transition-colors ${
              mode === tb.key ? 'bg-forth text-white' : 'text-customColor18 hover:text-current'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      <div className="text-[12px] text-customColor18 -mt-[8px]">{activeTab.hint}</div>

      {mode === 'frames' && (
        <div className="flex gap-[12px] flex-wrap">
          <UploadCard
            label={t('start_frame', 'Start frame')}
            image={startImage}
            onPick={pickStart}
            onClear={() => setStartImage(null)}
          />
          <UploadCard
            label={t('end_frame', 'End frame (optional)')}
            image={endImage}
            onPick={pickEnd}
            onClear={() => setEndImage(null)}
          />
        </div>
      )}

      {mode === 'ingredients' && (
        <div className="flex gap-[12px] flex-wrap">
          {[0, 1, 2].map((i) => (
            <UploadCard
              key={i}
              label={`${t('reference', 'Reference')} ${i + 1}${i === 0 ? '' : ` (${t('optional', 'optional')})`}`}
              image={referenceImages[i] || null}
              onPick={(f) => pickRef(i, f)}
              onClear={() => clearRef(i)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-[6px]">
        <div className="text-[13px] font-medium">
          {t('prompt', 'Prompt')}
          {mode === 'frames' && (
            <span className="text-customColor18 font-normal"> ({t('optional', 'optional')})</span>
          )}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('video_prompt_placeholder', 'A cinematic shot of...')}
          className="min-h-[100px] bg-newBgColorInner p-[12px] outline-none border-newTableBorder border rounded-[8px] text-[14px] focus:border-forth transition-colors resize-y"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <div className="text-[13px] font-medium">
          {t('negative_prompt', 'Negative prompt')}{' '}
          <span className="text-customColor18 font-normal">({t('optional', 'optional')})</span>
        </div>
        <input
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder={t('negative_prompt_placeholder', 'What to avoid: blurry, text, watermark...')}
          className={fieldCls}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[13px] font-medium">{t('aspect_ratio', 'Aspect ratio')}</div>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className={fieldCls}>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[13px] font-medium">{t('duration', 'Duration')}</div>
          <select value={durationSeconds} onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10))} className={fieldCls}>
            <option value={4}>4s</option>
            <option value={6}>6s</option>
            <option value={8}>8s</option>
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[13px] font-medium">{t('num_videos', 'Videos')}</div>
          <select value={numberOfVideos} onChange={(e) => setNumberOfVideos(parseInt(e.target.value, 10))} className={fieldCls}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[13px] font-medium">
            {t('seed', 'Seed')} <span className="text-customColor18 font-normal">({t('optional', 'optional')})</span>
          </div>
          <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="auto" className={fieldCls} />
        </div>
      </div>

      <div className="flex items-center gap-[12px]">
        <Button className="rounded-[8px]" loading={generating} disabled={!canGenerate} onClick={generate}>
          {t('generate_video', 'Generate Video')}
        </Button>
        <div className="text-[12px] text-customColor18">
          {t('credits_required', 'Credits required')}: {numberOfVideos}
        </div>
      </div>

      {generating && (
        <div className="flex items-center gap-[10px] text-[13px] text-customColor18 bg-newBgColorInner border-newTableBorder border rounded-[8px] p-[12px]">
          <span className="w-[14px] h-[14px] rounded-full border-2 border-forth border-t-transparent animate-spin inline-block" />
          {t('video_generating_hint', 'Generating your video — this usually takes a few minutes. You can keep this tab open.')}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <div className="text-[13px] font-medium">{t('results', 'Results')}</div>
          <div className="flex flex-wrap gap-[12px]">
            {results.map((r) => (
              <div key={r.id} className="rounded-[8px] overflow-hidden border-newTableBorder border bg-newBgColorInner">
                <video src={r.path} controls className="w-[320px] max-w-full" />
              </div>
            ))}
          </div>
          <div className="text-[12px] text-customColor18">
            {t('video_saved_media', 'Saved to your media library — attach it to a post from the composer.')}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGeneratorComponent;
