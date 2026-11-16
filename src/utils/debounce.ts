/**
 * Creates a debounced version of a function that delays invoking `fn`
 * until `wait` milliseconds have elapsed since the last time it was called.
 * 
 * @param fn - The function to debounce
 * @param wait - The delay in milliseconds before executing the function
 * @returns A debounced version of the function preserving its parameter signature
 */
export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, wait);
  });
}