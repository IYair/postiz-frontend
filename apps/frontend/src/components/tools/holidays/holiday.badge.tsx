'use client';

import { FC, MouseEvent, useCallback, useSyncExternalStore } from 'react';
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

export const HOLIDAY_VISIBILITY_STORAGE_KEY = 'show-holidays';
export const HOLIDAY_VISIBILITY_CHANGE_EVENT = 'holiday-visibility-change';
const LEGACY_HOLIDAY_VISIBILITY_STORAGE_KEY = 'hide-holidays';

export const HOLIDAY_COUNTRY_STORAGE_KEY = 'holiday-country';
export const HOLIDAY_COUNTRY_CHANGE_EVENT = 'holiday-country-change';
const DEFAULT_HOLIDAY_COUNTRY = 'MX';

export const areHolidaysVisible = () => {
  if (typeof window === 'undefined') return true;

  try {
    const storedVisibility = localStorage.getItem(HOLIDAY_VISIBILITY_STORAGE_KEY);
    if (storedVisibility !== null) return storedVisibility !== 'false';

    if (localStorage.getItem(LEGACY_HOLIDAY_VISIBILITY_STORAGE_KEY) === 'true') {
      localStorage.setItem(HOLIDAY_VISIBILITY_STORAGE_KEY, 'false');
      return false;
    }

    return true;
  } catch {
    return true;
  }
};

export const setHolidaysVisible = (visible: boolean) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(HOLIDAY_VISIBILITY_STORAGE_KEY, String(visible));
  } catch {
    // Storage unavailable falls back to areHolidaysVisible(), which returns true.
  }

  window.dispatchEvent(new Event(HOLIDAY_VISIBILITY_CHANGE_EVENT));
};

const subscribeHolidayVisibility = (onStoreChange: () => void) => {
  window.addEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);

  return () => {
    window.removeEventListener(HOLIDAY_VISIBILITY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
};

export const useHolidayVisibility = () => {
  const visible = useSyncExternalStore(
    subscribeHolidayVisibility,
    areHolidaysVisible,
    () => true
  );

  const setVisibility = useCallback((nextVisible: boolean) => {
    setHolidaysVisible(nextVisible);
  }, []);

  return [visible, setVisibility] as const;
};

export const getHolidayCountry = () => {
  if (typeof window === 'undefined') return DEFAULT_HOLIDAY_COUNTRY;

  try {
    const country = localStorage.getItem(HOLIDAY_COUNTRY_STORAGE_KEY);
    return country || DEFAULT_HOLIDAY_COUNTRY;
  } catch {
    return DEFAULT_HOLIDAY_COUNTRY;
  }
};

export const setHolidayCountry = (country: string) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(HOLIDAY_COUNTRY_STORAGE_KEY, country);
  } catch {
    // Storage unavailable falls back to getHolidayCountry(), which returns MX.
  }

  window.dispatchEvent(new Event(HOLIDAY_COUNTRY_CHANGE_EVENT));
};

const subscribeHolidayCountry = (onStoreChange: () => void) => {
  window.addEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);

  return () => {
    window.removeEventListener(HOLIDAY_COUNTRY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
};

export const useHolidayCountry = () => {
  const country = useSyncExternalStore(
    subscribeHolidayCountry,
    getHolidayCountry,
    () => DEFAULT_HOLIDAY_COUNTRY
  );

  const setCountry = useCallback((nextCountry: string) => {
    setHolidayCountry(nextCountry);
  }, []);

  return [country, setCountry] as const;
};

export const useHolidays = (date: dayjs.Dayjs) => {
  const fetch = useFetch();
  const [holidaysVisible] = useHolidayVisibility();
  const [country] = useHolidayCountry();
  const month = date.month() + 1;
  const year = date.year();
  const { data } = useSWR<Holiday[]>(
    holidaysVisible
      ? `/tools/holidays?month=${month}&year=${year}&country=${country}`
      : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    { revalidateOnFocus: false }
  );
  return data || [];
};

const getHolidayPostContent = (holiday: Holiday) => {
  const hashtags = holiday.hashtags.map((x) => `#${x}`).join(' ');
  return [holiday.name, holiday.description, hashtags].filter(Boolean).join('\n\n');
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

      if (!h) return;

      const hashtags = h.hashtags.map((x) => `#${x}`).join(' ');
      const postContent = getHolidayPostContent(h);

      modals.openModal({
        title: h.name,
        withCloseButton: true,
        children: (close: () => void) => (
          <div className="flex flex-col gap-[12px]">
            <div className="text-[14px] font-[600] text-textColor">
              {h.name}
            </div>
            {h.description && (
              <div className="text-[14px] text-textColor/80">{h.description}</div>
            )}
            {!!hashtags && (
              <div className="text-[14px] text-forth">{hashtags}</div>
            )}
            <div className="flex gap-[8px]">
              {!!hashtags && (
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(hashtags);
                    toaster.show('Copied', 'success');
                  }}
                >
                  Copy hashtags
                </Button>
              )}
              {onCreatePost && (
                <Button
                  onClick={() => {
                    close();
                    onCreatePost(postContent, date);
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
    <button
      type="button"
      onClick={open}
      title={todays.map((h) => h.name).join(', ')}
      aria-label={`Create post for ${todays[0].name}`}
      className="group w-full cursor-pointer rounded-[8px] border border-forth/30 bg-forth/10 px-[8px] py-[6px] text-left shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-colors hover:border-forth/60 hover:bg-forth/15 focus:outline-none focus:ring-2 focus:ring-forth/40"
    >
      <div className="flex items-start gap-[6px] min-w-0">
        <span className="mt-[1px] text-[12px] leading-[14px]">🎉</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-[600] leading-[14px] text-forth">
            {todays[0].name}
          </div>
          {!!todays[0].description && (
            <div className="mt-[2px] line-clamp-2 text-[10px] leading-[13px] text-textColor/70">
              {todays[0].description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};
