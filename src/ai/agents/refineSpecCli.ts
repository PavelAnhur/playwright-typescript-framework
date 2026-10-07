import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { SpecGeneratorInput } from '../prompts/specGenerator.ts';
import { loadProjectContext } from '../tools/loadProjectContext';
import { refineSpec } from './refineSpec';

interface YamlAnalysis {
  risks: Array<{ id: string; description: string; severity: string }>;
  cases: Array<{ id: string; title: string; steps: string[]; expected: string }>;
}

async function main(): Promise<void> {
  const yamlFile = process.argv[2];
  const caseId = process.argv[3];
  const maxIterations = Number(process.argv[4] ?? '3');
  if (!yamlFile || !caseId) {
    console.error('usage: refineSpecCli.ts <yaml-file> <case-id> [max-iterations]');
    process.exit(1);
  }
  const raw = await readFile(yamlFile, 'utf8');
  const parsed = load(raw) as YamlAnalysis;
  const testCase = parsed.cases.find(c => c.id === caseId);
  if (!testCase) {
    console.error(`Case ${caseId} not found in ${yamlFile}`);
    process.exit(1);
  }
  const projectContext = await loadProjectContext();
  const input: SpecGeneratorInput = {
    featureName: basename(yamlFile, '.yaml'),
    caseId: testCase.id,
    caseTitle: testCase.title,
    steps: testCase.steps,
    expected: testCase.expected,
    projectContext,
  };
  console.log(`🔁 refining case ${caseId} (max ${maxIterations} iterations)\n`);
  const result = await refineSpec(input, maxIterations);
  for (const it of result.iterations) {
    const status = it.testResult.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`--- iteration ${it.attemptNumber} ---`);
    console.log(`  ${status}  (${it.testResult.durationMs}ms)`);
    if (!it.testResult.passed && it.testResult.errorMessage) {
      const firstLine = it.testResult.errorMessage.split('\n')[0];
      console.log(`  error: ${firstLine}`);
    }
  }
  console.log('');
  if (result.passed) {
    console.log(`✅ final: PASSED after ${result.iterations.length} iteration(s)`);
  } else {
    console.log(`❌ final: FAILED after ${result.iterations.length} iteration(s)`);
  }
  console.log(`📄 file: ${result.finalOutputPath}`);
  if (result.selectorValidation !== null) {
    console.log('');
    console.log('--- selector validation ---');
    for (const s of result.selectorValidation.checked) {
      const mark = s.found ? '✅' : '❌';
      const where = s.found ? s.foundIn.join(', ') : '(not found in source)';
      console.log(`  ${mark} ${s.testId}  ${where}`);
    }
    if (result.hollowPass) {
      console.log('');
      console.log('⚠️  HOLLOW PASS: test passed but uses test-id(s) not present in the app source');
    }
  }
}

main().catch(error => {
  console.error('❌', error instanceof Error ? error.message : error);
  process.exit(1);
});
