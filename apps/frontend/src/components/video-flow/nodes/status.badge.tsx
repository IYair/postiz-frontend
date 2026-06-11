'use client';

import React from 'react';
import { useVideoFlowStore } from '../video-flow.store';

const COLORS: Record<string, string> = {
  idle: 'bg-newTableBorder',
  running: 'bg-yellow-600',
  done: 'bg-green-600',
  error: 'bg-red-600',
};

export const StatusBadge: React.FC<{ id: string }> = ({ id }) => {
  const status = useVideoFlowStore((s) => s.statuses[id] || 'idle');
  const error = useVideoFlowStore((s) => s.errors[id]);
  return (
    <div
      title={error}
      className={`px-[8px] h-[20px] rounded-[6px] text-[11px] text-white flex items-center ${COLORS[status]}`}
    >
      {status}
    </div>
  );
};
