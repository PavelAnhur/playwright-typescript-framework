import { basename } from 'node:path';

/**
 * Normalizes a model-supplied fileName to its bare name by stripping any
 * directory component. This prevents path-shaped or traversal names from
 * escaping the target directory while preserving containment — the resolved
 * write path always stays inside the intended output directory.
 */
export function normalizeFileName(fileName: string): string {
  return basename(fileName);
}
