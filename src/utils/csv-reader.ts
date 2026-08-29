import { readCsvFile } from '@utils/file-utils';
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
  const rawData = readCsvFile(filePath);
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
function parseFieldValue(value: string): ParsedValue {
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
  // Array (comma-separated)
  if (trimmed.includes(',')) {
    return trimmed.split(',').map(item => item.trim());
  }
  // Default: string
  return trimmed;
}
