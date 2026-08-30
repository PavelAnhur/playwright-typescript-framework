import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { getAbsolutePath } from './path-utils';


/**
 * Unified file reader - automatically detects file type and returns parsed data.
 * 
 * @param filePath - The path to the file (relative to project root)
 * @returns Parsed file content (object for JSON, array for CSV, string for text)
 * 
 * @example
 * // Auto-detects based on file extension
 * const csvData = readFile('data.csv');        // Returns Record<string, string>[]
 * const jsonData = readFile('config.json');    // Returns T
 * const textData = readFile('readme.txt');     // Returns string
 */
export function readFile(filePath: string): unknown {
  const extension = getFileExtension(filePath);
  switch (extension) {
    case 'csv':
      return readCsvFile(filePath);
    case 'json':
      return readJsonFile(filePath);
    case 'txt':
    case 'text':
      return readTextFile(filePath);
    default:
      // Default to text for unknown extensions
      return readTextFile(filePath);
  }
}

function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

/**
 * Read a file with type safety - specify the expected return type.
 * 
 * @param filePath - The path to the file (relative to project root)
 * @param options - Additional options
 * @returns Parsed file content of type T
 * 
 * @example
 * const data = readFileAs<{ id: number; name: string }[]>('data.json');
 */
export function readFileAs<T>(filePath: string): T {
  return readFile(filePath) as T;
}

/**
 * Read and parse a CSV file from the given path
 * 
 * @param filePath - The path to the CSV file (relative to project root)
 * @returns Array of parsed CSV rows as objects
 * @throws {Error} If the file doesn't exist or cannot be parsed
 * 
 * @example
 * const data = readCsvFile('src/test-data/home-page/categories.csv');
 * // Returns: [{ category: 'All categories', product: 'Cloth' }, ...]
 */
export function readCsvFile(filePath: string): Record<string, string>[] {
  const absolutePath = getAbsolutePath(filePath);
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
    return result as Record<string, string>[];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse CSV file ${absolutePath}`, { cause: error });
    }
    throw error;
  }
}

/**
 * Read a JSON file from the given path
 * 
 * @param filePath - The path to the JSON file (relative to project root)
 * @returns Parsed JSON object
 * @throws {Error} If the file doesn't exist or cannot be parsed
 * 
 * @example
 * const data = readJsonFile('src/test-data/config.json');
 */
export function readJsonFile<T = unknown>(filePath: string): T {
  const absolutePath = getAbsolutePath(filePath);
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  if (!fileContent.trim()) {
    throw new Error(`JSON file is empty: ${absolutePath}`);
  }
  try {
    return JSON.parse(fileContent) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse JSON file ${absolutePath}`, { cause: error });
    }
    throw error;
  }
}

/**
 * Read a text file from the given path
 * 
 * @param filePath - The path to the text file (relative to project root)
 * @returns File content as string
 * @throws {Error} If the file doesn't exist
 * 
 * @example
 * const content = readTextFile('src/test-data/readme.txt');
 */
export function readTextFile(filePath: string): string {
  const absolutePath = getAbsolutePath(filePath);
  return fs.readFileSync(absolutePath, 'utf-8');
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return fs.existsSync(absolutePath);
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const stats = fs.statSync(absolutePath);
  return stats.size;
}

/**
 * Get file modification time
 */
export function getFileModifiedTime(filePath: string): Date {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const stats = fs.statSync(absolutePath);
  return stats.mtime;
}
