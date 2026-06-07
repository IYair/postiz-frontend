'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCommandPaletteStore } from '@gitroom/frontend/components/command-palette/command-palette.store';
import type { Command } from '@gitroom/frontend/components/command-palette/commands';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { SetSelectionModal } from '@gitroom/frontend/components/launches/calendar';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const VIEWS: Array<{
  id: string;
  display: 'day' | 'week' | 'month' | 'list';
  fallback: string;
}> = [
  { id: 'view-day', display: 'day', fallback: 'Day view' },
  { id: 'view-week', display: 'week', fallback: 'Week view' },
  { id: 'view-month', display: 'month', fallback: 'Month view' },
  { id: 'view-list', display: 'list', fallback: 'List view' },
];

const rangeFor = (display: 'day' | 'week' | 'month' | 'list') => {
  const date = newDayjs();
  if (display === 'day') {
    return {
      startDate: date.format('YYYY-MM-DD'),
      endDate: date.format('YYYY-MM-DD'),
    };
  }
  if (display === 'month') {
    return {
      startDate: date.startOf('month').format('YYYY-MM-DD'),
      endDate: date.endOf('month').format('YYYY-MM-DD'),
    };
  }
  return {
    startDate: date.startOf('isoWeek').format('YYYY-MM-DD'),
    endDate: date.endOf('isoWeek').format('YYYY-MM-DD'),
  };
};

export const CalendarPaletteCommands = (): null => {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetch = useFetch();
  const modal = useModals();
  const { setFilters, customer, integrations, reloadCalendarView, sets } =
    useCalendar();
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const registerCommands = useCommandPaletteStore((s) => s.registerCommands);
  const unregisterCommands = useCommandPaletteStore((s) => s.unregisterCommands);
  const processedParam = useRef('');

  const openCreate = useCallback(async () => {
    const date = (await (await fetch('/posts/find-slot')).json()).date;
    const selectedSet: any = !sets.length
      ? undefined
      : await new Promise((resolve) => {
          modal.openModal({
            title: t('select_set', 'Select a Set'),
            closeOnClickOutside: true,
            closeOnEscape: true,
            withCloseButton: false,
            onClose: () => resolve('exit'),
            classNames: { modal: 'text-textColor' },
            children: (
              <SetSelectionModal
                sets={sets}
                onSelect={(set) => {
                  resolve(set);
                  modal.closeAll();
                }}
                onContinueWithoutSet={() => {
                  resolve(undefined);
                  modal.closeAll();
                }}
              />
            ),
          });
        });

    if (selectedSet === 'exit') return;

    modal.openModal({
      id: 'add-edit-modal',
      closeOnClickOutside: false,
      removeLayout: true,
      closeOnEscape: false,
      withCloseButton: false,
      askClose: true,
      fullScreen: true,
      classNames: { modal: 'w-[100%] max-w-[1400px] text-textColor' },
      children: (
        <AddEditModal
          allIntegrations={integrations.map((p) => ({ ...p }))}
          {...(selectedSet?.content
            ? { set: JSON.parse(selectedSet.content) }
            : {})}
          reopenModal={openCreate}
          mutate={reloadCalendarView}
          integrations={integrations}
          date={dayjs.utc(date).local()}
        />
      ),
      size: '80%',
      title: '',
    });
  }, [fetch, integrations, modal, reloadCalendarView, sets, t]);

  const openGroup = useCallback(
    async (group: string) => {
      const data = await (await fetch(`/posts/group/${group}`)).json();
      if (!data?.posts?.length) return;
      const publishDate = dayjs.utc(data.posts[0].publishDate).local();

      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: { modal: 'w-[100%] max-w-[1400px] text-textColor' },
        children: (
          <ExistingDataContextProvider value={data}>
            <AddEditModal
              allIntegrations={integrations.map((p) => ({ ...p }))}
              reopenModal={() => {
                void openGroup(group);
              }}
              mutate={reloadCalendarView}
              integrations={integrations
                .slice(0)
                .filter((integration) => integration.id === data.integration)
                .map((integration) => ({
                  ...integration,
                  picture: data.integrationPicture,
                }))}
              date={publishDate}
            />
          </ExistingDataContextProvider>
        ),
        size: '80%',
        title: '',
      });
    },
    [fetch, integrations, modal, reloadCalendarView]
  );

  const commands = useMemo<Command[]>(() => {
    const group = t('cmd_group_calendar', 'Calendar view');
    const viewCommands = VIEWS.map((view) => ({
      id: view.id,
      group,
      label: t(`cmd_${view.id}`, view.fallback),
      keywords: ['view', 'vista', view.display],
      perform: () => {
        const range = rangeFor(view.display);
        setFilters({ ...range, display: view.display, customer: customer ?? null });
        setOpen(false);
      },
    }));

    return [
      ...viewCommands,
      {
        id: 'view-today',
        group,
        label: t('cmd_view_today', 'Go to today'),
        keywords: ['today', 'hoy', 'now'],
        perform: () => {
          const range = rangeFor('day');
          setFilters({ ...range, display: 'day', customer: customer ?? null });
          setOpen(false);
        },
      },
    ];
  }, [t, setFilters, customer, setOpen]);

  useEffect(() => {
    registerCommands('calendar', commands);
    return () => unregisterCommands('calendar');
  }, [commands, registerCommands, unregisterCommands]);

  useEffect(() => {
    const create = searchParams.get('create');
    const openParam = searchParams.get('open');
    if (!create && !openParam) return;

    const paramKey = create ? `create:${create}` : `open:${openParam}`;
    if (processedParam.current === paramKey) return;
    processedParam.current = paramKey;

    router.replace('/launches');
    if (create) {
      void openCreate();
    } else if (openParam) {
      void openGroup(openParam);
    }
  }, [searchParams, router, openCreate, openGroup]);

  return null;
};
