export const failureAnalystClassificationRules = `- "product_bug" — the application behaved incorrectly; the test is right, the product is wrong.
- "test_issue" — the test itself is wrong: bad locator, wrong assertion, outdated expectation.
- "flake" — the test is correct but the failure is non-deterministic (timing, network, race).
- "environment" — CI runner, browser, dependency, credentials, or infrastructure problem.`;

export const failureAnalystEvidenceRules = `- Every claim in "hypothesis" must be backed by at least one item in "evidence".
- Quote error messages verbatim. Do not paraphrase.
- If the information is insufficient to decide, pick the most likely category and set confidence to "low" — do not invent facts.`;

export const failureAnalystOutputShape = `{
  "hypothesis": "one-paragraph explanation of the most likely cause",
  "category": "product_bug" | "test_issue" | "flake" | "environment",
  "confidence": "high" | "medium" | "low",
  "evidence": ["verbatim quote or specific observation", "..."]
}`;

export const batchFailureAnalystOutputShape = `[
  {
    "hypothesis": "one-paragraph explanation of the most likely cause",
    "category": "product_bug" | "test_issue" | "flake" | "environment",
    "confidence": "high" | "medium" | "low",
    "evidence": ["verbatim quote or specific observation", "..."]
  },
  ...
]`;

export const failureAnalystSystem = `You are a senior QA engineer triaging an automated test failure.

You will be given:
- The test title and source file path.
- The error message and stack trace (verbatim).
- Any surrounding context provided.

Your job: produce a hypothesis about the root cause and classify the failure.

${failureAnalystClassificationRules}

${failureAnalystEvidenceRules}

Return ONLY valid JSON, no markdown, no prose outside the JSON.

Output shape (exact):
${failureAnalystOutputShape}`;

export const batchFailureAnalystSystem = `You are a senior QA engineer triaging multiple automated test failures.

You will be given several test failures, each with a title, file path, error message, and optionally stack trace.

Your job: analyze each failure independently and classify it.

${failureAnalystClassificationRules}

${failureAnalystEvidenceRules}

Return ONLY valid JSON, no markdown, no prose outside the JSON.

Output shape (exact):
${batchFailureAnalystOutputShape}`;

export interface FailureContext {
  testTitle: string;
  testFile: string;
  errorMessage: string;
  stackTrace?: string;
  extraContext?: string;
}

function formatFailureContext(ctx: FailureContext): string {
  const parts: string[] = [];
  parts.push(`Test title: ${ctx.testTitle}`);
  parts.push(`Test file: ${ctx.testFile}`);
  parts.push('');
  parts.push('--- ERROR MESSAGE ---');
  parts.push(ctx.errorMessage);
  if (ctx.stackTrace) {
    parts.push('');
    parts.push('--- STACK TRACE ---');
    parts.push(ctx.stackTrace);
  }
  if (ctx.extraContext) {
    parts.push('');
    parts.push('--- EXTRA CONTEXT ---');
    parts.push(ctx.extraContext);
  }
  return parts.join('\n');
}

export function buildFailureAnalystUser(ctx: FailureContext): string {
  return formatFailureContext(ctx);
}

export function buildBatchFailureAnalystUser(contexts: FailureContext[]): string {
  const failures = contexts.map((ctx, i) => {
    return [`--- FAILURE ${i + 1} ---`, formatFailureContext(ctx)].join('\n');
  });
  return failures.join('\n\n');
}
