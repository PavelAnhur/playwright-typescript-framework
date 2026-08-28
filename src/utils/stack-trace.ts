/**
 * Detects the spec file path from the call stack.
 * Looks for files matching the pattern: file://.../src/tests/...spec.ts
 * 
 * @returns The detected spec file path
 * @throws {Error} If no spec file path can be detected
 * 
 * @example
 * // In a test file:
 * const specPath = detectSpecPath();
 * // Returns: 'src/tests/ui/home-page/catalog-toolbar.spec.ts'
 */

export function detectSpecPath(): string {
  const stack = new Error().stack || '';
  const lines = stack.split('\n');
  for (const line of lines) {
    const match = line.match(/file:\/\/[^)]+(src\/tests\/[^)]+\.spec\.ts)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  // Fallback: match relative path pattern
  for (const line of lines) {
    const match = line.match(/(src\/tests\/[^\s)]+\.spec\.ts)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  // Fallback: match any spec file
  for (const line of lines) {
    const match = line.match(/([^\s)]+\.spec\.ts)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  throw new Error('Could not detect spec file path from stack trace.');
}
