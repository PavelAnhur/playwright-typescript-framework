/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  fileExists,
  getFileModifiedTime,
  getFileSize,
  readCsvFile,
  readFile,
  readFileAs,
  readJsonFile,
  readTextFile,
} from '@utils/file-utils';
import { getAbsolutePath } from '@utils/path-utils';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('fs');
vi.mock('path');
vi.mock('csv-parse/sync');
vi.mock('@utils/path-utils');

describe('file-utils', () => {
  const mockAbsolutePath = '/absolute/path/to/test/data.csv';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAbsolutePath).mockReturnValue(mockAbsolutePath);
    vi.mocked(path.extname).mockImplementation((filePath: string) => {
      const ext = filePath.split('.').pop();
      return ext ? `.${ext}` : '';
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('readFile', () => {
    it('should read CSV file based on extension', () => {
      const mockCsvData = [{ id: '1', name: 'Test' }];
      vi.mocked(fs.readFileSync).mockReturnValue('id,name\n1,Test');
      vi.mocked(parse).mockReturnValue(mockCsvData as any);
      vi.mocked(path.extname).mockReturnValue('.csv');

      const result = readFile('data.csv');

      expect(getAbsolutePath).toHaveBeenCalledWith('data.csv');
      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(parse).toHaveBeenCalledWith('id,name\n1,Test', {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      expect(result).toEqual(mockCsvData);
    });

    it('should read JSON file based on extension', () => {
      const mockJsonData = { key: 'value' };
      vi.mocked(fs.readFileSync).mockReturnValue('{"key":"value"}');
      vi.mocked(path.extname).mockReturnValue('.json');

      const result = readFile('data.json');

      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(result).toEqual(mockJsonData);
    });

    it('should read text file based on extension', () => {
      const mockText = 'Hello, world!';
      vi.mocked(fs.readFileSync).mockReturnValue(mockText);
      vi.mocked(path.extname).mockReturnValue('.txt');

      const result = readFile('data.txt');

      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(result).toBe(mockText);
    });

    it('should default to text for unknown extensions', () => {
      const mockText = 'Some content';
      vi.mocked(fs.readFileSync).mockReturnValue(mockText);
      vi.mocked(path.extname).mockReturnValue('.unknown');

      const result = readFile('data.unknown');

      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(result).toBe(mockText);
    });

    it('should handle file extensions without dot', () => {
      const mockText = 'Some content';
      vi.mocked(fs.readFileSync).mockReturnValue(mockText);
      vi.mocked(path.extname).mockReturnValue('');

      const result = readFile('data');

      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(result).toBe(mockText);
    });
  });

  describe('readFileAs', () => {
    it('should return typed data', () => {
      interface TestData {
        id: number;
        name: string;
      }

      const mockData = { id: 1, name: 'Test' };
      vi.mocked(fs.readFileSync).mockReturnValue('{"id":1,"name":"Test"}');
      vi.mocked(path.extname).mockReturnValue('.json');

      const result = readFileAs<TestData>('data.json');

      expect(result).toEqual(mockData);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test');
    });
  });

  describe('readCsvFile', () => {
    it('should read and parse CSV file with headers', () => {
      const mockCsvContent = 'id,name,age\n1,John,30\n2,Jane,25';
      const mockParsedData = [
        { id: '1', name: 'John', age: '30' },
        { id: '2', name: 'Jane', age: '25' },
      ];

      vi.mocked(fs.readFileSync).mockReturnValue(mockCsvContent);
      vi.mocked(parse).mockReturnValue(mockParsedData as any);

      const result = readCsvFile('data.csv');

      expect(getAbsolutePath).toHaveBeenCalledWith('data.csv');
      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(parse).toHaveBeenCalledWith(mockCsvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      expect(result).toEqual(mockParsedData);
    });

    it('should throw error for empty CSV file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('   ');

      expect(() => readCsvFile('empty.csv')).toThrow('CSV file is empty');
      expect(getAbsolutePath).toHaveBeenCalledWith('empty.csv');
    });

    it('should throw error for completely empty CSV file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('');

      expect(() => readCsvFile('empty.csv')).toThrow('CSV file is empty');
    });

    it('should handle CSV parsing errors', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('id,name\n1,John\ninvalid,csv,data');
      vi.mocked(parse).mockImplementation(() => {
        throw new Error('CSV parsing error');
      });

      expect(() => readCsvFile('invalid.csv')).toThrow('Failed to parse CSV file');
      expect(getAbsolutePath).toHaveBeenCalledWith('invalid.csv');
    });

    it('should handle non-Error exceptions', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('id,name\n1,John');
      vi.mocked(parse).mockImplementation(() => {
        throw 'String error';
      });

      expect(() => readCsvFile('invalid.csv')).toThrow();
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file', () => {
      const mockData = { id: 1, name: 'Test', nested: { value: true } };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockData));

      const result = readJsonFile('data.json');

      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(result).toEqual(mockData);
    });

    it('should handle JSON array', () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockData));

      const result = readJsonFile('data.json');

      expect(result).toEqual(mockData);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for empty JSON file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('   ');

      expect(() => readJsonFile('empty.json')).toThrow('JSON file is empty');
    });

    it('should throw error for invalid JSON', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{invalid json}');

      expect(() => readJsonFile('invalid.json')).toThrow('Failed to parse JSON file');
    });

    it('should handle non-Error exceptions', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{invalid json}');
      vi.spyOn(JSON, 'parse').mockImplementation(() => {
        throw 'String error';
      });

      expect(() => readJsonFile('invalid.json')).toThrow();
    });
  });

  describe('readTextFile', () => {
    it('should read text file', () => {
      const mockText = 'Hello, world!\nThis is a test.';
      vi.mocked(fs.readFileSync).mockReturnValue(mockText);

      const result = readTextFile('data.txt');

      expect(getAbsolutePath).toHaveBeenCalledWith('data.txt');
      expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf-8');
      expect(result).toBe(mockText);
    });

    it('should handle empty text file', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('');

      const result = readTextFile('empty.txt');

      expect(result).toBe('');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(path.resolve).mockReturnValue('/absolute/path');

      const result = fileExists('data.csv');

      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), 'data.csv');
      expect(fs.existsSync).toHaveBeenCalledWith('/absolute/path');
      expect(result).toBe(true);
    });

    it('should return false when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(path.resolve).mockReturnValue('/absolute/path');

      const result = fileExists('missing.csv');

      expect(result).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('should return file size in bytes', () => {
      const mockStats = { size: 1024 } as fs.Stats;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue(mockStats);
      vi.mocked(path.resolve).mockReturnValue('/absolute/path');

      const result = getFileSize('data.csv');

      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), 'data.csv');
      expect(fs.existsSync).toHaveBeenCalledWith('/absolute/path');
      expect(fs.statSync).toHaveBeenCalledWith('/absolute/path');
      expect(result).toBe(1024);
    });

    it('should throw error when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(path.resolve).mockReturnValue('/absolute/path');

      expect(() => getFileSize('missing.csv')).toThrow('File not found');
    });
  });

  describe('getFileModifiedTime', () => {
    it('should return file modification time', () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      const mockStats = { mtime: mockDate } as fs.Stats;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue(mockStats);
      vi.mocked(path.resolve).mockReturnValue('/absolute/path');

      const result = getFileModifiedTime('data.csv');

      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), 'data.csv');
      expect(fs.existsSync).toHaveBeenCalledWith('/absolute/path');
      expect(fs.statSync).toHaveBeenCalledWith('/absolute/path');
      expect(result).toBe(mockDate);
    });

    it('should throw error when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(path.resolve).mockReturnValue('/absolute/path');

      expect(() => getFileModifiedTime('missing.csv')).toThrow('File not found');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle real-world CSV with special characters', () => {
      const mockCsvContent = 'id,name,description\n1,"John Doe, Jr.","Test, with comma"';
      vi.mocked(fs.readFileSync).mockReturnValue(mockCsvContent);
      vi.mocked(parse).mockReturnValue([
        { id: '1', name: 'John Doe, Jr.', description: 'Test, with comma' },
      ] as any);

      const result = readCsvFile('data.csv');

      expect(result).toEqual([
        { id: '1', name: 'John Doe, Jr.', description: 'Test, with comma' },
      ]);
    });

    it('should handle CSV with empty values', () => {
      const mockCsvContent = 'id,name,age\n1,John,\n2,,25\n3,,';
      vi.mocked(fs.readFileSync).mockReturnValue(mockCsvContent);
      vi.mocked(parse).mockReturnValue([
        { id: '1', name: 'John', age: '' },
        { id: '2', name: '', age: '25' },
        { id: '3', name: '', age: '' },
      ] as any);

      const result = readCsvFile('data.csv');

      expect(result).toEqual([
        { id: '1', name: 'John', age: '' },
        { id: '2', name: '', age: '25' },
        { id: '3', name: '', age: '' },
      ]);
    });

    it('should handle CSV with different line endings', () => {
      const mockCsvContent = 'id,name\n1,John\r\n2,Jane';
      vi.mocked(fs.readFileSync).mockReturnValue(mockCsvContent);
      vi.mocked(parse).mockReturnValue([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ] as any);

      const result = readCsvFile('data.csv');

      expect(result).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ]);
    });

    it('should handle nested JSON objects', () => {
      const mockData = {
        user: { id: 1, name: 'John' },
        settings: { theme: 'dark', language: 'en' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockData));

      const result = readJsonFile('config.json');

      expect(result).toEqual(mockData);
      expect((result as any).user.name).toBe('John');
    });
  });
});
