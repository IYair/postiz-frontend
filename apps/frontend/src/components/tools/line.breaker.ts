export const INVISIBLE_CHAR = '⠀';

export function addInstagramLineBreaks(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? INVISIBLE_CHAR : line))
    .join('\n');
}
