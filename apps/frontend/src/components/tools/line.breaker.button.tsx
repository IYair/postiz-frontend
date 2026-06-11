'use client';

import { FC, useCallback } from 'react';
import { useLaunchStore } from '@gitroom/frontend/components/new-launch/store';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { addInstagramLineBreaks } from './line.breaker';

export const LineBreaker: FC<{ editor: any; currentValue: string }> = ({
  editor,
}) => {
  const t = useT();
  const selectedIntegrations = useLaunchStore((p) => p.selectedIntegrations);
  const hasInstagram = selectedIntegrations.some(
    (s) => s.integration.identifier === 'instagram'
  );

  const apply = useCallback(() => {
    const text = editor?.getText?.() ?? '';
    const fixed = addInstagramLineBreaks(text);
    if (fixed === text) return;
    editor?.commands?.clearContent();
    editor?.commands?.insertContent(fixed.replace(/\n/g, '<br>'));
    editor?.commands?.focus();
  }, [editor]);

  if (!hasInstagram) return null;

  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={t('tools_line_breaker', 'Instagram line breaks')}
      onClick={apply}
      className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center text-[14px]"
    >
      ¶
    </div>
  );
};
