import { extractDataFolder } from '@utils/path-utils';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

/**
 * Reads CSV data from a file and returns it as an array of objects.
 * 
 * Usage:
 *   const data = getCsvData<{ id: string; name: string }>('categories.csv');
 * 
 * Convention:
 *   - Files are located in src/test-data/{spec-path}/ (derived from specFilePath)
 *   - Supports environment-specific files: categories-local.csv, categories-ci.csv
 *   - Column headers become object keys
 * 
 * @param fileName - The CSV file name (e.g., 'categories.csv')
 * @param specFilePath -The path of the calling spec file (should be passed in)
 * @returns Array of typed objects with column headers as keys
 * @throws {Error} If the CSV file cannot be found or is empty
 */
export function getCsvData<T extends Record<string, string> = Record<string, string>>(
  fileName: string,
  specFilePath: string
): T[] {
  const dataFolder = extractDataFolder(specFilePath);
  if (!dataFolder) {
    throw new Error(`Could not extract data folder from spec file: ${specFilePath}`);
  }
  const testDataDir = 'src/test-data';
  const baseDir = path.join(testDataDir, dataFolder);
  // Check for environment-specific file first
  const env = process.env['TEST_ENV'] || 'local';
  const envFileName = fileName.replace('.csv', `-${env}.csv`);
  const envFilePath = path.join(baseDir, envFileName);

  try {
    return readCsvFile<T>(envFilePath);
  } catch {
    // Fallback to default file
    const defaultPath = path.join(baseDir, fileName);
    return readCsvFile<T>(defaultPath);
  }
}

/**
 * Reads and parses a CSV file from the given path.
 * 
 * @param filePath - The path to the CSV file
 * @returns Array of objects with column headers as keys
 * @throws {Error} If the file doesn't exist or is empty
 */
function readCsvFile<T extends Record<string, string> = Record<string, string>>(
  filePath: string
): T[] {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  if (!fileContent.trim()) {
    throw new Error(`CSV file is empty: ${absolutePath}`);
  }
  try {
    const result = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return result as T[];
  } catch (error) {
    throw new Error(`Failed to parse CSV file ${absolutePath}: ${error}`);
  }
}
