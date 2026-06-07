'use client';

import React, { FC, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import i18next from 'i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { isUSCitizen } from './helpers/isuscitizen.utils';

// Height (px) of a single hour slot in the day grid. The whole track is 24x this.
export const HOUR_HEIGHT = 56;
export const DAY_GRID_HEIGHT = HOUR_HEIGHT * 24;
// Left gutter that holds the hour labels (12AM..11PM).
export const TIME_GUTTER = 56;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Convert a minute-of-day (0..1440) into a top offset inside the grid.
export const minuteToTop = (minute: number) => (minute / 60) * HOUR_HEIGHT;

// Background of the day view: 24 horizontal hour lines + their labels.
export const DayTimeGrid: FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0">
      {HOURS.map((hour) => (
        <div
          key={hour}
          style={{ height: HOUR_HEIGHT }}
          className="relative border-t border-newTextColor/10"
        >
          <span className="absolute -top-[7px] end-full me-[8px] whitespace-nowrap text-[11px] leading-none text-textColor/40">
            {hour === 0
              ? ''
              : newDayjs()
                  .startOf('day')
                  .add(hour, 'hour')
                  .format(isUSCitizen() ? 'hA' : 'HH:mm')}
          </span>
        </div>
      ))}
    </div>
  );
};

// Thin line marking the current time, only shown when looking at today.
export const NowIndicator: FC<{ day: dayjs.Dayjs }> = ({ day }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const now = newDayjs();
  const isToday = now.format('YYYY-MM-DD') === day.format('YYYY-MM-DD');
  if (!isToday) {
    return null;
  }

  const minute = now.hour() * 60 + now.minute();
  return (
    <div
      data-tick={tick}
      className="pointer-events-none absolute start-0 end-0 z-[6]"
      style={{ top: minuteToTop(minute) }}
    >
      <div className="absolute -start-[4px] -top-[4px] size-[8px] rounded-full bg-primary" />
      <div className="border-t border-primary" />
    </div>
  );
};

// Small month picker shown beside the day grid. Clicking a day navigates the
// main calendar to that day; the arrows only move the mini-month preview.
export const MiniMonth: FC = () => {
  const { startDate, setFilters, customer } = useCalendar();

  const [viewMonth, setViewMonth] = useState(() =>
    newDayjs(startDate).startOf('month')
  );

  // Keep the preview in sync when the selected day jumps to another month.
  useEffect(() => {
    setViewMonth(newDayjs(startDate).startOf('month'));
  }, [startDate]);

  const weekDays = useMemo(() => {
    dayjs.locale(i18next.resolvedLanguage || 'en');
    return Array.from({ length: 7 }, (_, i) =>
      newDayjs().isoWeekday(i + 1).format('dd')
    );
  }, [i18next.resolvedLanguage]);

  const days = useMemo(() => {
    const monthStart = viewMonth.startOf('month');
    const offset = monthStart.isoWeekday() - 1;
    const gridStart = monthStart.subtract(offset, 'day');
    return Array.from({ length: 42 }, (_, i) => {
      const date = gridStart.add(i, 'day');
      return { date, isCurrentMonth: date.month() === monthStart.month() };
    });
  }, [viewMonth]);

  const today = newDayjs().format('YYYY-MM-DD');
  const selected = newDayjs(startDate).format('YYYY-MM-DD');

  const pick = (date: dayjs.Dayjs) => {
    const iso = date.format('YYYY-MM-DD');
    setFilters({
      startDate: iso,
      endDate: iso,
      display: 'day',
      customer: customer ?? null,
    });
  };

  return (
    <div className="text-textColor">
      <div className="flex items-center text-center">
        <button
          type="button"
          onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
          className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-textColor/50 hover:text-textColor"
        >
          <span className="sr-only">Previous month</span>
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <div className="flex-auto text-[14px] font-[600]">
          {viewMonth.format('MMMM YYYY')}
        </div>
        <button
          type="button"
          onClick={() => setViewMonth((m) => m.add(1, 'month'))}
          className="-m-1.5 flex flex-none items-center justify-center p-1.5 text-textColor/50 hover:text-textColor"
        >
          <span className="sr-only">Next month</span>
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 text-center text-[12px] leading-6 text-textColor/50">
        {weekDays.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="isolate mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-[10px] bg-newTextColor/10 text-[14px] ring-1 ring-newTextColor/10">
        {days.map(({ date, isCurrentMonth }, index) => {
          const iso = date.format('YYYY-MM-DD');
          const isToday = iso === today;
          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => pick(date)}
              className={clsx(
                'py-1.5 focus:z-10 first:rounded-tl-[10px] last:rounded-br-[10px] [&:nth-child(7)]:rounded-tr-[10px] [&:nth-child(36)]:rounded-bl-[10px]',
                isCurrentMonth ? 'bg-newBgColor' : 'bg-newBgColor/40',
                isCurrentMonth ? 'hover:bg-newTableHeader' : 'hover:bg-newTableHeader/60',
                !isCurrentMonth && !isToday && !isSelected && 'text-textColor/40'
              )}
            >
              <time
                dateTime={iso}
                className={clsx(
                  'mx-auto flex size-7 items-center justify-center rounded-full transition-colors',
                  isSelected
                    ? 'bg-primary font-[600] text-white'
                    : isToday
                    ? 'bg-primary/25 font-[600] text-primary'
                    : ''
                )}
              >
                {date.date()}
              </time>
            </button>
          );
        })}
      </div>
    </div>
  );
};
