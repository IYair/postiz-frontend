'use client';

import { DragEvent, FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import { KANBAN_COLUMNS, canDrag, canDropOn } from './kanban.helpers';

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

  const { data, mutate } = useSWR(
    `/posts/list?state=${column.state}&limit=20&page=${page}`,
    async (url: string) => (await fetch(url)).json(),
    { revalidateOnFocus: false }
  );

  const posts: any[] = data?.posts || [];
  const total: number = data?.total ?? 0;
  const limit: number = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

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
          <RescheduleModal postId={postId} onDone={() => mutate()} close={close} />
        ),
      });
    },
    [column.state, modals, mutate]
  );

  return (
    <div
      className="flex-1 min-w-[240px] bg-newBgColorInner rounded-[8px] p-[12px] flex flex-col gap-[8px]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="font-bold text-[14px] flex justify-between">
        <span>{column.label}</span>
        <span className="opacity-50">{total || ''}</span>
      </div>
      {posts.map((post) => (
        <div
          key={post.id}
          draggable={canDrag(post.state)}
          onDragStart={(e) => {
            e.dataTransfer.setData('postId', post.id);
            e.dataTransfer.setData('postState', post.state);
          }}
          className={
            'bg-newColColor rounded-[8px] p-[10px] text-[13px] flex flex-col gap-[4px] ' +
            (canDrag(post.state) ? 'cursor-grab' : 'cursor-default')
          }
        >
          <div className="flex items-center gap-[6px]">
            {post.integration?.picture && (
              <img
                src={post.integration.picture}
                className="w-[16px] h-[16px] rounded-full"
                alt=""
              />
            )}
            <span className="opacity-70">{post.integration?.name}</span>
          </div>
          <div className="line-clamp-3">
            {(post.content || '').replace(/<[^>]+>/g, ' ').trim()}
          </div>
          <div className="opacity-50 text-[12px]">
            {dayjs.utc(post.publishDate).local().format('DD MMM YYYY HH:mm')}
          </div>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex gap-[8px] justify-center text-[12px]">
          <span className="cursor-pointer" onClick={() => setPage(Math.max(0, page - 1))}>
            Previous
          </span>
          <span>{page + 1}/{totalPages}</span>
          <span
            className="cursor-pointer"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          >
            Next
          </span>
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
