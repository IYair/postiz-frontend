'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useVideoFlowStore } from '../video-flow.store';
import { HANDLE } from '../flow-logic';
import { StatusBadge } from './status.badge';

export const TextNode: React.FC<NodeProps> = ({ id, data }) => {
  const updateNodeData = useVideoFlowStore((s) => s.updateNodeData);
  return (
    <div className="w-[260px] bg-newBgColorInner border-newTableBorder border rounded-[8px] p-[12px] flex flex-col gap-[8px]">
      <div className="flex justify-between items-center">
        <div className="text-[13px] font-medium">Prompt</div>
        <StatusBadge id={id} />
      </div>
      <textarea
        value={(data as any).prompt || ''}
        onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
        placeholder="Describe the scene..."
        className="nodrag min-h-[80px] bg-newBgColorInner p-[8px] outline-none border-newTableBorder border rounded-[6px] text-[12px]"
      />
      <Handle type="source" position={Position.Right} id={HANDLE.promptOut} />
    </div>
  );
};
