'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useAiConfig } from '@gitroom/frontend/components/settings/ai-provider.component';
import { useVideoFlowStore } from './video-flow.store';
import { useRunFlow } from './run-flow';
import { TextNode } from './nodes/text.node';
import { ImageNode } from './nodes/image.node';
import { VideoNode } from './nodes/video.node';

const nodeTypes = { text: TextNode, image: ImageNode, video: VideoNode };

const FlowCanvas: React.FC = () => {
  const t = useT();
  const toaster = useToaster();
  const runFlow = useRunFlow();

  const { data: aiConfig } = useAiConfig();
  const hasVideoProvider = !!aiConfig?.videoProvider;

  const nodes = useVideoFlowStore((s) => s.nodes);
  const edges = useVideoFlowStore((s) => s.edges);
  const running = useVideoFlowStore((s) => s.running);
  const onNodesChange = useVideoFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useVideoFlowStore((s) => s.onEdgesChange);
  const storeConnect = useVideoFlowStore((s) => s.onConnect);
  const addNode = useVideoFlowStore((s) => s.addNode);
  const clearAll = useVideoFlowStore((s) => s.clearAll);

  const onConnect = useCallback(
    (conn: Connection) => {
      const error = storeConnect(conn);
      if (error) toaster.show(error, 'warning');
    },
    [storeConnect, toaster]
  );

  const videoCredits = useMemo(
    () => nodes.filter((n) => n.type === 'video').length,
    [nodes]
  );

  return (
    <div className="flex flex-col gap-[12px] flex-1">
      <div className="flex items-center gap-[12px]">
        <div className="text-[20px] font-medium">
          {t('video_flow', 'Video Flow')}
        </div>
        {hasVideoProvider ? (
          <div className="text-[13px] text-customColor18">
            {aiConfig?.videoProvider} · {aiConfig?.videoModel}
          </div>
        ) : (
          <div className="text-[13px] text-customColor18">
            {t(
              'video_no_provider',
              'No video provider configured. Set up Google Veo in Settings → AI provider first.'
            )}{' '}
            <a href="/settings" className="underline">
              {t('go_to_settings', 'Go to settings')}
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center gap-[8px]">
        <Button secondary={true} className="rounded-[8px]" onClick={() => addNode('text')}>
          + {t('node_prompt', 'Prompt')}
        </Button>
        <Button secondary={true} className="rounded-[8px]" onClick={() => addNode('image')}>
          + {t('node_image', 'Image')}
        </Button>
        <Button secondary={true} className="rounded-[8px]" onClick={() => addNode('video')}>
          + {t('node_video', 'Video')}
        </Button>
        <div className="flex-1" />
        <div className="text-[12px] text-customColor18">
          {t('credits_required', 'Credits required')}: {videoCredits}
        </div>
        <Button
          className="rounded-[8px]"
          loading={running}
          disabled={!hasVideoProvider || !nodes.length}
          onClick={runFlow}
        >
          {t('run_flow', 'Run Flow')}
        </Button>
        <Button secondary={true} className="rounded-[8px]" onClick={clearAll}>
          {t('clear', 'Clear')}
        </Button>
      </div>

      <div className="flex-1 min-h-[600px] border-newTableBorder border rounded-[8px] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          colorMode="dark"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export const VideoFlowComponent: React.FC = () => (
  <ReactFlowProvider>
    <FlowCanvas />
  </ReactFlowProvider>
);

export default VideoFlowComponent;
