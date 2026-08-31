import fs from 'fs';
import path from 'path';


/**
 * Build the file path for a CSV file
 * 
 * @param fileName - The CSV file name (e.g., 'products.csv')
 * @param specFilePath - The path of the calling spec file
 * @returns The resolved file path (environment-specific if available)
 * 
 * @example
 * buildCsvFilePath('products.csv', 'src/tests/ui/home-page/catalog-toolbar.spec.ts')
 * // Returns: 'src/test-data/ui/home-page/catalog-toolbar/products-local.csv'
 * // Or: 'src/test-data/ui/home-page/catalog-toolbar/products.csv' (fallback)
 */
export function buildCsvFilePath(fileName: string, specFilePath: string): string {
  // Determine the data folder from the spec file path
  const dataFolder = extractDataFolder(specFilePath);
  if (!dataFolder) {
    throw new Error(`Could not extract data folder from spec file: ${specFilePath}`);
  }
  // Build the base path
  const baseDir = path.join('tests/test-data/specs', dataFolder);
  // Check for environment-specific file first
  const env = process.env['TEST_ENV'] || 'local';
  const envFileName = fileName.replace('.csv', `-${env}.csv`);
  const envFilePath = path.join(baseDir, envFileName);
  // Try environment-specific file first, fallback to default
  const absoluteEnvPath = path.resolve(process.cwd(), envFilePath);
  if (fs.existsSync(absoluteEnvPath)) {
    return envFilePath;
  }
  // Fallback to default file
  const defaultPath = path.join(baseDir, fileName);
  const absoluteDefaultPath = path.resolve(process.cwd(), defaultPath);
  if (!fs.existsSync(absoluteDefaultPath)) {
    throw new Error(
      `CSV file not found:\n` +
      `  - Tried: ${envFilePath}\n` +
      `  - Tried: ${defaultPath}\n` +
      `Please ensure the CSV file exists in src/test-data/${dataFolder}/`
    );
  }
  return defaultPath;
}

/**
* Extracts the data folder path from a spec file path.
* 
* @param specFilePath - The full path to the spec file
* @returns The folder path relative to 'src/tests/', or undefined if not found
* 
* @example
* extractDataFolder('src/tests/ui/home-page/catalog-toolbar.spec.ts')
* // Returns: 'ui/home-page/catalog-toolbar'
* 
* extractDataFolder('src/tests/api/articles.spec.ts')
* // Returns: 'api'
*/
export function extractDataFolder(specFilePath: string): string | undefined {
  const normalizedPath = specFilePath.replace(/\\/g, '/');
  // Remove the file extension
  const withoutExt = normalizedPath.replace(/\.spec\.ts$/, '').replace(/\.ts$/, '');
  // Find the part after 'src/tests/'
  const match = withoutExt.match(/tests\/specs\/(.+)/);
  if (match) return match[1];
  // Fallback: try to extract from directory structure
  const parts = specFilePath.split('/');
  const testsIndex = parts.indexOf('tests/specs');
  if (testsIndex !== -1 && testsIndex + 1 < parts.length) {
    // Get everything after 'tests/' up to the file name
    const folderPath = parts.slice(testsIndex + 1, parts.length - 1).join('/');
    if (folderPath) return folderPath;
  }
  // Last resort: use the directory name
  return path.basename(path.dirname(specFilePath));
}

/**
 * Get the absolute path for a file
 */
export function getAbsolutePath(filePath: string): string {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return absolutePath;
}
