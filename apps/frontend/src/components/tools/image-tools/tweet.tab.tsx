'use client';

import { FC, useMemo, useRef, useState } from 'react';
import { EmbeddedTweet } from 'react-tweet';
import type { Tweet } from 'react-tweet/api';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { renderNodeToFile, downloadFile } from './render.image';

type BgMode = 'gradient' | 'solid' | 'image';

const PRESETS: { name: string; c1: string; c2: string; angle: number }[] = [
  { name: 'Twitter', c1: '#1d9bf0', c2: '#0c7abf', angle: 135 },
  { name: 'Violet', c1: '#7c3aed', c2: '#a855f7', angle: 135 },
  { name: 'Sunset', c1: '#ff6b6b', c2: '#feca57', angle: 135 },
  { name: 'Peach', c1: '#ee9ca7', c2: '#ffdde1', angle: 135 },
  { name: 'Ocean', c1: '#2193b0', c2: '#6dd5ed', angle: 135 },
  { name: 'Mint', c1: '#11998e', c2: '#38ef7d', angle: 135 },
  { name: 'Night', c1: '#0f2027', c2: '#2c5364', angle: 160 },
  { name: 'Candy', c1: '#fc5c7d', c2: '#6a82fb', angle: 135 },
];

export const TweetTab: FC<{ onImported: () => void; close: () => void }> = ({
  onImported,
  close,
}) => {
  const fetch = useFetch();
  const toaster = useToaster();

  const [url, setUrl] = useState('');
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // appearance
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [bgMode, setBgMode] = useState<BgMode>('gradient');
  const [color1, setColor1] = useState('#1d9bf0');
  const [color2, setColor2] = useState('#0c7abf');
  const [angle, setAngle] = useState(135);
  const [solid, setSolid] = useState('#15202b');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [pad, setPad] = useState(56);
  const [blur, setBlur] = useState(0);
  const [glass, setGlass] = useState(false);
  const [glassIntensity, setGlassIntensity] = useState(60);

  const cardRef = useRef<HTMLDivElement>(null);

  const uppy = useUppyUploader({
    allowedFileTypes: 'image/*',
    onStart: () => setBusy(true),
    onEnd: () => setBusy(false),
    onUploadSuccess: () => {
      toaster.show('Image added to library', 'success');
      onImported();
      close();
    },
  });

  const load = async () => {
    setError('');
    setTweet(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/tools/tweet-oembed?url=${encodeURIComponent(url)}`
      );
      if (!res.ok) {
        setError('Post not found, private or invalid URL');
        return;
      }
      setTweet(await res.json());
    } catch {
      setError('Could not load the post');
    } finally {
      setLoading(false);
    }
  };

  const makeFile = async () => {
    if (!cardRef.current) throw new Error('render-failed');
    return renderNodeToFile(cardRef.current, `tweet-${Date.now()}.png`);
  };

  const upload = async () => {
    try {
      setBusy(true);
      const file = await makeFile();
      // @ts-ignore
      uppy.addFiles([file]);
    } catch {
      setBusy(false);
      toaster.show('Render failed - try Download instead', 'warning');
    }
  };

  const download = async () => {
    try {
      downloadFile(await makeFile());
    } catch {
      toaster.show('Render failed', 'warning');
    }
  };

  const onBgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgImage(reader.result as string);
      setBgMode('image');
    };
    reader.readAsDataURL(file);
  };

  // background of the framed canvas (blurred layer sits behind the card)
  const bgLayerStyle = useMemo<React.CSSProperties>(() => {
    if (bgMode === 'image' && bgImage) {
      return {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (bgMode === 'solid') {
      return { background: solid };
    }
    return { background: `linear-gradient(${angle}deg, ${color1}, ${color2})` };
  }, [bgMode, bgImage, solid, angle, color1, color2]);

  // translucent card colour driven by the glass intensity slider
  const glassBg = useMemo(() => {
    const alpha = Math.max(0.12, 1 - (glassIntensity / 100) * 0.85).toFixed(3);
    return theme === 'dark'
      ? `rgba(21,32,43,${alpha})`
      : `rgba(255,255,255,${alpha})`;
  }, [glass, glassIntensity, theme]);

  return (
    <div className="flex gap-[20px] flex-col lg:flex-row">
      {/* ---- controls ---- */}
      <div className="flex flex-col gap-[14px] w-full lg:w-[300px] shrink-0">
        <input
          className="w-full bg-newColColor rounded-[8px] p-[12px] text-textColor outline-none"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && url.trim() && load()}
          placeholder="https://x.com/jack/status/20"
        />
        <Button onClick={load} disabled={!url.trim()} loading={loading}>
          Load post
        </Button>
        {!!error && <div className="text-red-500 text-[13px]">{error}</div>}

        {/* theme */}
        <div className="flex gap-[8px]">
          {(['dark', 'light'] as const).map((th) => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              className={`flex-1 h-[34px] rounded-[8px] text-[13px] capitalize border ${
                theme === th
                  ? 'bg-newColColor border-[#612BD3] text-white'
                  : 'border-newColColor text-textColor'
              }`}
            >
              {th}
            </button>
          ))}
        </div>

        {/* background mode */}
        <div className="flex flex-col gap-[8px]">
          <div className="text-[12px] uppercase tracking-wide opacity-60">
            Background
          </div>
          <div className="flex gap-[6px]">
            {(['gradient', 'solid', 'image'] as BgMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setBgMode(m)}
                className={`flex-1 h-[32px] rounded-[8px] text-[12px] capitalize border ${
                  bgMode === m
                    ? 'bg-newColColor border-[#612BD3] text-white'
                    : 'border-newColColor text-textColor'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {bgMode === 'gradient' && (
            <>
              <div className="flex flex-wrap gap-[6px]">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    title={p.name}
                    onClick={() => {
                      setColor1(p.c1);
                      setColor2(p.c2);
                      setAngle(p.angle);
                    }}
                    className="w-[28px] h-[28px] rounded-full border border-white/20"
                    style={{
                      background: `linear-gradient(${p.angle}deg, ${p.c1}, ${p.c2})`,
                    }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-[8px] text-[13px]">
                Colors
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                />
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-[8px] text-[13px]">
                Direction
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) => setAngle(+e.target.value)}
                />
                <span className="w-[34px] text-right opacity-60">{angle}°</span>
              </label>
            </>
          )}

          {bgMode === 'solid' && (
            <label className="flex items-center gap-[8px] text-[13px]">
              Color
              <input
                type="color"
                value={solid}
                onChange={(e) => setSolid(e.target.value)}
              />
            </label>
          )}

          {bgMode === 'image' && (
            <input type="file" accept="image/*" onChange={onBgFile} />
          )}
        </div>

        {/* effects */}
        <div className="flex flex-col gap-[8px]">
          <div className="text-[12px] uppercase tracking-wide opacity-60">
            Effects
          </div>
          <label className="flex items-center gap-[8px] text-[13px]">
            Background blur
            <input
              type="range"
              min={0}
              max={30}
              value={blur}
              onChange={(e) => setBlur(+e.target.value)}
            />
            <span className="w-[34px] text-right opacity-60">{blur}px</span>
          </label>
          <label className="flex items-center gap-[8px] text-[13px]">
            <input
              type="checkbox"
              checked={glass}
              onChange={(e) => setGlass(e.target.checked)}
            />
            Glass card
          </label>
          {glass && (
            <label className="flex items-center gap-[8px] text-[13px]">
              Intensity
              <input
                type="range"
                min={0}
                max={100}
                value={glassIntensity}
                onChange={(e) => setGlassIntensity(+e.target.value)}
              />
              <span className="w-[34px] text-right opacity-60">
                {glassIntensity}
              </span>
            </label>
          )}
          <label className="flex items-center gap-[8px] text-[13px]">
            Padding
            <input
              type="range"
              min={16}
              max={120}
              value={pad}
              onChange={(e) => setPad(+e.target.value)}
            />
            <span className="w-[34px] text-right opacity-60">{pad}px</span>
          </label>
        </div>

        <div className="flex gap-[8px] flex-wrap">
          <Button onClick={download} disabled={!tweet || busy}>
            Download
          </Button>
          <Button onClick={upload} disabled={!tweet} loading={busy}>
            Add to library
          </Button>
        </div>
      </div>

      {/* ---- preview ---- */}
      <div className="flex-1 min-w-0 flex items-center justify-center overflow-auto">
        {tweet ? (
          <div
            ref={cardRef}
            data-glass={glass ? '1' : '0'}
            data-theme={theme}
            className="tw-shot relative flex items-center justify-center w-fit"
            style={
              {
                padding: pad,
                ['--shot-card-bg' as any]: glass ? glassBg : undefined,
                ['--shot-glass-blur' as any]: glass
                  ? `${Math.round((glassIntensity / 100) * 16)}px`
                  : '0px',
              } as React.CSSProperties
            }
          >
            <div
              className="absolute inset-0 z-0"
              style={{
                ...bgLayerStyle,
                filter: blur ? `blur(${blur}px)` : undefined,
                transform: blur ? 'scale(1.1)' : undefined,
              }}
            />
            <div className="relative z-10 react-tweet-shot">
              <EmbeddedTweet tweet={tweet} />
            </div>
          </div>
        ) : (
          <div className="min-h-[360px] flex items-center justify-center text-textColor/60">
            Paste a X/Twitter post URL and load it...
          </div>
        )}
      </div>
    </div>
  );
};
