'use client';

import { FC, useRef, useState } from 'react';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { renderNodeToFile, downloadFile } from './render.image';

export const QuoteTab: FC<{ onImported: () => void; close: () => void }> = ({
  onImported,
  close,
}) => {
  const [text, setText] = useState('');
  const [bg, setBg] = useState('#7cc0ff');
  const [dark, setDark] = useState(false);
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

  const makeFile = async () => {
    if (!cardRef.current) throw new Error('render-failed');
    return renderNodeToFile(cardRef.current, `quote-${Date.now()}.png`);
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
        <textarea
          className="w-full h-[120px] bg-newColColor rounded-[8px] p-[12px] text-textColor resize-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your quote..."
        />
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
          <Button onClick={download} disabled={!text.trim() || busy}>
            Download
          </Button>
          <Button onClick={upload} disabled={!text.trim()} loading={busy}>
            Add to library
          </Button>
        </div>
      </div>
      <div
        ref={cardRef}
        style={{ background: bg }}
        className="flex-1 min-h-[360px] flex items-center justify-center p-[40px]"
      >
        <div
          style={{
            background: dark ? '#1a1a2e' : '#eaf4ff',
            color: dark ? '#ffffff' : '#111111',
          }}
          className="rounded-[16px] p-[28px] text-[20px] leading-[1.5] max-w-[420px] whitespace-pre-wrap shadow-lg"
        >
          {text || 'Your quote...'}
        </div>
      </div>
    </div>
  );
};
