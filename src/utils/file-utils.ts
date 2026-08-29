import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';


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
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`JSON file not found: ${absolutePath}`);
  }
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
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
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
