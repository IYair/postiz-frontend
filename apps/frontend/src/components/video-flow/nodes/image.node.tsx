'use client';

import React, { useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useVideoFlowStore } from '../video-flow.store';
import { HANDLE } from '../flow-logic';
import { readFileAsBase64 } from '../file-utils';
import { StatusBadge } from './status.badge';

const selectCls =
  'nodrag h-[32px] bg-newBgColorInner px-[8px] border-newTableBorder border rounded-[6px] text-[12px]';

export const ImageNode: React.FC<NodeProps> = ({ id, data }) => {
  const updateNodeData = useVideoFlowStore((s) => s.updateNodeData);
  const hasPromptEdge = useVideoFlowStore((s) =>
    s.edges.some((e) => e.target === id && e.targetHandle === HANDLE.promptIn)
  );
  const d: any = data;

  const pickFile = useCallback(
    async (f?: File) => {
      if (f) updateNodeData(id, { upload: await readFileAsBase64(f) });
    },
    [id, updateNodeData]
  );

  const preview =
    d.resultPath ||
    (d.upload ? `data:${d.upload.mimeType};base64,${d.upload.base64}` : null);

  return (
    <div className="w-[280px] bg-newBgColorInner border-newTableBorder border rounded-[8px] p-[12px] flex flex-col gap-[8px]">
      <div className="flex justify-between items-center">
        <div className="text-[13px] font-medium">Image</div>
        <StatusBadge id={id} />
      </div>

      <select
        value={d.source}
        onChange={(e) => updateNodeData(id, { source: e.target.value })}
        className={selectCls}
      >
        <option value="generate">Generate with AI</option>
        <option value="upload">Upload</option>
      </select>

      {d.source === 'generate' ? (
        <>
          {!hasPromptEdge && (
            <textarea
              value={d.prompt || ''}
              onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
              placeholder="Image prompt (or connect a Prompt node)"
              className="nodrag min-h-[60px] bg-newBgColorInner p-[8px] outline-none border-newTableBorder border rounded-[6px] text-[12px]"
            />
          )}
          <select
            value={d.aspectRatio || 'landscape'}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
            className={selectCls}
          >
            <option value="square">Square</option>
            <option value="landscape">Landscape (16:9)</option>
            <option value="portrait">Portrait</option>
            <option value="story">Story (9:16)</option>
          </select>
          <label className="nodrag flex items-center gap-[6px] text-[12px]">
            <input
              type="checkbox"
              checked={!!d.enhancePrompt}
              onChange={(e) =>
                updateNodeData(id, { enhancePrompt: e.target.checked })
              }
            />
            Enhance prompt with AI
          </label>
        </>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => pickFile(e.target.files?.[0])}
          className="nodrag text-[12px]"
        />
      )}

      {preview && (
        <img src={preview} alt="" className="rounded-[6px] max-h-[120px] object-cover" />
      )}

      <Handle type="target" position={Position.Left} id={HANDLE.promptIn} />
      <Handle type="source" position={Position.Right} id={HANDLE.imageOut} />
    </div>
  );
};
