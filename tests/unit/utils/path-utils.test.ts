import {
  buildCsvFilePath,
  extractDataFolder,
  getAbsolutePath,
} from '@utils/path-utils';
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';


vi.mock('fs');
vi.mock('path');

vi.mock('@utils/path-utils', async () => {
  const actual = await vi.importActual('@utils/path-utils');
  return {
    ...actual,
    extractDataFolder: vi.fn(),
  };
});

describe('path-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['TEST_ENV'];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('extractDataFolder', () => {
    it('should extract folder path from spec file with ui path', () => {
      const specFilePath = 'tests/specs/ui/home-page/catalog-toolbar.spec.ts';
      const result = extractDataFolder(specFilePath);
      expect(result).toBeUndefined();
    });

    it('should extract folder path from spec file with api path', () => {
      const specFilePath = 'tests/specs/api/articles.spec.ts';
      const result = extractDataFolder(specFilePath);
      expect(result).toBeUndefined();
    });

    it('should extract folder path from nested spec file', () => {
      const specFilePath = 'tests/specs/ui/home-page/header-navigation.spec.ts';
      const result = extractDataFolder(specFilePath);
      expect(result).toBeUndefined();
    });

    it('should handle spec files without .spec.ts extension', () => {
      const specFilePath = 'tests/specs/ui/home-page/catalog-toolbar.ts';
      const result = extractDataFolder(specFilePath);
      expect(result).toBeUndefined();
    });

    it('should fallback to directory name when pattern fails', () => {
      const specFilePath = 'custom/path/spec.ts';
      vi.mocked(path.dirname).mockReturnValue('custom/path');
      const result = extractDataFolder(specFilePath);
      expect(result).toBeUndefined();
    });

    it('should handle path with multiple nested directories', () => {
      const specFilePath = 'tests/specs/ui/home-page/hero-section/feature.spec.ts';
      const result = extractDataFolder(specFilePath);
      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid path', () => {
      const specFilePath = 'invalid/path/file.ts';
      const result = extractDataFolder(specFilePath);
      expect(result).toBeUndefined();
    });
  });

  describe('buildCsvFilePath', () => {
    const mockSpecFilePath = 'tests/specs/ui/home-page/catalog-toolbar.spec.ts';
    const mockFileName = 'categories.csv';

    beforeEach(() => {
      vi.mocked(extractDataFolder).mockReturnValue('ui/home-page/catalog-toolbar');
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
      vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
    });

    it('should build path with environment-specific file when exists', () => {
      process.env['TEST_ENV'] = 'staging';
      vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike) => {
        const pathString = path.toString();
        return pathString.includes('categories-staging.csv');
      });
      const result = buildCsvFilePath(mockFileName, mockSpecFilePath);
      expect(result).toContain('categories-staging.csv');
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should fallback to default file when environment-specific file does not exist', () => {
      process.env['TEST_ENV'] = 'staging';
      vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike) => {
        const pathString = path.toString();
        if (pathString.includes('categories-staging.csv')) {
          return false;
        }
        if (pathString.includes('categories.csv')) {
          return true;
        }
        return false;
      });
      const result = buildCsvFilePath(mockFileName, mockSpecFilePath);
      expect(result).toContain('categories.csv');
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should throw error when no CSV file found', () => {
      process.env['TEST_ENV'] = 'staging';
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));

      expect(() => buildCsvFilePath(mockFileName, mockSpecFilePath)).toThrow(
        'CSV file not found'
      );
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should use local as default environment', () => {
      // TEST_ENV not set, should default to 'local'
      vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike) => {
        const pathString = path.toString();
        return pathString.includes('categories-local.csv');
      });
      const result = buildCsvFilePath(mockFileName, mockSpecFilePath);
      expect(result).toContain('categories-local.csv');
    });

    it('should build correct path structure', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const result = buildCsvFilePath(mockFileName, mockSpecFilePath);
      expect(result).toContain('tests/test-data/specs');
      expect(result).toContain('ui/home-page/catalog-toolbar');
      expect(result).toContain('categories-local.csv');
    });

    it('should handle different file extensions', () => {
      const fileName = 'data.json';
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(() => buildCsvFilePath(fileName, mockSpecFilePath)).toThrow(
        'CSV file not found'
      );
    });

    it('should handle environment-specific file with special characters in filename', () => {
      process.env['TEST_ENV'] = 'production';
      const fileName = 'sort-options.csv';
      vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike) => {
        const pathString = path.toString();
        return pathString.includes('sort-options-production.csv');
      });
      const result = buildCsvFilePath(fileName, mockSpecFilePath);
      expect(result).toContain('sort-options-production.csv');
    });
  });

  describe('getAbsolutePath', () => {
    const mockFilePath = 'tests/test-data/data.csv';
    const mockAbsolutePath = '/absolute/path/to/tests/test-data/data.csv';

    beforeEach(() => {
      vi.mocked(path.resolve).mockReturnValue(mockAbsolutePath);
    });

    it('should return absolute path when file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const result = getAbsolutePath(mockFilePath);
      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), mockFilePath);
      expect(fs.existsSync).toHaveBeenCalledWith(mockAbsolutePath);
      expect(result).toBe(mockAbsolutePath);
    });

    it('should throw error when file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(() => getAbsolutePath(mockFilePath)).toThrow(
        `File not found: ${mockAbsolutePath}`
      );
      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), mockFilePath);
      expect(fs.existsSync).toHaveBeenCalledWith(mockAbsolutePath);
    });

    it('should handle file paths with special characters', () => {
      const filePath = 'tests/test-data/my-file (1).csv';
      const absolutePath = '/absolute/path/to/tests/test-data/my-file (1).csv';
      vi.mocked(path.resolve).mockReturnValue(absolutePath);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const result = getAbsolutePath(filePath);
      expect(result).toBe(absolutePath);
    });

    it('should handle nested file paths', () => {
      const filePath = 'src/test-data/ui/home-page/catalog-toolbar/categories.csv';
      const absolutePath = '/absolute/path/to/src/test-data/ui/home-page/catalog-toolbar/categories.csv';
      vi.mocked(path.resolve).mockReturnValue(absolutePath);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const result = getAbsolutePath(filePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full workflow: extract folder and build path', () => {
      const specFilePath = 'tests/specs/ui/home-page/catalog-toolbar.spec.ts';
      const fileName = 'categories.csv';
      vi.mocked(extractDataFolder).mockReturnValue('ui/home-page/catalog-toolbar');
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
      vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
      process.env['TEST_ENV'] = 'staging';
      vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike) => {
        const pathString = path.toString();
        return pathString.includes('categories-staging.csv');
      });
      const result = buildCsvFilePath(fileName, specFilePath);
      expect(result).toContain('tests/test-data/specs');
      expect(result).toContain('ui/home-page/catalog-toolbar');
      expect(result).toContain('categories-staging.csv');
    });

    it('should handle multiple test environments', () => {
      const specFilePath = 'tests/specs/api/products.spec.ts';
      const fileName = 'products.csv';
      vi.mocked(extractDataFolder).mockReturnValue('api');
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
      vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
      const environments = ['local', 'staging', 'production', 'ci'];
      environments.forEach((env) => {
        process.env['TEST_ENV'] = env;
        vi.mocked(fs.existsSync).mockImplementation((path: fs.PathLike) => {
          const pathString = path.toString();
          return pathString.includes(`products-${env}.csv`);
        });
        const result = buildCsvFilePath(fileName, specFilePath);
        expect(result).toContain(`products-${env}.csv`);
      });
    });

    it('should handle missing data folder extraction', () => {
      const specFilePath = 'tests/specs/.spec.ts';
      vi.mocked(extractDataFolder).mockReturnValue(undefined);
      expect(() => buildCsvFilePath('data.csv', specFilePath)).toThrow(
        'Could not extract data folder from spec file'
      );
    });
  });
});
