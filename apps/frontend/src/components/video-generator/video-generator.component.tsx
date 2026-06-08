'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

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

export const VideoGeneratorComponent: React.FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toaster = useToaster();

  const [mode, setMode] = useState<Mode>('text');
  const [prompt, setPrompt] = useState('');
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

  const pickStart = useCallback(async (f?: File) => {
    if (f) setStartImage(await readFileAsBase64(f));
  }, []);
  const pickEnd = useCallback(async (f?: File) => {
    if (f) setEndImage(await readFileAsBase64(f));
  }, []);
  const pickRefs = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const refs = await Promise.all(Array.from(files).slice(0, 3).map(readFileAsBase64));
    setReferenceImages(refs);
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

  const generate = useCallback(async () => {
    const body: any = { mode, aspectRatio, numberOfVideos, durationSeconds };
    if (prompt) body.prompt = prompt;
    if (seed) body.seed = parseInt(seed, 10);
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
  }, [mode, aspectRatio, numberOfVideos, durationSeconds, prompt, seed, startImage, endImage, referenceImages, fetch, poll, toaster, t]);

  const tabBtn = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`px-[16px] h-[36px] rounded-[8px] text-[14px] ${mode === m ? 'bg-forth text-white' : 'bg-newBgColorInner'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-[16px] max-w-[560px]">
      <div className="text-[20px] font-medium">{t('ai_video_generator', 'AI Video Generator')}</div>

      <div className="flex gap-[8px]">
        {tabBtn('text', t('text_to_video', 'Text to Video'))}
        {tabBtn('frames', t('frames_to_video', 'Frames to Video'))}
        {tabBtn('ingredients', t('ingredients_to_video', 'Ingredients'))}
      </div>

      {mode === 'frames' && (
        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px]">{t('start_frame', 'Start frame')}</div>
          <input type="file" accept="image/*" onChange={(e) => pickStart(e.target.files?.[0])} />
          <div className="text-[14px]">{t('end_frame', 'End frame (optional)')}</div>
          <input type="file" accept="image/*" onChange={(e) => pickEnd(e.target.files?.[0])} />
        </div>
      )}

      {mode === 'ingredients' && (
        <div className="flex flex-col gap-[8px]">
          <div className="text-[14px]">{t('reference_images', 'Reference images (max 3)')}</div>
          <input type="file" accept="image/*" multiple onChange={(e) => pickRefs(e.target.files)} />
        </div>
      )}

      <div className="flex flex-col gap-[6px]">
        <div className="text-[14px]">{t('prompt', 'Prompt')}</div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] bg-newBgColorInner p-[12px] outline-none border-newTableBorder border rounded-[8px] text-[14px]"
        />
      </div>

      <div className="flex gap-[16px]">
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">{t('aspect_ratio', 'Aspect ratio')}</div>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)}
            className="h-[42px] bg-newBgColorInner px-[12px] border-newTableBorder border rounded-[8px] text-[14px]">
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">{t('duration', 'Duration (s)')}</div>
          <select value={durationSeconds} onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10))}
            className="h-[42px] bg-newBgColorInner px-[12px] border-newTableBorder border rounded-[8px] text-[14px]">
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">{t('num_videos', '# Videos')}</div>
          <select value={numberOfVideos} onChange={(e) => setNumberOfVideos(parseInt(e.target.value, 10))}
            className="h-[42px] bg-newBgColorInner px-[12px] border-newTableBorder border rounded-[8px] text-[14px]">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
          </select>
        </div>
        <div className="flex flex-col gap-[6px]">
          <div className="text-[14px]">{t('seed', 'Seed')}</div>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="auto"
            className="h-[42px] w-[100px] bg-newBgColorInner px-[12px] border-newTableBorder border rounded-[8px] text-[14px]" />
        </div>
      </div>

      <div className="text-[12px] text-customColor18">
        {t('credits_required', 'Credits required')}: {numberOfVideos}
      </div>

      <Button className="rounded-[8px]" loading={generating} onClick={generate}>
        {t('generate_video', 'Generate Video')}
      </Button>

      {results.length > 0 && (
        <div className="flex flex-wrap gap-[12px]">
          {results.map((r) => (
            <video key={r.id} src={r.path} controls className="w-[240px] rounded-[8px]" />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoGeneratorComponent;
