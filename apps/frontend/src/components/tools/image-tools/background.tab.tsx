'use client';

import { FC, useRef, useState } from 'react';
import { useUppyUploader } from '@gitroom/frontend/components/media/new.uploader';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { renderNodeToFile, downloadFile } from './render.image';

export const BackgroundTab: FC<{ onImported: () => void; close: () => void }> = ({
  onImported,
  close,
}) => {
  const [img, setImg] = useState<string | null>(null);
  const [pad, setPad] = useState(48);
  const [radius, setRadius] = useState(12);
  const [bgA, setBgA] = useState('#c084fc');
  const [bgB, setBgB] = useState('#f472b6');
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
    return renderNodeToFile(cardRef.current, `screenshot-bg-${Date.now()}.png`);
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
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setImg(URL.createObjectURL(f));
          }}
        />
        <label className="flex items-center gap-[8px] text-[13px]">
          Padding
          <input
            type="range"
            min={16}
            max={120}
            value={pad}
            onChange={(e) => setPad(+e.target.value)}
          />
        </label>
        <label className="flex items-center gap-[8px] text-[13px]">
          Corner radius
          <input
            type="range"
            min={0}
            max={32}
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
          />
        </label>
        <label className="flex items-center gap-[8px] text-[13px]">
          Gradient
          <input type="color" value={bgA} onChange={(e) => setBgA(e.target.value)} />
          <input type="color" value={bgB} onChange={(e) => setBgB(e.target.value)} />
        </label>
        <div className="flex gap-[8px] flex-wrap">
          <Button onClick={download} disabled={!img || busy}>
            Download
          </Button>
          <Button onClick={upload} disabled={!img} loading={busy}>
            Add to library
          </Button>
        </div>
      </div>
      <div
        ref={cardRef}
        style={{ background: `linear-gradient(135deg, ${bgA}, ${bgB})`, padding: pad }}
        className="flex-1 flex items-center justify-center min-h-[360px]"
      >
        {img ? (
          <img src={img} style={{ borderRadius: radius }} className="max-w-full shadow-2xl" alt="Screenshot preview" />
        ) : (
          <div className="text-white/70">Upload a screenshot...</div>
        )}
      </div>
    </div>
  );
};
