import { toBlob } from 'html-to-image';

export async function renderNodeToFile(
  node: HTMLElement,
  fileName: string
): Promise<File> {
  const blob = await toBlob(node, { pixelRatio: 2 });
  if (!blob) throw new Error('render-failed');
  return new File([blob], fileName, { type: 'image/png' });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
