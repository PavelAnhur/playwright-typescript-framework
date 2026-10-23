import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { getAbsolutePath } from './pathUtils';

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
      return readTextFile(filePath);
  }
}

function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

export function readFileAs<T>(filePath: string): T {
  return readFile(filePath) as T;
}

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

export function readTextFile(filePath: string): string {
  const absolutePath = getAbsolutePath(filePath);
  return fs.readFileSync(absolutePath, 'utf-8');
}

export function fileExists(filePath: string): boolean {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return fs.existsSync(absolutePath);
}

export function getFileSize(filePath: string): number {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const stats = fs.statSync(absolutePath);
  return stats.size;
}

export function getFileModifiedTime(filePath: string): Date {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  const stats = fs.statSync(absolutePath);
  return stats.mtime;
}
