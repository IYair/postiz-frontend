export default function useCookie(name: string, defaultValue?: string) {
  return [defaultValue || '', () => {}];
}
