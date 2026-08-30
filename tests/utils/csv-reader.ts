import { readFile } from '@utils/file-utils';
import { buildCsvFilePath } from '@utils/path-utils';


/**
 * Reads CSV data from a file with automatic type conversion.
 * 
 * @param fileName - The CSV file name (e.g., 'products.csv')
 * @param specFilePath - The path of the calling spec file
 * @returns Array of typed objects with automatic type conversion
 * 
 * @example
 * ```ts
 * const categories = getCsvData('categories.csv', __filename);
 * // data[0].category === 'All categories' (string)
 * // data[0].id === 1 (number)
 * // data[0].active === true (boolean)
 * // data[0].tags === ['tag1', 'tag2'] (array)
 * ```
 */
export function getCsvData<T extends Record<string, unknown> = Record<string, unknown>>(
  fileName: string,
  specFilePath: string
): T[] {
  // Build the file path
  const filePath = buildCsvFilePath(fileName, specFilePath);
  // Read and parse the CSV file
  const rawData = readFile(filePath) as Record<string, string>[];
  // Transform each row with automatic type conversion
  const transformedData = rawData.map((row) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key] = parseFieldValue(value);
    }
    return result as T;
  });
  return transformedData;
}

type ParsedValue = string | number | boolean | null | unknown[] | Record<string, unknown>;

/**
 * Parse a field value with automatic type detection
 * Supports: strings, numbers, booleans, arrays, and JSON objects
 */
function parseFieldValue(value: string | null | undefined): ParsedValue {
  if (value === null || value === undefined) {
    return '';
  }
  const trimmed = value.trim();
  // Empty string
  if (!trimmed) return '';
  // Boolean
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  // Number
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }
  // JSON (objects and arrays)
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not valid JSON, continue
    }
  }
  // Array (comma-separated) - only split if it's a clear list pattern
  if (trimmed.includes(',')) {
    // Check if the string looks like a list of simple items
    // Pattern: items are short, contain no spaces, and don't have common sentence words
    const parts = trimmed.split(',').map(item => item.trim());
    // Criteria for splitting:
    // 1. All parts are short (under 15 chars)
    // 2. No part contains multiple spaces (would indicate a sentence)
    // 3. Not a common name pattern (e.g., "John Doe, Jr.")
    const isList = parts.every(part => {
      const hasNoMultipleSpaces = !part.match(/\s{2,}/);
      const isShort = part.length < 15;
      const hasNoCommas = !part.includes(',');
      return isShort && hasNoMultipleSpaces && hasNoCommas;
    });
    // Additional check: if it matches a name pattern, don't split
    const isNamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+, (Jr|Sr|III|IV|V)\.?$/i.test(trimmed);
    const isSentence = /\b(and|or|the|for|with|at|by|from)\b/i.test(trimmed) && parts.length > 2;
    if (isList && !isNamePattern && !isSentence) {
      return parts;
    }
    // Otherwise, treat as a single string
    return trimmed;
  }
  // Default: string
  return trimmed;
}
