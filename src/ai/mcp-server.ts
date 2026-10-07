import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { z } from 'zod';
import { analyzeFailure } from './agents/failureAnalyst';
import { judgeTriage } from './agents/judge';
import { refineSpec } from './agents/refineSpec';
import { analyzeRequirements } from './agents/requirementsAnalyst';
import type { SpecGeneratorInput } from './prompts/specGenerator';
import { loadProjectContext } from './tools/loadProjectContext';

interface RequirementsYaml {
  risks: Array<{ id: string; description: string; severity: string }>;
  cases: Array<{ id: string; title: string; steps: string[]; expected: string }>;
}

const server = new McpServer({
  name: 'ai-qa-harness',
  version: '1.0.0',
});

server.registerTool(
  'analyze_requirements',
  {
    title: 'Analyze Requirements',
    description:
      'Analyze a requirements document and return risks + test cases. Input is the path to a markdown file.',
    inputSchema: {
      requirementPath: z.string().describe('Path to the requirements markdown file'),
    },
  },
  async ({ requirementPath }) => {
    try {
      const { analysis, outputPath } = await analyzeRequirements(requirementPath);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { risks: analysis.risks, cases: analysis.cases, outputPath },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  }
);

server.registerTool(
  'triage_failure',
  {
    title: 'Triage Test Failure',
    description:
      'Triage a test failure. Returns a hypothesis, category (product_bug|test_issue|flake|environment), confidence, and verbatim evidence.',
    inputSchema: {
      testTitle: z.string().describe('The full test title'),
      testFile: z.string().describe('Path to the test file'),
      errorMessage: z.string().describe('Verbatim error message from the test runner'),
      stackTrace: z.string().optional().describe('Optional stack trace'),
      extraContext: z.string().optional().describe('Optional extra context'),
    },
  },
  async ({ testTitle, testFile, errorMessage, stackTrace, extraContext }) => {
    try {
      const { hypothesis, outputPath } = await analyzeFailure(
        { testTitle, testFile, errorMessage, stackTrace, extraContext },
        {}
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...hypothesis, outputPath }, null, 2),
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  }
);

server.registerTool(
  'judge_triage',
  {
    title: 'Judge Triage',
    description:
      'Judge a triage verdict for hallucinations and quality. Input is the path to a triage JSON file.',
    inputSchema: {
      triagePath: z.string().describe('Path to the triage JSON file'),
      errorContextPath: z.string().optional().describe('Optional path to the error context file'),
      testSourcePath: z.string().optional().describe('Optional path to the test source file'),
    },
  },
  async ({ triagePath, errorContextPath, testSourcePath }) => {
    try {
      const { verdict, outputPath } = await judgeTriage(
        triagePath,
        errorContextPath ?? null,
        testSourcePath ?? null
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...verdict, outputPath }, null, 2),
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  }
);

server.registerTool(
  'generate_spec',
  {
    title: 'Generate Spec',
    description:
      'Generate a Playwright test for a given case ID from a requirements YAML file. Runs an iterative refinement loop (up to maxIterations) that writes the test, runs it, and asks the model to fix it if it fails, until the test passes or iterations are exhausted. Writes the final test to tests/specs/review/.',
    inputSchema: {
      requirementsYamlPath: z
        .string()
        .describe('Path to the requirements YAML file (e.g. generated-cases/checkout.yaml)'),
      caseId: z.string().describe('Case ID to implement (e.g. C2)'),
      maxIterations: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe('Maximum number of refinement iterations. Defaults to 3.'),
    },
  },
  async ({ requirementsYamlPath, caseId, maxIterations }) => {
    try {
      const raw = await readFile(requirementsYamlPath, 'utf8');
      const parsed = load(raw) as RequirementsYaml;
      const testCase = parsed.cases.find(c => c.id === caseId);
      if (!testCase) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: case ${caseId} not found in ${requirementsYamlPath}. Available: ${parsed.cases
                .map(c => c.id)
                .join(', ')}`,
            },
          ],
          isError: true,
        };
      }
      const projectContext = await loadProjectContext();
      const input: SpecGeneratorInput = {
        featureName: basename(requirementsYamlPath, '.yaml'),
        caseId: testCase.id,
        caseTitle: testCase.title,
        steps: testCase.steps,
        expected: testCase.expected,
        projectContext,
      };
      const result = await refineSpec(input, maxIterations ?? 3);
      const iterationSummary = result.iterations.map(it => ({
        attempt: it.attemptNumber,
        passed: it.testResult.passed,
        durationMs: it.testResult.durationMs,
        errorFirstLine: it.testResult.errorMessage?.split('\n')[0] ?? null,
      }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                passed: result.passed,
                hollowPass: result.hollowPass,
                selectorValidation: result.selectorValidation,
                iterations: iterationSummary,
                finalFileName: result.finalFileName,
                finalOutputPath: result.finalOutputPath,
                finalCode: result.finalCode,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[ai-qa-harness] MCP server started on stdio');
}

main().catch(error => {
  console.error('[ai-qa-harness] fatal:', error);
  process.exit(1);
});
