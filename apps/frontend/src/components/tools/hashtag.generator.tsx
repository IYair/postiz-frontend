'use client';

import { FC, useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { generateTool } from './generate.api';

const HashtagModal: FC<{
  initialInput: string;
  onInsert: (tags: string[]) => void;
  close: () => void;
}> = ({ initialInput, onInsert, close }) => {
  const fetch = useFetch();
  const t = useT();
  const [input, setInput] = useState(initialInput);
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const out = await generateTool(fetch, 'hashtags', { input });
      setResults(out.results);
      setSelected(out.results);
    } catch (e: any) {
      setError(
        e.message === 'no-provider'
          ? t('tools_no_provider', 'Configure an AI provider in Settings first')
          : t('tools_failed', 'Generation failed, try again')
      );
    } finally {
      setLoading(false);
    }
  }, [input, fetch, t]);

  const toggle = (tag: string) =>
    setSelected((s) =>
      s.includes(tag) ? s.filter((x) => x !== tag) : [...s, tag]
    );

  return (
    <div className="flex flex-col gap-[16px]">
      <textarea
        className="w-full h-[80px] bg-newColColor rounded-[8px] p-[12px] text-textColor resize-none"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t('tools_hashtags_placeholder', 'Topic of the post...')}
      />
      <Button onClick={generate} loading={loading} disabled={!input.trim()}>
        {t('tools_generate_hashtags', 'Generate hashtags')}
      </Button>
      {!!error && <div className="text-red-500 text-[13px]">{error}</div>}
      {!!results.length && (
        <>
          <div className="flex flex-wrap gap-[8px]">
            {results.map((tag) => (
              <div
                key={tag}
                onClick={() => toggle(tag)}
                className={
                  'cursor-pointer rounded-[6px] px-[10px] py-[4px] text-[13px] ' +
                  (selected.includes(tag)
                    ? 'bg-forth text-white'
                    : 'bg-newColColor text-textColor')
                }
              >
                #{tag}
              </div>
            ))}
          </div>
          <Button
            onClick={() => {
              onInsert(selected);
              close();
            }}
            disabled={!selected.length}
          >
            {t('tools_insert_selected', 'Insert selected')}
          </Button>
        </>
      )}
    </div>
  );
};

export const HashtagGenerator: FC<{ editor: any; currentValue: string }> = ({
  editor,
  currentValue,
}) => {
  const modals = useModals();
  const t = useT();

  const open = useCallback(() => {
    const plain = (currentValue || '')
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .slice(0, 500);
    modals.openModal({
      title: t('tools_hashtags_title', 'Hashtag generator'),
      withCloseButton: true,
      children: (close: () => void) => (
        <HashtagModal
          initialInput={plain}
          close={close}
          onInsert={(tags) => {
            editor?.commands?.insertContent(
              ' ' + tags.map((x) => `#${x}`).join(' ')
            );
            editor?.commands?.focus();
          }}
        />
      ),
    });
  }, [currentValue, editor, modals, t]);

  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={t('tools_hashtags_title', 'Hashtag generator')}
      onClick={open}
      className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center text-[14px] font-bold"
    >
      #
    </div>
  );
};
