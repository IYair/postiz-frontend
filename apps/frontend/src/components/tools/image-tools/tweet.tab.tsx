'use client';

import { FC, useRef, useState } from 'react';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { renderNodeToFile, downloadFile } from './render.image';

export const TweetTab: FC<{ onImported: () => void; close: () => void }> = ({
  onImported,
  close,
}) => {
  const fetch = useFetch();
  const [url, setUrl] = useState('');
  const [tweet, setTweet] = useState<{
    text: string;
    authorName: string;
    username: string;
    date: string;
  } | null>(null);
  const [dark, setDark] = useState(true);
  const [bg, setBg] = useState('#7c3aed');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const toaster = useToaster();

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
    const res = await fetch(`/tools/tweet-oembed?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      setError('Post not found, private or invalid URL');
      return;
    }
    setTweet(await res.json());
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

  return (
    <div className="flex gap-[20px] flex-col lg:flex-row">
      <div className="flex flex-col gap-[12px] w-full lg:w-[280px]">
        <input
          className="w-full bg-newColColor rounded-[8px] p-[12px] text-textColor"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/jack/status/20"
        />
        <Button onClick={load} disabled={!url.trim()}>
          Load post
        </Button>
        {!!error && <div className="text-red-500 text-[13px]">{error}</div>}
        <label className="flex items-center gap-[8px] text-[13px]">
          Background
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
        </label>
        <label className="flex items-center gap-[8px] text-[13px]">
          <input
            type="checkbox"
            checked={dark}
            onChange={(e) => setDark(e.target.checked)}
          />
          Dark card
        </label>
        <div className="flex gap-[8px] flex-wrap">
          <Button onClick={download} disabled={!tweet || busy}>
            Download
          </Button>
          <Button onClick={upload} disabled={!tweet} loading={busy}>
            Add to library
          </Button>
        </div>
      </div>
      <div
        ref={cardRef}
        style={{ background: bg }}
        className="flex-1 min-h-[360px] flex items-center justify-center p-[40px]"
      >
        {tweet && (
          <div
            style={{
              background: dark ? '#15202b' : '#ffffff',
              color: dark ? '#ffffff' : '#0f1419',
            }}
            className="rounded-[16px] p-[24px] max-w-[480px] w-full shadow-xl"
          >
            <div className="font-bold">{tweet.authorName}</div>
            <div className="text-[13px] opacity-60">@{tweet.username}</div>
            <div className="mt-[12px] text-[17px] leading-[1.4] whitespace-pre-wrap">
              {tweet.text}
            </div>
            <div className="mt-[12px] text-[13px] opacity-60">{tweet.date}</div>
          </div>
        )}
        {!tweet && <div className="text-white/70">Paste a X/Twitter post URL...</div>}
      </div>
    </div>
  );
};
