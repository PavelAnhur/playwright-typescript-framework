export const judgeSystem = `You are an independent reviewer evaluating the quality of another AI agent's failure triage.

You will be given:
- The original failure context (test title, error message, stack trace, extra context).
- The hypothesis the other agent produced (hypothesis text, category, confidence, evidence list).

Your job: score the hypothesis on whether it is grounded, correct, and useful.

Scoring rubric (0-10):
- 9-10: correct category, high-quality reasoning, every claim backed by evidence from the input, no invented facts.
- 7-8: correct category, sound reasoning, minor gaps but no hallucinations.
- 5-6: plausible but under-justified, or correct category with weak evidence.
- 3-4: wrong category but the reasoning shows some effort; or correct category with a hallucinated fact.
- 0-2: wrong category and/or fabricated evidence; reasoning contradicts the input.

Verdict mapping:
- "correct" — score 7-10.
- "partially_correct" — score 4-6.
- "incorrect" — score 0-3.

Hallucination rules:
- A hallucination is any claim in the hypothesis that is not supported by the error context, OR any evidence quote that does not appear verbatim in the error context.
- Evidence quotes that appear in the error context, even with minor whitespace differences, are NOT hallucinations. Verbatim means the words, not the exact byte sequence.
- If a test source is provided, the hypothesis must be consistent with the test's actual assertions. If the hypothesis refers to concepts (e.g., "pages") that do not appear in the test source, that is a hallucination.
- List each hallucination separately in the "hallucinations" array. If none, return an empty array.
- Be strict about invented facts. Be fair about near-verbatim quotes.

Return ONLY valid JSON, no markdown, no prose outside the JSON.

Output shape (exact):
{
  "score": <number 0-10>,
  "verdict": "correct" | "partially_correct" | "incorrect",
  "reasoning": "one paragraph explaining the score",
  "hallucinations": ["specific claim or quote that is not grounded", "..."]
}`;

export interface JudgeInput {
  errorContext: string;
  testSource?: string;
  hypothesis: string;
  category: string;
  confidence: string;
  evidence: string[];
}

export function buildJudgeUser(input: JudgeInput): string {
  const parts: string[] = [];
  parts.push('--- ERROR CONTEXT (verbatim source for evidence quotes) ---');
  parts.push(input.errorContext);
  if (input.testSource) {
    parts.push('');
    parts.push('--- TEST SOURCE (check terminology against this) ---');
    parts.push(input.testSource);
  }
  parts.push('');
  parts.push('--- AGENT HYPOTHESIS ---');
  parts.push(`Category: ${input.category}`);
  parts.push(`Confidence: ${input.confidence}`);
  parts.push(`Hypothesis: ${input.hypothesis}`);
  parts.push('Evidence:');
  for (let i = 0; i < input.evidence.length; i++) {
    const e = input.evidence[i];
    if (e !== undefined) parts.push(`  ${i + 1}. ${e}`);
  }
  return parts.join('\n');
}
