'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useCommandPaletteStore } from '@gitroom/frontend/components/command-palette/command-palette.store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const CommandPaletteButton = () => {
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const t = useT();
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.platform)
    );
  }, []);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('open_command_palette', 'Open command palette')}
      className="hidden h-[36px] items-center gap-[8px] rounded-[8px] border border-newTextColor/10 bg-newBgColorInner px-[10px] text-textColor/60 hover:border-newTextColor/20 hover:text-textColor lg:flex"
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="text-[13px]">{t('search', 'Search')}</span>
      <span className="ms-[6px] rounded-[5px] border border-newTextColor/15 px-[6px] py-[1px] text-[11px] text-textColor/50">
        {isMac ? '\u2318K' : 'Ctrl K'}
      </span>
    </button>
  );
};
