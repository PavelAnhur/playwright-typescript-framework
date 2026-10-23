import fs from 'fs';
import path from 'path';

export function buildCsvFilePath(fileName: string, specFilePath: string): string {
  const dataFolder = extractDataFolder(specFilePath);
  if (!dataFolder) {
    throw new Error(`Could not extract data folder from spec file: ${specFilePath}`);
  }
  const baseDir = path.join('test-data/specs', dataFolder);
  const env = process.env['TEST_ENV'] || 'local';
  const envFileName = fileName.replace('.csv', `-${env}.csv`);
  const envFilePath = path.join(baseDir, envFileName);
  const absoluteEnvPath = path.resolve(process.cwd(), envFilePath);
  if (fs.existsSync(absoluteEnvPath)) {
    return envFilePath;
  }
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

export function extractDataFolder(specFilePath: string): string | undefined {
  const normalizedPath = specFilePath.replace(/\\/g, '/');
  const withoutExt = normalizedPath.replace(/\.spec\.ts$/, '').replace(/\.ts$/, '');
  const match = withoutExt.match(/tests\/specs\/(.+)/);
  if (match) return match[1];
  const parts = specFilePath.split('/');
  const testsIndex = parts.indexOf('tests/specs');
  if (testsIndex !== -1 && testsIndex + 1 < parts.length) {
    const folderPath = parts.slice(testsIndex + 1, parts.length - 1).join('/');
    if (folderPath) return folderPath;
  }
  return path.basename(path.dirname(specFilePath));
}

export function getAbsolutePath(filePath: string): string {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return absolutePath;
}
