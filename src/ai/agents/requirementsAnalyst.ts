import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { aiConfig } from '../config';
import { callModel } from '../dshClient';
import {
  buildRequirementsAnalystUser,
  requirementsAnalystSystem,
} from '../prompts/requirementsAnalyst';
import { RequirementsAnalysisSchema, type RequirementsAnalysis } from '../schemas';

const AGENT = 'requirements-analyst';

/**
 * Strips common markdown fences and whitespace that models sometimes wrap
 * around JSON output despite instructions not to.
 */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch && fenceMatch[1] !== undefined) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function toYaml(analysis: RequirementsAnalysis): string {
  const lines: string[] = [];
  lines.push('risks:');
  for (const r of analysis.risks) {
    lines.push(`  - id: ${r.id}`);
    lines.push(`    description: ${JSON.stringify(clean(r.description))}`);
    lines.push(`    severity: ${r.severity}`);
  }
  lines.push('cases:');
  for (const c of analysis.cases) {
    lines.push(`  - id: ${c.id}`);
    lines.push(`    title: ${JSON.stringify(clean(c.title))}`);
    lines.push('    steps:');
    for (const s of c.steps) {
      lines.push(`      - ${JSON.stringify(clean(s))}`);
    }
    lines.push(`    expected: ${JSON.stringify(clean(c.expected))}`);
  }
  return lines.join('\n') + '\n';
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export async function analyzeRequirements(
  requirementFile: string
): Promise<{ analysis: RequirementsAnalysis; outputPath: string }> {
  const requirement = await readFile(requirementFile, 'utf8');
  const result = await callModel({
    agent: AGENT,
    messages: [
      { role: 'system', content: requirementsAnalystSystem },
      { role: 'user', content: buildRequirementsAnalystUser(requirement) },
    ],
    metadata: { requirementFile: basename(requirementFile) },
  });
  const cleaned = stripFences(result.content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Model returned non-JSON output: ${msg}\n\nRaw:\n${cleaned.slice(0, 500)}`);
  }
  const validated = RequirementsAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Model output failed schema validation: ${validated.error.message}\n\nRaw:\n${cleaned.slice(0, 500)}`
    );
  }
  await mkdir(aiConfig.generatedCasesDir, { recursive: true });
  const outputName = basename(requirementFile).replace(/\.md$/, '.yaml');
  const outputPath = join(aiConfig.generatedCasesDir, outputName);
  await writeFile(outputPath, toYaml(validated.data), 'utf8');
  return { analysis: validated.data, outputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target =
    process.argv[2] ?? join(aiConfig.requirementsDir, 'checkout.md');
  analyzeRequirements(target)
    .then(({ analysis, outputPath }) => {
      console.log(`✅ risks: ${analysis.risks.length}, cases: ${analysis.cases.length}`);
      console.log(`📄 written: ${outputPath}`);
    })
    .catch((error) => {
      console.error('❌', error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
