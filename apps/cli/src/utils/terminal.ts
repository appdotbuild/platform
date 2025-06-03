import type { Instance } from 'ink';

let inkRenderer: Instance | null = null;

export function setInkRenderer(renderer: Instance): void {
  inkRenderer = renderer;
}

export function clearTerminal(): void {
  if (inkRenderer) {
    inkRenderer.clear();
  }
  // clear scrollback and primary buffer to ensure a truly blank slate
  process.stdout.write('\x1b[3J\x1b[H\x1b[2J');
}
