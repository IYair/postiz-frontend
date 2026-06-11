'use client';

import { FC, MouseEvent, useCallback } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';

interface Holiday {
  date: string;
  name: string;
  description: string;
  hashtags: string[];
}

export const useHolidays = (date: dayjs.Dayjs) => {
  const fetch = useFetch();
  const month = date.month() + 1;
  const year = date.year();
  const { data } = useSWR<Holiday[]>(
    typeof window !== 'undefined' && localStorage.getItem('hide-holidays') === 'true'
      ? null
      : `/tools/holidays?month=${month}&year=${year}`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    { revalidateOnFocus: false }
  );
  return data || [];
};

export const HolidayBadge: FC<{
  date: dayjs.Dayjs;
  onCreatePost?: (content: string, date: dayjs.Dayjs) => void;
}> = ({ date, onCreatePost }) => {
  const holidays = useHolidays(date);
  const modals = useModals();
  const toaster = useToaster();
  const todays = holidays.filter((h) => h.date === date.format('YYYY-MM-DD'));

  const open = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const h = todays[0];
      modals.openModal({
        title: h.name,
        withCloseButton: true,
        children: (close: () => void) => (
          <div className="flex flex-col gap-[12px]">
            <div className="text-[14px]">{h.description}</div>
            <div className="text-[14px] text-forth">
              {h.hashtags.map((x) => `#${x}`).join(' ')}
            </div>
            <div className="flex gap-[8px]">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    h.hashtags.map((x) => `#${x}`).join(' ')
                  );
                  toaster.show('Copied', 'success');
                }}
              >
                Copy hashtags
              </Button>
              {onCreatePost && (
                <Button
                  onClick={() => {
                    close();
                    onCreatePost(
                      `\n\n${h.hashtags.map((x) => `#${x}`).join(' ')}`,
                      date
                    );
                  }}
                >
                  Create post
                </Button>
              )}
            </div>
          </div>
        ),
      });
    },
    [todays, modals, onCreatePost, toaster, date]
  );

  if (!todays.length) return null;

  return (
    <div
      onClick={open}
      title={todays.map((h) => h.name).join(', ')}
      className="cursor-pointer text-[10px] leading-[14px] px-[4px] rounded-[4px] bg-forth/20 text-forth truncate"
    >
      🎉 {todays[0].name}
    </div>
  );
};
