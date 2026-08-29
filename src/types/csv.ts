/**
 * Represents any valid CSV value after type conversion.
 * Supports:
 * - Primitives: string, number, boolean, null
 * - Arrays: [value, value, ...]
 * - Objects: { key: value, nested: { ... } }
 */
export type CsvValue =
  | string
  | number
  | boolean
  | null
  | CsvValue[]
  | { [key: string]: CsvValue };

/**
 * Represents a single row in a CSV file
 * @example
 * const row: CsvRow = {
 *   id: 1,
 *   name: 'Product',
 *   tags: ['tag1', 'tag2'],
 *   metadata: { color: 'red', size: 'M' }
 * };
 */
export type CsvRow = Record<string, CsvValue>;

/**
 * Represents a CSV file as an array of rows
 * @example
 * const data: CsvData = [
 *   { id: 1, name: 'Product A' },
 *   { id: 2, name: 'Product B' }
 * ];
 */
export type CsvData<T extends CsvRow = CsvRow> = T[];

/**
 * Helper type for CSV data with a specific row type
 * @example
 * type ProductRow = { id: number; name: string; price: number };
 * const products: CsvData<ProductRow> = getCsvData('products.csv');
 */
export type TypedCsvData<T> = T[];

/**
 * Utility type to infer CSV row type from data
 */
export type InferCsvRow<T extends CsvData> = T extends CsvData<infer R> ? R : never;
