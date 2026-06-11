'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { useVideoFlowStore } from '../video-flow.store';
import { HANDLE, resolveVideoMode } from '../flow-logic';
import { StatusBadge } from './status.badge';

const selectCls =
  'nodrag h-[32px] bg-newBgColorInner px-[8px] border-newTableBorder border rounded-[6px] text-[12px]';

export const VideoNode: React.FC<NodeProps> = ({ id, data }) => {
  const updateNodeData = useVideoFlowStore((s) => s.updateNodeData);
  // useShallow: el selector devuelve un array nuevo en cada llamada y
  // zustand v5 (sin memoizacion de selector) entraria en re-render loop.
  const incoming = useVideoFlowStore(
    useShallow((s) => s.edges.filter((e) => e.target === id))
  );
  const d: any = data;

  const hasPromptEdge = incoming.some((e) => e.targetHandle === HANDLE.promptIn);
  const hasStart = incoming.some((e) => e.targetHandle === HANDLE.startIn);
  const refCount = incoming.filter((e) => e.targetHandle === HANDLE.refIn).length;
  const mode = resolveVideoMode(hasStart, refCount);

  return (
    <div className="w-[300px] bg-newBgColorInner border-newTableBorder border rounded-[8px] p-[12px] flex flex-col gap-[8px]">
      <div className="flex justify-between items-center">
        <div className="text-[13px] font-medium">
          Video <span className="text-customColor18 text-[11px]">({mode})</span>
        </div>
        <StatusBadge id={id} />
      </div>

      {!hasPromptEdge && (
        <textarea
          value={d.prompt || ''}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          placeholder="Video prompt (or connect a Prompt node)"
          className="nodrag min-h-[60px] bg-newBgColorInner p-[8px] outline-none border-newTableBorder border rounded-[6px] text-[12px]"
        />
      )}

      <div className="flex gap-[8px]">
        <select
          value={d.aspectRatio || '16:9'}
          onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
          className={`${selectCls} flex-1`}
        >
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="auto">Auto</option>
        </select>
        <select
          value={d.durationSeconds || 8}
          onChange={(e) =>
            updateNodeData(id, { durationSeconds: parseInt(e.target.value, 10) })
          }
          className={`${selectCls} flex-1`}
        >
          <option value={4}>4s</option>
          <option value={6}>6s</option>
          <option value={8}>8s</option>
        </select>
        <input
          value={d.seed || ''}
          onChange={(e) => updateNodeData(id, { seed: e.target.value })}
          placeholder="seed"
          className={`${selectCls} w-[70px]`}
        />
      </div>

      <input
        value={d.negativePrompt || ''}
        onChange={(e) => updateNodeData(id, { negativePrompt: e.target.value })}
        placeholder="Negative prompt (optional)"
        className={selectCls}
      />

      {d.resultPath && (
        <video src={d.resultPath} controls className="rounded-[6px] max-h-[160px]" />
      )}

      <Handle type="target" position={Position.Left} id={HANDLE.promptIn} style={{ top: '25%' }} />
      <Handle type="target" position={Position.Left} id={HANDLE.startIn} style={{ top: '50%' }} />
      <Handle type="target" position={Position.Left} id={HANDLE.refIn} style={{ top: '75%' }} />
      <Handle type="source" position={Position.Right} id={HANDLE.videoOut} />
    </div>
  );
};
