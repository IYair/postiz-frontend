'use client';

import { FC, useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { QuoteTab } from './quote.tab';
import { BackgroundTab } from './background.tab';
import { TweetTab } from './tweet.tab';

const TABS = [
  { key: 'quote', label: 'Quote to Image', Comp: QuoteTab },
  { key: 'background', label: 'Screenshot BG', Comp: BackgroundTab },
  { key: 'tweet', label: 'Tweet Screenshot', Comp: TweetTab },
] as const;

const ImageToolsModal: FC<{ onImported: () => void; close: () => void }> = ({
  onImported,
  close,
}) => {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('quote');
  const Active = TABS.find((p) => p.key === tab)!.Comp;
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex gap-[8px] flex-wrap">
        {TABS.map((p) => (
          <div
            key={p.key}
            onClick={() => setTab(p.key)}
            className={
              'cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ' +
              (tab === p.key
                ? 'bg-forth text-white'
                : 'bg-newColColor text-textColor')
            }
          >
            {p.label}
          </div>
        ))}
      </div>
      <Active onImported={onImported} close={close} />
    </div>
  );
};

export const ImageToolsButton: FC<{ onImported: () => void }> = ({
  onImported,
}) => {
  const modals = useModals();
  const t = useT();
  const open = useCallback(() => {
    modals.openModal({
      title: t('tools_image_tools', 'Image tools'),
      withCloseButton: true,
      size: '100%',
      maxSize: '900px',
      children: (close: () => void) => (
        <ImageToolsModal onImported={onImported} close={close} />
      ),
    });
  }, [modals, onImported, t]);

  return (
    <button
      onClick={open}
      className="relative cursor-pointer bg-btnSimple changeColor flex gap-[8px] h-[44px] px-[18px] justify-center items-center rounded-[8px]"
    >
      {t('tools_image_tools', 'Image tools')}
    </button>
  );
};
