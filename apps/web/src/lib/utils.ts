import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function throttle(
  fn: (...args: any[]) => any,
  interval: number,
  { callFirst = false } = {},
) {
  let throttling: boolean;

  return function (this: any) {
    if (!throttling) {
      throttling = true;
      callFirst &&
        fn.apply(this as any, arguments as unknown as Parameters<typeof fn>);
      setTimeout(() => {
        !callFirst &&
          fn.apply(this as any, arguments as unknown as Parameters<typeof fn>);
        throttling = false;
      }, interval);
    }
  };
}
