import { mkdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { aiConfig } from '../config';
import { detectFlake, type FlakeDetectionResult } from '../tools/detectFlake';

function toSlug(specPath: string): string {
  return basename(specPath).replace(/\.spec\.ts$/, '.json');
}

function formatPhaseLine(phase: FlakeDetectionResult['phases'][number]): string {
  const status = phase.passed ? 'PASSED' : 'FAILED';
  const label = phase.label.padEnd(40);
  const duration = `${phase.durationMs}ms`.padStart(8);
  return `   ${label} ${status.padEnd(8)} ${duration}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const failOnFlake = args.includes('--fail-on-flake');
  const positional = args.filter(a => !a.startsWith('--'));
  const specPath = positional[0];
  const suitePath = positional[1];

  if (!specPath) {
    console.error('usage: flakeDetectorCli.ts <spec-path> [<suite-path>] [--fail-on-flake]');
    process.exit(2);
  }

  console.log(`🔍 flake detection: ${specPath}`);
  if (suitePath) console.log(`   suite: ${suitePath}`);
  console.log('');

  const result = await detectFlake(specPath, 'api', suitePath);

  for (const phase of result.phases) {
    console.log(formatPhaseLine(phase));
  }

  console.log('');
  console.log(`   classification: ${result.classification}`);
  console.log(`   duration:       ${result.totalDurationMs}ms`);

  const outDir = join(aiConfig.generatedCasesDir, 'flake-detection');
  await mkdir(outDir, { recursive: true });
  const outputPath = join(outDir, toSlug(specPath));
  await writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`   output:         ${outputPath}`);
  console.log('');
  console.log('   recommendation:');
  console.log(`   ${result.recommendation}`);

  if (failOnFlake && result.classification !== 'not_reproduced') {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌', error instanceof Error ? error.message : error);
  process.exit(2);
});
