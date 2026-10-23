import { readFile } from '@utils/fileUtils';
import { buildCsvFilePath } from '@utils/pathUtils';

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
  const filePath = buildCsvFilePath(fileName, specFilePath);
  const rawData = readFile(filePath) as Record<string, string>[];
  const transformedData = rawData.map(row => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key] = parseFieldValue(value);
    }
    return result as T;
  });
  return transformedData;
}

type ParsedValue = string | number | boolean | null | unknown[] | Record<string, unknown>;

function parseFieldValue(value: string | null | undefined): ParsedValue {
  if (value === null || value === undefined) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (!isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not valid JSON, continue
    }
  }
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(item => item.trim());
    const isList = parts.every(part => {
      const hasNoMultipleSpaces = !part.match(/\s{2,}/);
      const isShort = part.length < 15;
      const hasNoCommas = !part.includes(',');
      return isShort && hasNoMultipleSpaces && hasNoCommas;
    });
    const isNamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+, (Jr|Sr|III|IV|V)\.?$/i.test(trimmed);
    const isSentence = /\b(and|or|the|for|with|at|by|from)\b/i.test(trimmed) && parts.length > 2;
    if (isList && !isNamePattern && !isSentence) {
      return parts;
    }
    return trimmed;
  }
  return trimmed;
}
