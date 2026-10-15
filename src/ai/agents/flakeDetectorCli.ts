import { mkdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { aiConfig } from '../config';
import { detectFlake, type FlakeDetectionResult } from '../tools/detectFlake';
import { deriveProject } from '../tools/projectResolver';

function resolveProject(specPath: string, explicitOverride: string | null): string {
  if (explicitOverride) return explicitOverride;
  const derived = deriveProject(specPath);
  if (derived) return derived;
  console.error(`Error: cannot determine Playwright project for "${specPath}".`);
  console.error('Spec path does not match any known project directory under tests/specs/.');
  console.error('Pass --project=<name> explicitly (options: ui, api, review).');
  process.exit(2);
}

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
  const failOnNonPass = args.includes('--fail-on-non-pass');
  const projectOverrideMatch = args.find(a => a.startsWith('--project='));
  const explicitProject = projectOverrideMatch
    ? projectOverrideMatch.slice('--project='.length)
    : null;
  const positional = args.filter(a => !a.startsWith('--'));
  const specPath = positional[0];
  const suitePath = positional[1];

  if (!specPath) {
    console.error(
      'usage: flakeDetectorCli.ts <spec-path> [<suite-path>] [--project=<name>] [--fail-on-non-pass]'
    );
    process.exit(2);
  }

  const project = resolveProject(specPath, explicitProject);

  console.log(`🔍 flake detection: ${specPath}`);
  console.log(`   project: ${project}`);
  if (suitePath) console.log(`   suite: ${suitePath}`);
  console.log('');

  const result = await detectFlake(specPath, project, suitePath);

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

  if (failOnNonPass && result.classification !== 'not_reproduced') {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌', error instanceof Error ? error.message : error);
  process.exit(2);
});
