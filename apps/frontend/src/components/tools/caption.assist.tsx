'use client';

import { FC, useCallback, useState } from 'react';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { Button } from '@gitroom/react/form/button';
import { generateTool, ToolKey } from './generate.api';

const ACTIONS: Array<{
  key: ToolKey;
  label: string;
  mode: 'insert' | 'replace';
}> = [
  { key: 'captions', label: 'Caption', mode: 'replace' },
  { key: 'titles', label: 'Título', mode: 'insert' },
  { key: 'rewrite', label: 'Reescribir', mode: 'replace' },
  { key: 'emoji-translate', label: 'Emojizar', mode: 'insert' },
];

const AssistModal: FC<{
  initialInput: string;
  onApply: (text: string, mode: 'insert' | 'replace') => void;
  close: () => void;
}> = ({ initialInput, onApply, close }) => {
  const fetch = useFetch();
  const t = useT();
  const [action, setAction] = useState(ACTIONS[0]);
  const [input, setInput] = useState(initialInput);
  const [tone, setTone] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const out = await generateTool(fetch, action.key, {
        input,
        ...(tone.trim() ? { toneOverride: tone.trim() } : {}),
      });
      setResults(out.results);
    } catch (e: any) {
      setError(
        e.message === 'no-provider'
          ? t('tools_no_provider', 'Configure an AI provider in Settings first')
          : t('tools_failed', 'Generation failed, try again')
      );
    } finally {
      setLoading(false);
    }
  }, [action, input, tone, fetch, t]);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex gap-[8px]">
        {ACTIONS.map((a) => (
          <div
            key={a.key}
            onClick={() => {
              setAction(a);
              setResults([]);
            }}
            className={
              'cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ' +
              (action.key === a.key
                ? 'bg-forth text-white'
                : 'bg-newColColor text-textColor')
            }
          >
            {a.label}
          </div>
        ))}
      </div>
      <textarea
        className="w-full h-[100px] bg-newColColor rounded-[8px] p-[12px] text-textColor resize-none"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t('tools_assist_placeholder', 'Topic or text...')}
      />
      <input
        className="w-full bg-newColColor rounded-[8px] p-[12px] text-textColor"
        value={tone}
        onChange={(e) => setTone(e.target.value)}
        placeholder={t(
          'tools_tone_override',
          'Tone override (optional, beats brand voice)'
        )}
      />
      <Button onClick={generate} loading={loading} disabled={!input.trim()}>
        {t('tools_generate', 'Generate')}
      </Button>
      {!!error && <div className="text-red-500 text-[13px]">{error}</div>}
      {results.map((r, i) => (
        <div
          key={i}
          className="flex items-start gap-[8px] bg-newColColor rounded-[8px] p-[12px]"
        >
          <div className="flex-1 text-[14px] whitespace-pre-wrap">{r}</div>
          <Button
            onClick={() => {
              onApply(r, action.mode);
              close();
            }}
          >
            {action.mode === 'replace'
              ? t('tools_replace', 'Replace')
              : t('tools_insert', 'Insert')}
          </Button>
        </div>
      ))}
    </div>
  );
};

export const CaptionAssist: FC<{ editor: any; currentValue: string }> = ({
  editor,
  currentValue,
}) => {
  const modals = useModals();
  const t = useT();

  const open = useCallback(() => {
    const plain = (currentValue || '')
      .replace(/<[^>]+>/g, ' ')
      .trim()
      .slice(0, 2000);
    modals.openModal({
      title: t('tools_assist_title', 'AI assist'),
      withCloseButton: true,
      children: (close: () => void) => (
        <AssistModal
          initialInput={plain}
          close={close}
          onApply={(text, mode) => {
            if (mode === 'replace') {
              editor?.commands?.clearContent();
            }
            editor?.commands?.insertContent(text);
            editor?.commands?.focus();
          }}
        />
      ),
    });
  }, [currentValue, editor, modals, t]);

  return (
    <div
      data-tooltip-id="tooltip"
      data-tooltip-content={t('tools_assist_title', 'AI assist')}
      onClick={open}
      className="select-none cursor-pointer rounded-[6px] w-[30px] h-[30px] bg-newColColor flex justify-center items-center text-[14px]"
    >
      ✨
    </div>
  );
};
