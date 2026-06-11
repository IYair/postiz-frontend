'use client';

import { useCallback } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useVideoFlowStore } from './video-flow.store';
import {
  topologicalOrder,
  resolveVideoMode,
  HANDLE,
  type ImageRef,
  type FlowNodeType,
} from './flow-logic';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 180; // ~15 min por clip, igual que el timeout del workflow

interface NodeOutput {
  prompt?: string;
  mediaId?: string;
  path?: string;
  ref?: ImageRef;
}

export const useRunFlow = () => {
  const fetch = useFetch();
  const toaster = useToaster();

  return useCallback(async () => {
    const store = useVideoFlowStore.getState();
    const { nodes, edges } = store;
    if (!nodes.length) return;
    store.resetRun();
    store.setRunning(true);

    const outputs: Record<string, NodeOutput> = {};

    // Resuelve una media (imagen generada o video previo) a { mimeType, base64 }.
    // Para videos el backend extrae el ULTIMO frame (encadenado de clips).
    const mediaAsRef = async (mediaId: string): Promise<ImageRef> => {
      const res = await fetch('/media/reference-from-media', {
        method: 'POST',
        body: JSON.stringify({ mediaId }),
      });
      if (res.status !== 200 && res.status !== 201) {
        throw new Error('Failed to resolve media reference');
      }
      return res.json();
    };

    const resolveIncomingRef = async (sourceId: string): Promise<ImageRef> => {
      const out = outputs[sourceId];
      if (out?.ref) return out.ref;
      if (out?.mediaId) return mediaAsRef(out.mediaId);
      throw new Error('Upstream node produced no output');
    };

    const pollVideoJob = async (jobId: string) => {
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const res = await (await fetch(`/media/ai-video/${jobId}`)).json();
        if (res.status === 'done') {
          return res.media as { id: string; path: string }[];
        }
        if (res.status === 'error') {
          throw new Error(res.error || 'Video generation failed');
        }
      }
      throw new Error('Video generation timed out');
    };

    const runImageNode = async (id: string, data: any, incoming: any[]) => {
      if (data.source === 'upload') {
        if (!data.upload) throw new Error('Image node has no uploaded file');
        outputs[id] = { ref: data.upload };
        return;
      }
      const promptEdge = incoming.find(
        (e) => e.targetHandle === HANDLE.promptIn
      );
      const prompt = promptEdge
        ? outputs[promptEdge.source]?.prompt
        : data.prompt;
      if (!prompt) throw new Error('Image node needs a prompt');
      const res = await fetch('/media/generate-image-with-prompt', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          aspectRatio: data.aspectRatio || 'landscape',
          skipExpansion: !data.enhancePrompt,
        }),
      });
      if (res.status !== 200 && res.status !== 201) {
        throw new Error((await res.text()) || 'Image generation failed');
      }
      const media = await res.json();
      if (!media) throw new Error('Image generation failed (no credits?)');
      outputs[id] = { mediaId: media.id, path: media.path };
      useVideoFlowStore
        .getState()
        .updateNodeData(id, { resultMediaId: media.id, resultPath: media.path });
    };

    const runVideoNode = async (id: string, data: any, incoming: any[]) => {
      const promptEdge = incoming.find(
        (e) => e.targetHandle === HANDLE.promptIn
      );
      const startEdge = incoming.find(
        (e) => e.targetHandle === HANDLE.startIn
      );
      const refEdges = incoming.filter(
        (e) => e.targetHandle === HANDLE.refIn
      );

      const prompt =
        (promptEdge ? outputs[promptEdge.source]?.prompt : data.prompt) || '';
      const mode = resolveVideoMode(!!startEdge, refEdges.length);

      const body: any = {
        mode,
        aspectRatio: data.aspectRatio || '16:9',
        durationSeconds: data.durationSeconds || 8,
        numberOfVideos: 1,
      };
      if (prompt) body.prompt = prompt;
      if (data.seed) body.seed = parseInt(String(data.seed), 10);
      if (data.negativePrompt) body.negativePrompt = data.negativePrompt;
      if (startEdge) body.startImage = await resolveIncomingRef(startEdge.source);
      if (refEdges.length) {
        body.referenceImages = await Promise.all(
          refEdges.map((e: any) => resolveIncomingRef(e.source))
        );
      }

      const res = await fetch('/media/ai-video', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.status !== 200 && res.status !== 201) {
        throw new Error((await res.text()) || 'Video generation failed');
      }
      const { jobId } = await res.json();
      const media = await pollVideoJob(jobId);
      if (!media?.length) throw new Error('No video returned');
      outputs[id] = { mediaId: media[0].id, path: media[0].path };
      useVideoFlowStore.getState().updateNodeData(id, {
        resultMediaId: media[0].id,
        resultPath: media[0].path,
      });
    };

    try {
      const lite = nodes.map((n) => ({
        id: n.id,
        type: n.type as FlowNodeType,
      }));
      const order = topologicalOrder(lite, edges);

      for (const id of order) {
        const node = nodes.find((n) => n.id === id)!;
        const data: any = node.data;
        const incoming = edges.filter((e) => e.target === id);

        if (node.type === 'text') {
          outputs[id] = { prompt: data.prompt || '' };
          continue;
        }

        useVideoFlowStore.getState().setStatus(id, 'running');
        try {
          if (node.type === 'image') {
            await runImageNode(id, data, incoming);
          } else {
            await runVideoNode(id, data, incoming);
          }
          useVideoFlowStore.getState().setStatus(id, 'done');
        } catch (err: any) {
          useVideoFlowStore
            .getState()
            .setStatus(id, 'error', err?.message || 'failed');
          throw err;
        }
      }
      toaster.show('Flow completed!', 'success');
    } catch (err: any) {
      toaster.show(err?.message || 'Flow failed', 'warning');
    } finally {
      useVideoFlowStore.getState().setRunning(false);
    }
  }, [fetch, toaster]);
};
