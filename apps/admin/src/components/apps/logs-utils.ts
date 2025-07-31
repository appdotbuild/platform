import { MessageKind } from '@appdotbuild/core/agent-message';
import type { SingleIterationJsonData } from './logs-types';

/**
 * Checks if JSON content contains runtime errors
 * Looks for MessageKind.RUNTIME_ERROR or "RuntimeError" strings
 */
export function hasRuntimeError(jsonContent: any): boolean {
  if (!jsonContent) return false;

  const jsonString = JSON.stringify(jsonContent);
  return jsonString.includes(MessageKind.RUNTIME_ERROR);
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
