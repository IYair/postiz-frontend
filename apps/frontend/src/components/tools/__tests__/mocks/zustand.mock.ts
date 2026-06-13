export function create(fn: any) {
  return () => fn(() => {}, () => ({}));
}
