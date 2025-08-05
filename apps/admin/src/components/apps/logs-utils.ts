import { MessageKind } from '@appdotbuild/core/agent-message';
import type { AgentSnapshotIterationJsonData } from '@appdotbuild/core';

/**
 * Checks if JSON content contains runtime errors
 * Looks for MessageKind.RUNTIME_ERROR or "RuntimeError" strings
 */
function hasRuntimeError(jsonContent: any): boolean {
  if (!jsonContent) return false;

  const jsonString = JSON.stringify(jsonContent);
  return jsonString.includes(MessageKind.RUNTIME_ERROR);
}

/**
 * Checks if snapshot data contains runtime errors
 */
export function iterationHasErrors(
  snapshotData: AgentSnapshotIterationJsonData | undefined,
): boolean {
  if (!snapshotData || !snapshotData.jsonFiles) return false;

  return Object.values(snapshotData.jsonFiles).some(hasRuntimeError);
}

/**
 * Counts runtime errors in snapshot data
 */
export function countRuntimeErrors(
  snapshotData: AgentSnapshotIterationJsonData | undefined,
): number {
  if (!snapshotData || !snapshotData.jsonFiles) return 0;

  return Object.values(snapshotData.jsonFiles).filter(hasRuntimeError).length;
}
