'use client';

import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

export const VideoFlowComponent: React.FC = () => {
  const t = useT();
  return (
    <div className="flex flex-col gap-[12px] flex-1">
      <div className="text-[20px] font-medium">
        {t('video_flow', 'Video Flow')}
      </div>
      <div className="flex-1 min-h-[600px] border-newTableBorder border rounded-[8px] overflow-hidden">
        <ReactFlowProvider>
          <ReactFlow nodes={[]} edges={[]} fitView colorMode="dark">
            <Background />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default VideoFlowComponent;
