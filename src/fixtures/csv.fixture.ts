/* eslint-disable no-empty-pattern */
import { test as base } from '@playwright/test';
import { getCsvData } from "@utils/csv-reader";
import { detectSpecPath } from '@utils/stack-trace';


type CsvFixtures = {
  csvData: <T extends Record<string, string>>(FileName: string) => T[];
}

export const test = base.extend<CsvFixtures>({
  csvData: async ({ }, use) => {
    const useCsv = <T extends Record<string, string>>(fileName: string): T[] => {
      const specPath = detectSpecPath();
      return getCsvData<T>(fileName, specPath);
    };

    await use(useCsv);
  }
});
/* eslint-enable no-empty-pattern */
