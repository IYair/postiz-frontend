export type ToolKey =
  | 'hashtags'
  | 'captions'
  | 'titles'
  | 'rewrite'
  | 'bios'
  | 'usernames'
  | 'emoji-translate';

export async function generateTool(
  fetch: (url: string, init?: RequestInit) => Promise<Response>,
  toolKey: ToolKey,
  body: { input: string; network?: string; toneOverride?: string }
): Promise<{ results: string[] }> {
  const res = await fetch(`/tools/generate/${toolKey}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (res.status === 412) {
    throw new Error('no-provider');
  }
  if (!res.ok) {
    throw new Error('generation-failed');
  }
  return res.json();
}
