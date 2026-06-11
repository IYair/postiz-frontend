import type { ImageRef } from './flow-logic';

export function readFileAsBase64(file: File): Promise<ImageRef> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
      resolve({ mimeType: file.type || 'image/png', base64 });
    };
    reader.readAsDataURL(file);
  });
}
