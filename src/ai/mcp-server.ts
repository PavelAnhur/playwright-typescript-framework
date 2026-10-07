import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { analyzeFailure } from './agents/failureAnalyst';
import { judgeTriage } from './agents/judge';
import { analyzeRequirements } from './agents/requirementsAnalyst';

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

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[ai-qa-harness] MCP server started on stdio');
}

main().catch(error => {
  console.error('[ai-qa-harness] fatal:', error);
  process.exit(1);
});
