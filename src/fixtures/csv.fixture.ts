/* eslint-disable no-empty-pattern */
import { test as base } from '@playwright/test';
import { getCsvData } from "@utils/csv-reader";
import { detectSpecPath } from '@utils/stack-trace';
import { type CsvRow } from '../types/csv';


type CsvFixtures = {
  /**
   * Load CSV data with type safety.
   * 
   * @example
   * // With explicit type (recommended)
   * type Product = { id: number; name: string; tags: string[] };
   * const products = csvData<Product>('products.csv');
   * 
   * // Without explicit type (infers from CSV)
   * const categories = csvData('categories.csv');
   */
  csvData: <T extends CsvRow = CsvRow>(
    fileName: string
  ) => T[];
}

export const test = base.extend<CsvFixtures>({
  csvData: async ({ }, use) => {
    const useCsv = <T extends CsvRow = CsvRow>(
      fileName: string
    ): T[] => {
      const specPath = detectSpecPath();
      return getCsvData<T>(fileName, specPath);
    };

    await use(useCsv);
  },
});
/* eslint-enable no-empty-pattern */
