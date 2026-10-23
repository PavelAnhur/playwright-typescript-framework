export function detectSpecPath(): string {
  const stack = new Error().stack || '';
  const lines = stack.split('\n');
  for (const line of lines) {
    const match = line.match(/file:\/\/[^)]+(src\/tests\/[^)]+\.spec\.ts)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  for (const line of lines) {
    const match = line.match(/(src\/tests\/[^\s)]+\.spec\.ts)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  for (const line of lines) {
    const match = line.match(/([^\s)]+\.spec\.ts)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  throw new Error('Could not detect spec file path from stack trace.');
}
