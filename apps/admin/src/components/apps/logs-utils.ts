import type { SingleIterationJsonData } from './logs-types';

/**
 * Checks if JSON content contains runtime errors
 * Looks for MessageKind.RUNTIME_ERROR or "RuntimeError" strings
 */
export function hasRuntimeError(jsonContent: any): boolean {
  if (!jsonContent) return false;

  const jsonString = JSON.stringify(jsonContent);
  return (
    jsonString.includes('MessageKind.RUNTIME_ERROR') ||
    jsonString.includes('"RuntimeError"') ||
    jsonString.includes('"kind":"RuntimeError"')
  );
}

/**
 * Checks if iteration data contains runtime errors
 */
export function iterationHasErrors(
  iterationData: SingleIterationJsonData | null,
): boolean {
  if (!iterationData || !iterationData.jsonFiles) return false;

  return Object.values(iterationData.jsonFiles).some(hasRuntimeError);
}

/**
 * Counts runtime errors in iteration data
 */
export function countRuntimeErrors(
  iterationData: SingleIterationJsonData | null,
): number {
  if (!iterationData || !iterationData.jsonFiles) return 0;

  return Object.values(iterationData.jsonFiles).filter(hasRuntimeError).length;
}

/**
 * Checks if a JSON object contains runtime errors and highlights error keys
 */
export function getErrorHighlights(jsonContent: any): string[] {
  if (!jsonContent) return [];

  const errorKeys: string[] = [];

  function scanObject(obj: any, path: string = ''): void {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          scanObject(item, `${path}[${index}]`);
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;

          // Check if this key/value contains error indicators
          if (
            key === 'kind' &&
            (value === 'RuntimeError' || value === 'MessageKind.RUNTIME_ERROR')
          ) {
            errorKeys.push(currentPath);
          } else if (
            typeof value === 'string' &&
            (value.includes('MessageKind.RUNTIME_ERROR') ||
              value.includes('RuntimeError'))
          ) {
            errorKeys.push(currentPath);
          }

          scanObject(value, currentPath);
        });
      }
    }
  }

  scanObject(jsonContent);
  return errorKeys;
}
