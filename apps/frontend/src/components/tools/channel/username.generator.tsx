'use client';

import { FC, useCallback, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { generateTool, ToolKey } from '../generate.api';

export const SuggestList: FC<{
  toolKey: ToolKey;
  network: string;
  onPick?: (value: string) => void;
}> = ({ toolKey, network, onPick }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const out = await generateTool(fetch, toolKey, { input, network });
      setResults(out.results);
    } catch (e: any) {
      setError(
        e.message === 'no-provider'
          ? 'Configure an AI provider in Settings first'
          : 'Generation failed, try again'
      );
    } finally {
      setLoading(false);
    }
  }, [input, network, toolKey, fetch]);

  return (
    <div className="flex flex-col gap-[12px]">
      <textarea
        className="w-full h-[70px] bg-newColColor rounded-[8px] p-[12px] text-textColor resize-none"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe the brand/account..."
      />
      <Button onClick={generate} loading={loading} disabled={!input.trim()}>
        Generate
      </Button>
      {!!error && <div className="text-red-500 text-[13px]">{error}</div>}
      {results.map((r) => (
        <div
          key={r}
          className="flex items-center gap-[8px] bg-newColColor rounded-[8px] p-[10px]"
        >
          <div className="flex-1 text-[14px]">{r}</div>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(r);
              toaster.show('Copied', 'success');
            }}
          >
            Copy
          </Button>
          {onPick && <Button onClick={() => onPick(r)}>Use</Button>}
        </div>
      ))}
    </div>
  );
};

export const UsernameGenerator: FC<{
  network: string;
  onPick: (value: string) => void;
}> = (props) => <SuggestList toolKey="usernames" {...props} />;
