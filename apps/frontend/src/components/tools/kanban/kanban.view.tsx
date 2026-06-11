'use client';

import { DragEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { KANBAN_COLUMNS, canDrag, canDropOn } from './kanban.helpers';

const PAGE_SIZE = 20;

const RescheduleModal: FC<{
  postId: string;
  onDone: () => void;
  close: () => void;
}> = ({ postId, onDone, close }) => {
  const fetch = useFetch();
  const toaster = useToaster();
  const [value, setValue] = useState(
    dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm')
  );

  const save = useCallback(async () => {
    await fetch(`/posts/${postId}/date`, {
      method: 'PUT',
      body: JSON.stringify({
        date: dayjs(value).utc().format('YYYY-MM-DDTHH:mm:ss'),
        action: 'schedule',
      }),
    });
    toaster.show('Rescheduled', 'success');
    onDone();
    close();
  }, [postId, value, fetch, onDone, close, toaster]);

  return (
    <div className="flex flex-col gap-[12px]">
      <input
        type="datetime-local"
        className="bg-newColColor rounded-[8px] p-[12px] text-textColor"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button onClick={save}>Schedule</Button>
    </div>
  );
};

const Column: FC<{ column: (typeof KANBAN_COLUMNS)[number] }> = ({ column }) => {
  const fetch = useFetch();
  const modals = useModals();
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loadedPosts, setLoadedPosts] = useState<any[]>([]);
  const { integrations, reloadCalendarView } = useCalendar();

  const { data, mutate, isLoading } = useSWR(
    `/posts/list?state=${column.state}&limit=${PAGE_SIZE}&page=${page}&allDates=true&refresh=${refresh}`,
    async (url: string) => (await fetch(url)).json(),
    { revalidateOnFocus: false }
  );

  const total: number = data?.total ?? 0;
  const hasMore: boolean = data?.hasMore ?? false;
  const isInitialLoading = isLoading && !loadedPosts.length;

  useEffect(() => {
    if (!data?.posts) return;
    setLoadedPosts((current) => {
      const next = page === 0 ? data.posts : [...current, ...data.posts];
      return Array.from(new Map(next.map((post: any) => [post.id, post])).values());
    });
  }, [data?.posts, page]);

  const refreshColumn = useCallback(() => {
    setLoadedPosts([]);
    setPage(0);
    setRefresh((value) => value + 1);
    mutate();
    reloadCalendarView();
  }, [mutate, reloadCalendarView]);

  const createAction = useMemo<'draft' | 'schedule' | 'now'>(() => {
    if (column.state === 'scheduled') return 'schedule';
    if (column.state === 'published') return 'now';
    return 'draft';
  }, [column.state]);

  const createDate = useMemo(() => {
    if (column.state === 'scheduled') return dayjs().add(1, 'hour');
    return dayjs();
  }, [column.state]);

  const openCreate = useCallback(() => {
    modals.openModal({
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
          integrations={integrations.slice(0).map((p) => ({ ...p }))}
          mutate={refreshColumn}
          date={createDate}
          forcedPostAction={createAction}
          reopenModal={() => ({})}
        />
      ),
      size: '80%',
    });
  }, [createAction, createDate, integrations, modals, refreshColumn]);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const postId = e.dataTransfer.getData('postId');
      const postState = e.dataTransfer.getData('postState');
      if (!postId || !canDropOn(postState, column.state)) return;
      modals.openModal({
        title: 'Reschedule post',
        withCloseButton: true,
        children: (close: () => void) => (
          <RescheduleModal postId={postId} onDone={refreshColumn} close={close} />
        ),
      });
    },
    [column.state, modals, refreshColumn]
  );

  return (
    <div
      className="flex-1 min-w-[280px] bg-newBgColorInner rounded-[12px] p-[12px] flex flex-col gap-[10px] max-h-[calc(100vh-190px)]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="font-bold text-[14px] flex justify-between items-center">
        <span>{column.label}</span>
        <span className="opacity-50">{total || ''}</span>
      </div>
      <button
        onClick={openCreate}
        className="border border-dashed border-newTextColor/20 rounded-[10px] min-h-[58px] text-newTextColor/60 hover:text-white hover:border-[#612BD3] hover:bg-[#612BD3]/10 transition-colors flex flex-col items-center justify-center gap-[2px]"
        title={column.state === 'error' ? 'Create draft to fix' : `Create ${column.label}`}
      >
        <span className="text-[24px] leading-[20px]">+</span>
        <span className="text-[12px]">
          {column.state === 'error' ? 'Create draft' : `Create ${column.label}`}
        </span>
      </button>
      <div className="flex flex-col gap-[8px] overflow-y-auto scrollbar scrollbar-thumb-newColColor scrollbar-track-newBgColorInner pe-[2px]">
      {loadedPosts.map((post) => (
        <div
          key={post.id}
          draggable={canDrag(post.state)}
          onDragStart={(e) => {
            e.dataTransfer.setData('postId', post.id);
            e.dataTransfer.setData('postState', post.state);
          }}
          className={
            'bg-newColColor rounded-[10px] p-[12px] text-[13px] flex flex-col gap-[8px] border border-newTextColor/5 ' +
            (canDrag(post.state) ? 'cursor-grab' : 'cursor-default')
          }
        >
          <div className="flex items-center gap-[8px] min-w-0">
            {post.integration?.picture && (
              <img
                src={post.integration.picture}
                className="w-[22px] h-[22px] rounded-full shrink-0"
                alt=""
              />
            )}
            <span className="opacity-80 truncate">{post.integration?.name}</span>
          </div>
          <div className="line-clamp-4 leading-[1.45] text-[13px]">
            {(post.content || '').replace(/<[^>]+>/g, ' ').trim() || 'No content'}
          </div>
          <div className="flex justify-between gap-[8px] opacity-55 text-[12px]">
            <span>{post.state}</span>
            <span>{dayjs.utc(post.publishDate).local().format('DD MMM YYYY HH:mm')}</span>
          </div>
        </div>
      ))}
      </div>
      {hasMore && (
        <Button onClick={() => setPage((value) => value + 1)}>
          Load more
        </Button>
      )}
      {isInitialLoading && (
        <div className="rounded-[10px] border border-newTextColor/5 p-[16px] text-[13px] text-newTextColor/50 text-center">
          Loading...
        </div>
      )}
      {!isInitialLoading && !loadedPosts.length && !hasMore && (
        <div className="rounded-[10px] border border-newTextColor/5 p-[16px] text-[13px] text-newTextColor/50 text-center">
          No posts yet
        </div>
      )}
    </div>
  );
};

export const KanbanView: FC = () => {
  useCalendar();
  return (
    <div className="flex gap-[12px] items-start overflow-x-auto p-[4px]">
      {KANBAN_COLUMNS.map((c) => (
        <Column key={c.state} column={c} />
      ))}
    </div>
  );
};
