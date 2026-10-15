const KNOWN_PROJECTS = ['ui', 'api', 'review'];

export function deriveProject(specPath: string): string | null {
  const normalized = specPath.replace(/^\.?\//, '');
  const match = normalized.match(/\/specs\/([^/]+)/);
  if (!match) return null;
  const candidate = match[1];
  if (KNOWN_PROJECTS.includes(candidate)) return candidate;
  return null;
}
