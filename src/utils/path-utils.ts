import path from 'path';

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
 // Remove the file extension
 const withoutExt = specFilePath.replace(/\.spec\.ts$/, '');
 // Find the part after 'src/tests/'
 const match = withoutExt.match(/src\/tests\/(.+)/);
 if (match) return match[1];
 // Fallback: try to extract from directory structure
 const parts = specFilePath.split('/');
 const testsIndex = parts.indexOf('tests');
 if (testsIndex !== -1 && testsIndex + 1 < parts.length) {
   // Get everything after 'tests/' up to the file name
   const folderPath = parts.slice(testsIndex + 1, parts.length - 1).join('/');
   if (folderPath) return folderPath;
 }
 // Last resort: use the directory name
 return path.basename(path.dirname(specFilePath));
}
