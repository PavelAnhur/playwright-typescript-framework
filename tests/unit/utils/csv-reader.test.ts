import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCsvData } from '@utils/csv-reader';
import { readFile } from '@utils/file-utils';
import { buildCsvFilePath } from '@utils/path-utils';

vi.mock('@utils/file-utils');
vi.mock('@utils/path-utils');

describe('getCsvData', () => {
  const mockSpecFilePath = '/path/to/spec/file.spec.ts';
  const mockFileName = 'test-data.csv';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic CSV Parsing', () => {
    it('should parse CSV with string values', () => {
      const mockCsvData = [
        { name: 'John', city: 'New York', country: 'USA' },
        { name: 'Jane', city: 'London', country: 'UK' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(buildCsvFilePath).toHaveBeenCalledWith(mockFileName, mockSpecFilePath);
      expect(readFile).toHaveBeenCalledWith('/path/to/test-data.csv');
      expect(result).toEqual([
        { name: 'John', city: 'New York', country: 'USA' },
        { name: 'Jane', city: 'London', country: 'UK' },
      ]);
    });

    it('should handle empty CSV data', () => {
      vi.mocked(readFile).mockReturnValue([]);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Type Conversion', () => {
    it('should convert numeric strings to numbers', () => {
      const mockCsvData = [
        { id: '1', price: '99.99', quantity: '10' },
        { id: '2', price: '149.50', quantity: '5' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { id: 1, price: 99.99, quantity: 10 },
        { id: 2, price: 149.5, quantity: 5 },
      ]);
    });

    it('should convert boolean strings to booleans', () => {
      const mockCsvData = [
        { active: 'true', published: 'false', inStock: 'true' },
        { active: 'false', published: 'true', inStock: 'false' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { active: true, published: false, inStock: true },
        { active: false, published: true, inStock: false },
      ]);
    });

    it('should parse JSON objects', () => {
      const mockCsvData = [
        {
          id: '1',
          metadata: '{"key":"value","nested":{"prop":true}}',
          tags: '["tag1","tag2"]'
        },
        {
          id: '2',
          metadata: '{"another":"object"}',
          tags: '["tag3"]'
        },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        {
          id: 1,
          metadata: { key: 'value', nested: { prop: true } },
          tags: ['tag1', 'tag2']
        },
        {
          id: 2,
          metadata: { another: 'object' },
          tags: ['tag3']
        },
      ]);
    });

    it('should parse comma-separated values as arrays', () => {
      const mockCsvData = [
        { id: '1', categories: 'electronics,books,toys' },
        { id: '2', categories: 'clothing,accessories' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { id: 1, categories: ['electronics', 'books', 'toys'] },
        { id: 2, categories: ['clothing', 'accessories'] },
      ]);
    });

    it('should preserve empty strings', () => {
      const mockCsvData = [
        { id: '1', name: '', description: 'some text' },
        { id: '2', name: '', description: '' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { id: 1, name: '', description: 'some text' },
        { id: 2, name: '', description: '' },
      ]);
    });

    it('should handle whitespace trimming', () => {
      const mockCsvData = [
        { id: ' 1 ', name: '  John  ', active: '  true  ' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { id: 1, name: 'John', active: true },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle numbers with leading zeros', () => {
      const mockCsvData = [
        { id: '001', code: '010', version: '1.0' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { id: 1, code: 10, version: 1.0 },
      ]);
    });

    it('should handle special characters in strings', () => {
      const mockCsvData = [
        { name: 'John Doe, Jr.', description: 'This is a "quoted" string' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { name: 'John Doe, Jr.', description: 'This is a "quoted" string' },
      ]);
    });

    it('should handle null and undefined values', () => {
      const mockCsvData = [
        { id: '1', name: 'null', description: 'undefined' },
        { id: '2', name: '', description: null as any },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { id: 1, name: 'null', description: 'undefined' },
        { id: 2, name: '', description: '' },
      ]);
    });

    it('should handle mixed data types in a single row', () => {
      const mockCsvData = [
        {
          id: '1',
          name: 'Product A',
          price: '99.99',
          inStock: 'true',
          tags: '["electronics","sale"]',
          metadata: '{"createdAt":"2024-01-01"}',
          categories: 'tech,gadgets'
        },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        {
          id: 1,
          name: 'Product A',
          price: 99.99,
          inStock: true,
          tags: ['electronics', 'sale'],
          metadata: { createdAt: '2024-01-01' },
          categories: ['tech', 'gadgets']
        },
      ]);
    });
  });

  describe('Type Safety', () => {
    it('should work with typed interfaces', () => {
      interface ProductData extends Record<string, unknown> {
        id: number;
        name: string;
        price: number;
        inStock: boolean;
        tags?: string[];
      }

      const mockCsvData = [
        { id: '1', name: 'Product 1', price: '99.99', inStock: 'true', tags: '["electronics"]' },
        { id: '2', name: 'Product 2', price: '149.99', inStock: 'false' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData<ProductData>(mockFileName, mockSpecFilePath);

      expect(result[0]).toEqual(expect.objectContaining({
        id: 1,
        name: 'Product 1',
        price: 99.99,
        inStock: true,
        tags: ['electronics'],
      }));

      expect(result[1]).toEqual(expect.objectContaining({
        id: 2,
        name: 'Product 2',
        price: 149.99,
        inStock: false,
      }));
      expect(result[1]?.tags).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON gracefully', () => {
      const mockCsvData = [
        { id: '1', metadata: '{invalid json}' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/test-data.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      // Should treat invalid JSON as a string
      expect(result).toEqual([
        { id: 1, metadata: '{invalid json}' },
      ]);
    });

    it('should handle missing readFile data', () => {
      vi.mocked(readFile).mockImplementation(() => {
        throw new Error('File not found');
      });
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/missing.csv');

      expect(() => getCsvData('missing.csv', mockSpecFilePath)).toThrow('File not found');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should parse categories CSV for catalog toolbar', () => {
      const mockCsvData = [
        { id: '1', category: 'All categories', active: 'true' },
        { id: '2', category: 'Bags', active: 'true' },
        { id: '3', category: 'Footwear', active: 'false' },
        { id: '4', category: 'Accessories', active: 'true' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/categories.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ id: 1, category: 'All categories', active: true });
      expect(result[1]).toEqual({ id: 2, category: 'Bags', active: true });
      expect(result[2]).toEqual({ id: 3, category: 'Footwear', active: false });
      expect(result[3]).toEqual({ id: 4, category: 'Accessories', active: true });
    });

    it('should parse sort options CSV with multiple fields', () => {
      const mockCsvData = [
        { id: '1', label: 'Price: Low to High', value: 'price', sortOrder: 'asc' },
        { id: '2', label: 'Price: High to Low', value: 'price', sortOrder: 'desc' },
        { id: '3', label: 'Newest', value: 'createdAt', sortOrder: 'desc' },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/sort-options.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result).toEqual([
        { id: 1, label: 'Price: Low to High', value: 'price', sortOrder: 'asc' },
        { id: 2, label: 'Price: High to Low', value: 'price', sortOrder: 'desc' },
        { id: 3, label: 'Newest', value: 'createdAt', sortOrder: 'desc' },
      ]);
    });

    it('should parse product data with nested properties', () => {
      const mockCsvData = [
        {
          id: '101',
          name: 'Leather Wallet',
          price: '89.99',
          attributes: '{"color":"brown","material":"leather"}',
          inStock: 'true',
          tags: 'accessories,wallets,gifts'
        },
        {
          id: '102',
          name: 'Silk Scarf',
          price: '45.00',
          attributes: '{"color":"red","pattern":"floral"}',
          inStock: 'false',
          tags: 'accessories,scarves'
        },
      ];

      vi.mocked(readFile).mockReturnValue(mockCsvData);
      vi.mocked(buildCsvFilePath).mockReturnValue('/path/to/products.csv');

      const result = getCsvData(mockFileName, mockSpecFilePath);

      expect(result[0]).toMatchObject({
        id: 101,
        name: 'Leather Wallet',
        price: 89.99,
        attributes: { color: 'brown', material: 'leather' },
        inStock: true,
        tags: ['accessories', 'wallets', 'gifts'],
      });

      expect(result[1]).toMatchObject({
        id: 102,
        name: 'Silk Scarf',
        price: 45.00,
        attributes: { color: 'red', pattern: 'floral' },
        inStock: false,
        tags: ['accessories', 'scarves'],
      });
    });
  });
});
